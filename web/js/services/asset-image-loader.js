import { assetUrlCandidates, decryptBytes, isEncryptedUrl } from "../../utils.js";

const imageSourceCache = new Map();
const blockedOrigins = new Set();
const createdObjectUrls = new Set();

function mimeTypeFromPath(path) {
  const normalized = String(path || "").toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".avif")) return "image/avif";
  return "application/octet-stream";
}

async function fetchImageSource(url, path) {
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

async function resolveCandidateImageSource(path, prefix) {
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
      const source = await fetchImageSource(url, path);
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

export async function loadCharacterImageSource(imageCandidates) {
  for (const candidate of imageCandidates || []) {
    const key = `${candidate.prefix}|${candidate.path}`;

    if (!imageSourceCache.has(key)) {
      const promise = resolveCandidateImageSource(candidate.path, candidate.prefix).catch(() => null);
      imageSourceCache.set(key, promise);
    }

    const source = await imageSourceCache.get(key);
    if (source) {
      return source;
    }
  }

  return null;
}

export function clearImageSourceCache() {
  imageSourceCache.clear();
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
