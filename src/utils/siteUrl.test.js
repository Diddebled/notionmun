import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl, loginFragment, publicAsset } from "./siteUrl";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deployment URLs", () => {
  it("preserves assets and links on root-hosted sites", () => {
    vi.stubEnv("BASE_URL", "/");
    vi.stubEnv("VITE_ROUTER_MODE", "browser");
    vi.stubGlobal("window", { location: { origin: "https://notionmun.pages.dev" } });
    expect(publicAsset("/images/venue.jpg")).toBe("/images/venue.jpg");
    expect(appUrl("/s/meeting")).toBe("https://notionmun.pages.dev/s/meeting");
  });

  it("keeps GitHub Pages assets inside the repository path", () => {
    vi.stubEnv("BASE_URL", "/notionmun/");
    expect(publicAsset("/images/venue.jpg")).toBe("/notionmun/images/venue.jpg");
    expect(publicAsset("/notionmun-source.zip")).toBe("/notionmun/notionmun-source.zip");
  });

  it("makes reloadable session links for GitHub Pages", () => {
    vi.stubEnv("BASE_URL", "/notionmun/");
    vi.stubEnv("VITE_ROUTER_MODE", "hash");
    vi.stubGlobal("window", { location: { origin: "https://diddebled.github.io" } });
    expect(appUrl("/s/meeting")).toBe("https://diddebled.github.io/notionmun/#/s/meeting");
  });

  it("retains the route when consuming a private quick-login fragment", () => {
    vi.stubEnv("VITE_ROUTER_MODE", "hash");
    expect(loginFragment("#/cloud#qrEmail=example&qrPass=secret")).toEqual({
      params: "qrEmail=example&qrPass=secret", route: "#/cloud",
    });
    expect(loginFragment("#/cloud")).toEqual({ params: "", route: "#/cloud" });
  });

  it("continues to read existing quick-login fragments", () => {
    vi.stubEnv("VITE_ROUTER_MODE", "browser");
    expect(loginFragment("#qrEmail=example&qrPass=secret")).toEqual({
      params: "qrEmail=example&qrPass=secret", route: "",
    });
  });
});
