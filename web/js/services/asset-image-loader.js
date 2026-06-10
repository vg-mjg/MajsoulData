const imageSourceCache = new Map();
const directImageProbeCache = new Map();

function probeDirectImageSource(url) {
  if (directImageProbeCache.has(url)) {
    return directImageProbeCache.get(url);
  }

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(url);
    image.onerror = () => resolve(null);
    image.src = url;
  });

  directImageProbeCache.set(url, promise);
  return promise;
}

async function resolveCandidateImageSource(candidates) {
  for (const candidate of candidates) {
    const url = candidate && candidate.url;
    if (!url) continue;
    try {
      const source = await probeDirectImageSource(url);
      if (source) return source;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export async function loadCharacterImageSource(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const key = list.map((candidate) => candidate && candidate.url).filter(Boolean).join("|");
  if (!key) return null;

  if (!imageSourceCache.has(key)) {
    imageSourceCache.set(key, resolveCandidateImageSource(list).catch(() => null));
  }
  return imageSourceCache.get(key);
}

export function clearImageSourceCache() {
  imageSourceCache.clear();
  directImageProbeCache.clear();
}
