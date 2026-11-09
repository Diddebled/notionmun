import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import sources from "../data/flagSources.json";
import manifest from "../../licenses/flags-manifest.json";
import Flag from "./Flag";
import FlagCredits from "./FlagCredits";

describe("licensed flag artwork", () => {
  it("records every shipped flag and separates historical illustrations", async () => {
    const files = (await readdir(new URL("../assets/flags/", import.meta.url))).filter((name) => name.endsWith(".svg"));
    expect(manifest.assets.map((asset) => `${asset.code}.svg`).sort()).toEqual(files.sort());
    expect(manifest.assets.filter((asset) => asset.kind === "flagpack")).toHaveLength(249);
    expect(manifest.assets.filter((asset) => asset.kind === "historical-illustration")).toHaveLength(5);
    expect(manifest.revision).toBe(sources.revision);
    expect(manifest.assets.find((asset) => asset.code === "MCO").sourceUrl).toMatch(/\/MC\.svg$/);
  });

  it("matches the checked-in provenance hashes for all flag images", async () => {
    for (const asset of manifest.assets) {
      const data = await readFile(new URL(`../assets/flags/${asset.code}.svg`, import.meta.url));
      expect(createHash("sha256").update(data).digest("hex")).toBe(asset.sha256);
      if (asset.kind === "flagpack") {
        expect(asset.license).toBe("MIT");
        expect(asset.sourceUrl).toContain(sources.revision);
      } else expect(asset.license).toBe("CPAL-1.0");
    }
  });

  it("keeps flag attribution and historical status discoverable", () => {
    expect(renderToStaticMarkup(<Flag countryCode="USA" />)).toContain('data-flag-source="flagpack"');
    expect(renderToStaticMarkup(<Flag countryCode="USA" />)).toContain("Yummygum (MIT)");
    expect(renderToStaticMarkup(<Flag countryCode="USA" />)).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<Flag countryCode="ROE" />)).toContain('data-flag-source="motion-historical"');
    expect(renderToStaticMarkup(<Flag countryCode="ROE" />)).toContain("not a verified official flag");
    expect(renderToStaticMarkup(<Flag countryCode="UNKNOWN" />)).toBe("");
  });

  it("preserves the upstream MIT copyright and permission notice", async () => {
    const license = await readFile(new URL("../../public/licenses/flagpack-MIT.txt", import.meta.url), "utf8");
    expect(license).toContain(sources.copyright);
    expect(license).toContain("Permission is hereby granted, free of charge");
    expect(license).toContain("THE SOFTWARE IS PROVIDED");
  });

  it("publishes source, creator and license links without mixing licenses", () => {
    const html = renderToStaticMarkup(<MemoryRouter><FlagCredits /></MemoryRouter>);
    expect(html).toContain("Flag artwork credits");
    expect(html).toContain(sources.copyright);
    expect(html).toContain(`href="${sources.localLicenseUrl}"`);
    expect(html).toContain(`href="${sources.sourceUrl}"`);
    expect(html).toContain("They are not Flagpack assets");
  });
});
