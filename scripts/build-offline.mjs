import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";

const dist = resolve("dist");
const base = process.env.VITE_BASE_PATH || "/";
if (!base.startsWith("/") || !base.endsWith("/")) throw new Error("The offline scope must be an absolute path ending in /.");
const files = [];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (!["sw.js", "manifest.webmanifest"].includes(entry.name)) files.push(relative(dist, path).replaceAll("\\", "/"));
  }
}
await collect(dist); files.sort();
const hash = createHash("sha256");
for (const file of files) { hash.update(file); hash.update(await readFile(resolve(dist, file))); }
const version = hash.digest("hex").slice(0, 16);
const cachePrefix = `notionmun-static-${createHash("sha256").update(base).digest("hex").slice(0, 8)}-`;
await writeFile(resolve(dist, "manifest.webmanifest"), JSON.stringify({ id: base, name: "NotionMUN Committee Workspace", short_name: "NotionMUN", description: "Conference, debate and resolution tools that work offline.", start_url: base, scope: base, display: "standalone", background_color: "#f7f9f8", theme_color: "#176b54", icons: [{ src: `${base}notionmun.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }] }, null, 2));
const urls = files.map((file) => base + file).concat(base + "manifest.webmanifest");
await writeFile(resolve(dist, "sw.js"), `const CACHE = ${JSON.stringify(`${cachePrefix}${version}`)};
const CACHE_PREFIX = ${JSON.stringify(cachePrefix)};
const SCOPE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE) || url.pathname.includes('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match(SCOPE + 'index.html')))); return;
  }
  if (!FILES.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request, {ignoreSearch:true,ignoreVary:true})) || fetch(request)));
});
`);
console.log(`Prepared offline support for ${files.length} files (${version}).`);
