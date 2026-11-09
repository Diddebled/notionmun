import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import JSZip from "jszip";

const root = fileURLToPath(new URL("../", import.meta.url));
const metadata = JSON.parse(await readFile(resolve(root, "src/data/flagSources.json"), "utf8"));
const response = await fetch(`https://codeload.github.com/Yummygum/flagpack-core/zip/${metadata.revision}`);
if (!response.ok) throw new Error(`Flagpack download failed: ${response.status}`);
const archive = await JSZip.loadAsync(Buffer.from(await response.arrayBuffer()));
const prefix = `flagpack-core-${metadata.revision}/`;
const license = await archive.file(`${prefix}LICENSE`)?.async("string");
if (!license?.includes(metadata.copyright) || !license.startsWith("MIT License")) throw new Error("Unexpected upstream license; review before syncing.");

const assets = [];
const pendingWrites = [];
for (const name of (await readdir(resolve(root, "src/assets/flags"))).filter((name) => name.endsWith(".svg")).sort()) {
  const code = name.slice(0, -4);
  if (!/^[A-Z]{3}$|^GB-SCT$/.test(code)) throw new Error(`Unexpected local flag name: ${name}`);
  const historical = metadata.historicalIllustrations.includes(code);
  const sourcePath = `lib/flags/l/${metadata.upstreamFiles?.[code] || name}`;
  const data = historical
    ? await readFile(resolve(root, "src/assets/flags", name))
    : await archive.file(`${prefix}${sourcePath}`)?.async("nodebuffer");
  if (!data) throw new Error(`No verified upstream flag for ${code}; do not invent a substitute.`);
  if (!historical) pendingWrites.push({ name, data });
  assets.push({
    code,
    kind: historical ? "historical-illustration" : "flagpack",
    license: historical ? "CPAL-1.0" : "MIT",
    sourceUrl: historical ? "https://github.com/Paul2556/Motion" : `https://github.com/Yummygum/flagpack-core/blob/${metadata.revision}/${sourcePath}`,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
for (const { name, data } of pendingWrites) await writeFile(resolve(root, "src/assets/flags", name), data);
await mkdir(resolve(root, "public/licenses"), { recursive: true });
await writeFile(resolve(root, "public/licenses/flagpack-MIT.txt"), license);
await writeFile(resolve(root, "licenses/flags-manifest.json"), JSON.stringify({ revision: metadata.revision, verifiedOn: metadata.verifiedOn, assets }, null, 2) + "\n");
console.log(`Synced ${assets.filter((asset) => asset.kind === "flagpack").length} upstream flags; retained ${assets.filter((asset) => asset.kind === "historical-illustration").length} separately documented historical illustrations.`);
