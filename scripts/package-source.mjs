import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT = "notionmun-source.zip";
const DIRECTORIES = ["src", "public", "scripts", "licenses", "legacy", "tests"];
const FILES = ["LICENSE", "README.md", "MODIFICATIONS.md", "package.json", "package-lock.json", "index.html", "vite.config.js", "postcss.config.js", "vercel.json", "main.py", "test_server.py", "firebase.json", "firestore.rules"];
const OPTIONAL_FILES = [".gitignore", ".vercelignore", ".github/workflows/deploy.yml"];

function safeToInclude(name) {
  return name !== OUTPUT && !name.startsWith(".env") && !name.endsWith(".log") && !name.endsWith(".pyc");
}

export async function buildSourceArchive() {
  const archive = new JSZip();
  const source = archive.folder("notionmun-source");

  async function addFile(path) {
    const name = relative(ROOT, path).replaceAll("\\", "/");
    source.file(name, await readFile(path), { date: new Date("2026-10-30T00:00:00Z") });
  }

  async function addDirectory(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!safeToInclude(entry.name) || entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await addDirectory(path);
      else if (entry.isFile()) await addFile(path);
    }
  }

  // Only source and build inputs are public; never walk the workspace root.
  for (const file of FILES) await addFile(resolve(ROOT, file));
  for (const file of OPTIONAL_FILES) {
    try { await addFile(resolve(ROOT, file)); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const directory of DIRECTORIES) await addDirectory(resolve(ROOT, directory));
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = await buildSourceArchive();
  await writeFile(resolve(ROOT, "public", OUTPUT), data);
  console.log(`Packaged public source (${Math.round(data.length / 1024)} KB); secrets and runtime files excluded.`);
}
