const jsonCache = new Map();

function cacheKeyOf(path) {
  if (path instanceof URL) {
    return path.toString();
  }
  return String(path || "");
}

export async function fetchJson(path, options = {}) {
  const cacheMode = String(options.cache || "no-store");
  const useMemo = options.memo !== false;
  const key = cacheKeyOf(path);

  if (useMemo && jsonCache.has(key)) {
    return jsonCache.get(key);
  }

  const request = (async () => {
    const response = await fetch(path, { cache: cacheMode });
    if (!response.ok) {
      throw new Error(`failed to load ${path}: ${response.status}`);
    }
    return response.json();
  })();

  const promise = request.catch((error) => {
    if (useMemo && jsonCache.get(key) === promise) {
      jsonCache.delete(key);
    }
    throw error;
  });

  if (useMemo) {
    jsonCache.set(key, promise);
  }

  return promise;
}

export function clearFetchJsonCache() {
  jsonCache.clear();
}
