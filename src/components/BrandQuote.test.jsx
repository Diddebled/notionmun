import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BRAND } from "../brand";
import BrandQuote from "./BrandQuote";

describe("brand quote and tagline", () => {
  it("preserves the supplied quote, attribution and displayed date", () => {
    const markup = renderToStaticMarkup(<BrandQuote />);
    expect(markup).toContain('<blockquote>&quot;I love notionMUN&quot;</blockquote>');
    expect(markup).toContain("- Paul Taechaaukarakul");
    expect(markup).toContain('<time dateTime="2026-11-04">11/4/2026</time>');
  });

  it("uses the requested shared tagline", () => {
    expect(BRAND.tagline).toBe("From Motion To Notion");
  });
});
