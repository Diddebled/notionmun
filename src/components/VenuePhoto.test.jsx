import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import photographs from "../data/photographs.json";
import { getVenuePhoto } from "../utils/venuePhoto";
import VenuePhoto from "./VenuePhoto";
import PhotoCredits from "./PhotoCredits";

describe("licensed venue photographs", () => {
  it("selects the relevant reference venue without claiming a session photo", () => {
    expect(getVenuePhoto("United Nations Security Council").id).toBe("security-council");
    expect(getVenuePhoto("UNSC").id).toBe("security-council");
    expect(getVenuePhoto("SOCHUM").id).toBe("general-assembly");
    expect(getVenuePhoto().id).toBe("general-assembly");
  });

  it("links visible credit to the original material and its license", () => {
    const html = renderToStaticMarkup(<MemoryRouter><VenuePhoto committeeLabel="UNSC" /></MemoryRouter>);
    const photo = getVenuePhoto("UNSC");
    expect(html).toContain("Reference venue");
    expect(html).toContain(photo.author);
    expect(html).toContain(`href="${photo.sourceUrl}"`);
    expect(html).toContain(`href="${photo.licenseUrl}"`);
    expect(html).toContain('src="/images/un-security-council.jpg"');
    expect(html).toContain("CC BY 4.0");
  });

  it("documents image-specific licensing, changes and independent use", () => {
    const html = renderToStaticMarkup(<MemoryRouter><PhotoCredits /></MemoryRouter>);
    for (const photo of photographs) {
      expect(html).toContain(photo.author);
      expect(html).toContain(photo.changes);
      expect(photo.sourceRevisionUrl).toContain("oldid=");
      expect(photo.licenseUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
    }
    expect(html).toContain("not affiliated with or endorsed");
    expect(html).toContain("separate from the software");
  });

  it.each(photographs)("ships the real JPEG and provenance for $id", async (photo) => {
    const bytes = await readFile(new URL(`../../public${photo.src}`, import.meta.url));
    expect([...bytes.subarray(0, 2)]).toEqual([255, 216]);
    expect(bytes.length).toBeGreaterThan(10000);
    expect(bytes.length).toBeLessThan(800000);
    expect(photo.alt.length).toBeGreaterThan(30);
    expect(photo.verifiedOn).toBe("2026-10-30");
  });
});
