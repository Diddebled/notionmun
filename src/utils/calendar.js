const escape = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r/g, "");
const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function scheduleToCalendar(items, at = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NotionMUN//Committee agenda//EN", "CALSCALE:GREGORIAN"];
  for (const item of items) {
    if (!item.start || !Number.isFinite(Date.parse(item.start))) continue;
    lines.push("BEGIN:VEVENT", `UID:${escape(item.id)}@notionmun`, `DTSTAMP:${stamp(at)}`, `DTSTART:${stamp(item.start)}`);
    if (item.end && Number.isFinite(Date.parse(item.end))) lines.push(`DTEND:${stamp(item.end)}`);
    lines.push(`SUMMARY:${escape(item.title)}`, `DESCRIPTION:${escape(item.body)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // RFC 5545 folds long UTF-8 lines at a safe character boundary.
  return lines.map((line) => {
    const parts = []; let current = ""; let bytes = 0;
    for (const char of line) { const size = new TextEncoder().encode(char).length; if (bytes + size > 73) { parts.push(current); current = " "; bytes = 1; } current += char; bytes += size; }
    parts.push(current); return parts.join("\r\n");
  }).join("\r\n") + "\r\n";
}
