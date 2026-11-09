import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildSourceArchive } from "../scripts/package-source.mjs";
import { BRAND } from "../src/brand";

describe("public deployment", () => {
  it("uses the requested name and Vite SPA configuration", async () => {
    expect(BRAND.name).toBe("NotionMUN.com");
    const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
    expect(config.framework).toBe("vite");
    expect(config.outputDirectory).toBe("dist");
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });

  it("offers reproducible source without credentials, logs or recursive archives", async () => {
    const archive = await JSZip.loadAsync(await buildSourceArchive());
    const files = Object.keys(archive.files).filter((name) => !archive.files[name].dir);
    for (const name of ["LICENSE", "MODIFICATIONS.md", "package.json", "package-lock.json", "scripts/package-source.mjs", "src/App.jsx", "src/brand.js", "main.py", "licenses/IMAGE_CREDITS.md", "src/data/photographs.json", "public/images/un-security-council.jpg", "public/images/un-general-assembly.jpg", "licenses/FLAG_CREDITS.md", "licenses/flags-manifest.json", "public/licenses/flagpack-MIT.txt", "src/data/flagSources.json"]) {
      expect(files).toContain(`notionmun-source/${name}`);
    }
    expect(files.some((name) => /(^|\/)(\.env[^/]*|\.vercel|\.git|node_modules|auth\.json|test-results)(\/|$)|\.log$|notionmun-source\.zip$/.test(name))).toBe(false);
    const packageJson = JSON.parse(await archive.file("notionmun-source/package.json").async("string"));
    expect(packageJson.scripts.build).toContain("scripts/package-source.mjs");
  });
});
