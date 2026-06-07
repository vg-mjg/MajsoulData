const audioSourceCache = new Map();
const directAudioProbeCache = new Map();

// Kept for API compatibility; candidates are already resolved per UI language.
export function setAudioLoaderLanguage() {}

function probeDirectAudioSource(url) {
  if (directAudioProbeCache.has(url)) {
    return directAudioProbeCache.get(url);
  }

  const promise = new Promise((resolve) => {
    const audio = document.createElement("audio");
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.oncanplaythrough = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      try {
        audio.load();
      } catch {
        // ignore cleanup failures
      }
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      cleanup();
      resolve(url);
    };
    audio.oncanplaythrough = () => {
      cleanup();
      resolve(url);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = url;
    try {
      audio.load();
    } catch {
      cleanup();
      resolve(null);
    }
  });

  directAudioProbeCache.set(url, promise);
  return promise;
}

async function resolveCandidateAudioSource(candidates) {
  for (const candidate of candidates) {
    const url = candidate && candidate.url;
    if (!url) continue;
    try {
      const source = await probeDirectAudioSource(url);
      if (source) return source;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export async function loadAudioSource(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const key = list.map((candidate) => candidate && candidate.url).filter(Boolean).join("|");
  if (!key) return null;

  if (!audioSourceCache.has(key)) {
    audioSourceCache.set(key, resolveCandidateAudioSource(list).catch(() => null));
  }
  return audioSourceCache.get(key);
}

export function clearAudioSourceCache() {
  audioSourceCache.clear();
  directAudioProbeCache.clear();
}
