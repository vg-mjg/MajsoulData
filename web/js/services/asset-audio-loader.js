import { assetUrlCandidates, decryptBytes, isEncryptedUrl } from "../../utils.js";

const audioSourceCache = new Map();
const blockedOrigins = new Set();
const createdObjectUrls = new Set();

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

async function resolveCandidateAudioSource(path, prefix) {
  for (const url of assetUrlCandidates(path, prefix)) {
    let origin = "";
    try {
      origin = new URL(url).origin;
    } catch {
      continue;
    }

    if (blockedOrigins.has(origin)) {
      continue;
    }

    try {
      const source = await fetchAudioSource(url, path);
      if (source) {
        return source;
      }
    } catch (error) {
      if (error instanceof TypeError) {
        blockedOrigins.add(origin);
      }
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
  blockedOrigins.clear();
  for (const source of createdObjectUrls) {
    try {
      URL.revokeObjectURL(source);
    } catch {
      // ignore revoke failures from stale object URLs
    }
  }
  createdObjectUrls.clear();
}
