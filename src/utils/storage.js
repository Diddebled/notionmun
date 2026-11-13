// Any storage access can throw (Safari with cookies blocked, private mode,
// quota, sandboxed frames), so every read and write goes through here and a
// failure just means "nothing stored" instead of a white screen.
function notifyStorage(key) {
  try { window.dispatchEvent(new CustomEvent("notionmun:storage", { detail: { key } })); } catch { /* non-browser */ }
}

function storageArea(getStorage) {
  const area = {
    get(key) {
      try {
        return getStorage().getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        getStorage().setItem(key, value);
        notifyStorage(key);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        getStorage().removeItem(key);
        notifyStorage(key);
      } catch {
        // unavailable - nothing to remove
      }
    },
    // A corrupt or unparseable value reads as missing, same as no value.
    getJSON(key) {
      const raw = area.get(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    setJSON(key, value) {
      return area.set(key, JSON.stringify(value));
    },
  };
  return area;
}

export const local = storageArea(() => globalThis.localStorage);
export const session = storageArea(() => globalThis.sessionStorage);

// Keep committee work after a tab closes; authentication stays session-only.
export const dais = storageArea(() => ({
  getItem: (key) => session.get(`_notionmun-newer-session:${key}`) === "1" ? session.get(key) ?? local.get(key) : local.get(key) ?? session.get(key),
  setItem: (key, value) => {
    const saved = session.set(key, value);
    if (!local.set(key, value)) {
      if (!saved) throw new Error("Storage unavailable");
      session.set(`_notionmun-newer-session:${key}`, "1");
      local.remove(key);
      try { window.dispatchEvent(new CustomEvent("notionmun:temporary-storage")); } catch { /* non-browser */ }
    } else session.remove(`_notionmun-newer-session:${key}`);
  },
  removeItem: (key) => { session.remove(key); local.remove(key); session.remove(`_notionmun-newer-session:${key}`); },
}));
