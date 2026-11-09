export function publicAsset(path) {
  return `${import.meta.env.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
}

export function appUrl(path = "/") {
  const route = path.startsWith("/") ? path : `/${path}`;
  const relative = import.meta.env.VITE_ROUTER_MODE === "hash"
    ? `${publicAsset("")}#${route}`
    : publicAsset(route);
  return `${window.location.origin}${relative}`;
}

export function loginFragment(hash = window.location.hash) {
  if (import.meta.env.VITE_ROUTER_MODE !== "hash") {
    return { params: hash.slice(1), route: "" };
  }
  const separator = hash.indexOf("#", 1);
  return separator === -1
    ? { params: "", route: hash }
    : { params: hash.slice(separator + 1), route: hash.slice(0, separator) };
}
