import { afterEach, describe, expect, it, vi } from "vitest";
import { dais, local, session } from "./storage";
import { memoryStorage } from "../testUtils/memoryStorage";

function throwingStorage() {
  const fail = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  return { getItem: fail, setItem: fail, removeItem: fail, key: fail, get length() { return fail(); } };
}

afterEach(() => vi.unstubAllGlobals());

describe("storage", () => {
  it("reads back what it wrote", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    expect(local.set("theme", "dark")).toBe(true);
    expect(local.get("theme")).toBe("dark");
    local.remove("theme");
    expect(local.get("theme")).toBe(null);
  });

  it("acts as empty when the browser blocks storage", () => {
    vi.stubGlobal("localStorage", throwingStorage());
    expect(local.get("theme")).toBe(null);
    expect(local.set("theme", "dark")).toBe(false);
    expect(() => local.remove("theme")).not.toThrow();
  });

  it("acts as empty when storage doesn't exist at all", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(session.get("x")).toBe(null);
    expect(session.set("x", "1")).toBe(false);
  });

  it("parses stored JSON, and treats a corrupt value as missing", () => {
    vi.stubGlobal("sessionStorage", memoryStorage());
    session.setJSON("vote", { seats: 3 });
    expect(session.getJSON("vote")).toEqual({ seats: 3 });
    sessionStorage.setItem("vote", "{not json");
    expect(session.getJSON("vote")).toBe(null);
    expect(session.getJSON("missing")).toBe(null);
  });
  it("prefers durable values across tabs, but retains newer temporary values if the durable write fails", () => {
    const durable = memoryStorage(); const temporary = memoryStorage();
    vi.stubGlobal("localStorage", durable); vi.stubGlobal("sessionStorage", temporary);
    durable.setItem("queue", "new in another tab"); temporary.setItem("queue", "older"); expect(dais.get("queue")).toBe("new in another tab");
    vi.spyOn(durable, "setItem").mockImplementation(() => { throw new Error("Full"); });
    expect(dais.set("queue", "latest in this tab")).toBe(true); expect(dais.get("queue")).toBe("latest in this tab"); expect(session.get("_notionmun-newer-session:queue")).toBe("1");
    vi.restoreAllMocks(); dais.set("queue", "durable again"); expect(session.get("_notionmun-newer-session:queue")).toBeNull(); expect(durable.getItem("queue")).toBe("durable again");
  });
});
