function normalizeRoute(hash, fallbackRoute) {
  const rawHash = String(hash || "").trim();
  const cleaned = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  const pathname = cleaned.startsWith("/") ? cleaned.slice(1) : cleaned;
  const [pathWithoutQuery = ""] = pathname.split("?");
  const segments = pathWithoutQuery.split("/").map((segment) => segment.trim()).filter(Boolean);

  if (segments.length === 0) {
    return {
      route: fallbackRoute,
      segments: [fallbackRoute],
      params: {},
      hash: rawHash,
    };
  }

  return {
    route: String(segments[0] || fallbackRoute).toLowerCase(),
    segments,
    params: {
      id: segments.length > 1 ? segments[1] : undefined,
    },
    hash: rawHash,
  };
}

export function createHashRouter({ defaultRoute, onRouteChange }) {
  function emitRoute() {
    const routeState = normalizeRoute(window.location.hash, defaultRoute);
    onRouteChange(routeState);
  }

  function start() {
    if (!window.location.hash) {
      window.location.hash = `#/${defaultRoute}`;
    }
    emitRoute();
    window.addEventListener("hashchange", emitRoute);
  }

  return {
    start,
    go(path) {
      const normalizedPath = String(path || defaultRoute).replace(/^#?\/?/, "");
      window.location.hash = `#/${normalizedPath}`;
    },
  };
}
