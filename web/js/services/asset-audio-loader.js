import { assetUrlCandidates, decryptBytes, isEncryptedUrl } from "../../utils.js";

const audioSourceCache = new Map();
const createdObjectUrls = new Set();
const directAudioProbeCache = new Map();

function mimeTypeFromPath(path) {
  const normalized = String(path || "").toLowerCase();
  if (normalized.endsWith(".mp3")) return "audio/mpeg";
  if (normalized.endsWith(".ogg")) return "audio/ogg";
  if (normalized.endsWith(".wav")) return "audio/wav";
  if (normalized.endsWith(".m4a")) return "audio/mp4";
  return "audio/mpeg";
}

async function fetchAudioSource(url, path) {
  const response = await fetch(url, { cache: "force-cache", mode: "cors" });
  if (!response.ok) {
    return null;
  }

  const rawBytes = new Uint8Array(await response.arrayBuffer());
  const bytes = isEncryptedUrl(url) ? decryptBytes(rawBytes) : rawBytes;
  const responseType = response.headers.get("content-type");
  const contentType = responseType && responseType.includes("/") ? responseType : mimeTypeFromPath(path);
  const blob = new Blob([bytes], { type: contentType });
  const source = URL.createObjectURL(blob);
  createdObjectUrls.add(source);
  return source;
}

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

async function resolveCandidateAudioSource(path, prefix) {
  for (const url of assetUrlCandidates(path, prefix)) {
    const encrypted = isEncryptedUrl(url);

    try {
      const source = encrypted
        ? await fetchAudioSource(url, path)
        : await probeDirectAudioSource(url);
      if (source) {
        return source;
      }
    } catch {
      // Try next candidate URL.
    }
  }

  return null;
}

export async function loadAudioSource(audioCandidates) {
  for (const candidate of audioCandidates || []) {
    const key = `${candidate.prefix}|${candidate.path}`;

    if (!audioSourceCache.has(key)) {
      const promise = resolveCandidateAudioSource(candidate.path, candidate.prefix).catch(() => null);
      audioSourceCache.set(key, promise);
    }

    const source = await audioSourceCache.get(key);
    if (source) {
      return source;
    }
  }

  return null;
}

export function clearAudioSourceCache() {
  audioSourceCache.clear();
  directAudioProbeCache.clear();
  for (const source of createdObjectUrls) {
    try {
      URL.revokeObjectURL(source);
    } catch {
      // ignore revoke failures from stale object URLs
    }
  }
  createdObjectUrls.clear();
}
