import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import Attribution from "./Attribution";

describe("global attribution", () => {
  const render = () => renderToStaticMarkup(<MemoryRouter><Attribution /></MemoryRouter>);

  it("links the exact requested credit to GitHub", () => {
    expect(render()).toContain('href="https://github.com" target="_blank" rel="noopener noreferrer">Powered by Motion \u00a9 2026 Paul Taechaaukarakul</a>');
  });

  it("retains the checked-in license references and copyright notice", () => {
    const markup = render();
    expect(markup).toContain('href="https://motionmun.com/licensing"');
    expect(markup).toContain("Copyright (c) 2026 Paul Taechaaukarakul, developer of Motion. All Rights Reserved.");
    expect(markup).toContain('href="/licensing"');
    expect(markup).toContain("CPAL-1.0");
  });
});
