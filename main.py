from __future__ import annotations

import csv
import json
import logging
import mimetypes
import re
import sys
import zipfile
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO, StringIO
from pathlib import Path
from typing import Iterable
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent
MAX_UPLOAD_BYTES = 4 * 1024 * 1024


def _json_response(handler: SimpleHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _column_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref.upper())
    if not letters:
        return 0
    index = 0
    for char in letters.group(1):
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index - 1


def _text_from_rich_text(node: ET.Element) -> str:
    parts = []
    for text_node in node.iter():
        if text_node.tag.endswith("}t") or text_node.tag == "t":
            parts.append(text_node.text or "")
    return "".join(parts)


def _xlsx_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        raw = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(raw)
    strings = []
    for item in root:
        if item.tag.endswith("}si") or item.tag == "si":
            strings.append(_text_from_rich_text(item))
    return strings


def _xlsx_sheet_path(zf: zipfile.ZipFile) -> str:
    if "xl/worksheets/sheet1.xml" in zf.namelist():
        return "xl/worksheets/sheet1.xml"
    sheets = [name for name in zf.namelist() if name.startswith("xl/worksheets/") and name.endswith(".xml")]
    if not sheets:
        raise ValueError("No worksheet found in the workbook.")
    return sorted(sheets)[0]


def _xlsx_rows(file_bytes: bytes) -> list[list[str]]:
    with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
        shared_strings = _xlsx_shared_strings(zf)
        sheet_xml = ET.fromstring(zf.read(_xlsx_sheet_path(zf)))
        rows: list[list[str]] = []
        for row in sheet_xml.iter():
            if not (row.tag.endswith("}row") or row.tag == "row"):
                continue
            cells: list[str] = []
            for cell in row:
                if not (cell.tag.endswith("}c") or cell.tag == "c"):
                    continue
                ref = cell.attrib.get("r", "")
                index = _column_index(ref)
                while len(cells) <= index:
                    cells.append("")
                cell_type = cell.attrib.get("t")
                value = ""
                if cell_type == "inlineStr":
                    value = _text_from_rich_text(cell)
                else:
                    value_node = next((child for child in cell if child.tag.endswith("}v") or child.tag == "v"), None)
                    raw_value = value_node.text if value_node is not None else ""
                    if cell_type == "s" and raw_value:
                        try:
                            value = shared_strings[int(raw_value)]
                        except (ValueError, IndexError):
                            value = raw_value
                    else:
                        value = raw_value or ""
                cells[index] = value.strip()
            if any(cells):
                rows.append(cells)
        return rows


def _csv_rows(file_bytes: bytes) -> list[list[str]]:
    text = file_bytes.decode("utf-8-sig", errors="replace")
    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample)
    except csv.Error:
        dialect = csv.excel
    return [[cell.strip() for cell in row] for row in csv.reader(StringIO(text), dialect) if any(cell.strip() for cell in row)]


def _normalise_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", header.lower())


def _pick(row: list[str], indexes: Iterable[int]) -> str:
    for index in indexes:
        if 0 <= index < len(row) and row[index].strip():
            return row[index].strip()
    return ""


def _delegates_from_rows(rows: list[list[str]]) -> list[dict]:
    if not rows:
        return []
    headers = [_normalise_header(value) for value in rows[0]]
    has_header = any(name in headers for name in ("country", "delegation", "state", "delegate", "name", "status"))
    data_rows = rows[1:] if has_header else rows

    def indices(*names: str, fallback: int) -> list[int]:
        found = [idx for idx, header in enumerate(headers) if header in names]
        return found or [fallback]

    country_indexes = indices("country", "delegation", "state", "memberstate", fallback=0)
    name_indexes = indices("delegate", "delegatename", "name", "representative", fallback=1)
    status_indexes = indices("status", "voting", "votingstatus", "vote", fallback=2)

    delegates = []
    for row in data_rows:
        country = _pick(row, country_indexes)
        if not country:
            continue
        name = _pick(row, name_indexes)
        status = _pick(row, status_indexes) or "Voting"
        delegates.append(
            {
                "country": country,
                "name": name or "Unassigned delegate",
                "status": "Observer" if status.lower().startswith("obs") else "Voting",
            }
        )
    return delegates


def parse_roster(file_name: str, file_bytes: bytes) -> list[dict]:
    suffix = Path(file_name).suffix.lower()
    if suffix == ".xlsx":
        rows = _xlsx_rows(file_bytes)
    elif suffix in {".csv", ".tsv", ".txt"}:
        rows = _csv_rows(file_bytes)
    else:
        raise ValueError("Use a .xlsx, .csv, or .tsv roster.")
    delegates = _delegates_from_rows(rows)
    if not delegates:
        raise ValueError("No delegates were found. Include at least a country or delegation column.")
    return delegates


def _read_multipart_upload(handler: SimpleHTTPRequestHandler) -> tuple[str, bytes]:
    content_length = int(handler.headers.get("Content-Length", "0"))
    if content_length <= 0:
        raise ValueError("No file was uploaded.")
    if content_length > MAX_UPLOAD_BYTES:
        raise ValueError("Roster files are limited to 4 MB.")

    content_type = handler.headers.get("Content-Type", "")
    boundary_match = re.search(r"boundary=(?P<boundary>[^;]+)", content_type)
    if not boundary_match:
        raise ValueError("The upload must be multipart form data.")

    boundary = boundary_match.group("boundary").strip('"').encode("utf-8")
    body = handler.rfile.read(content_length)
    marker = b"--" + boundary
    for part in body.split(marker):
        if b"Content-Disposition:" not in part or b"filename=" not in part:
            continue
        header_blob, _, data = part.partition(b"\r\n\r\n")
        disposition = header_blob.decode("utf-8", errors="replace")
        name_match = re.search(r'filename="(?P<name>[^"]+)"', disposition)
        file_name = name_match.group("name") if name_match else "roster.xlsx"
        data = data.rsplit(b"\r\n", 1)[0]
        if data.endswith(b"--"):
            data = data[:-2]
        return escape(Path(file_name).name), data
    raise ValueError("No file field was found in the upload.")


class MotionHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, format: str, *args) -> None:
        logging.getLogger("motion").info("%s - %s", self.address_string(), format % args)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/import-roster":
            _json_response(self, 404, {"error": "Unknown endpoint."})
            return
        try:
            file_name, file_bytes = _read_multipart_upload(self)
            delegates = parse_roster(file_name, file_bytes)
        except (ValueError, zipfile.BadZipFile, ET.ParseError) as exc:
            _json_response(self, 400, {"error": str(exc)})
            return
        _json_response(self, 200, {"delegates": delegates, "file": file_name})

    def translate_path(self, path: str) -> str:
        parsed = unquote(urlparse(path).path)
        legacy = parsed.startswith("/legacy/")
        base = ROOT / ("legacy" if legacy else "dist")
        relative = parsed[len("/legacy/"):] if legacy else parsed.lstrip("/")
        target = (base / relative).resolve()
        if not target.is_relative_to(base.resolve()) or any(part.startswith(".") for part in Path(relative).parts):
            return str(ROOT / "__not_found__")
        if target.is_file():
            return str(target)
        if base == ROOT / "dist" and not Path(parsed).suffix:
            return str(base / "index.html")
        if legacy and not relative:
            return str(base / "index.html")
        return str(ROOT / "__not_found__")

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def guess_type(self, path: str) -> str:
        if path.endswith(".js"):
            return "text/javascript"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"


def run(port: int = 8001) -> None:
    if not (ROOT / "dist" / "index.html").is_file():
        raise SystemExit("Build the app first with: npm install && npm run build")
    logging.basicConfig(filename=ROOT / "server.log", level=logging.INFO,
                        format="%(asctime)s %(message)s", encoding="utf-8")
    ThreadingHTTPServer.request_queue_size = 128
    server = ThreadingHTTPServer(("127.0.0.1", port), MotionHandler)
    print(f"NotionMUN is running at http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nNotionMUN stopped.")


if __name__ == "__main__":
    selected_port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    run(selected_port)
