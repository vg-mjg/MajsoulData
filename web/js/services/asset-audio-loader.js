import { DEFAULT_UI_LANGUAGE, assetUrlCandidates, normalizeUiLanguage } from "../../utils.js";

const audioSourceCache = new Map();
const createdObjectUrls = new Set();
const directAudioProbeCache = new Map();
const UI_LANGUAGE_STORAGE_KEY = "mahjong-soul-data.language";
let activeUiLanguage = null;

export function setAudioLoaderLanguage(language) {
  activeUiLanguage = normalizeUiLanguage(language);
}

function currentUiLanguage() {
  if (activeUiLanguage) {
    return activeUiLanguage;
  }
  if (typeof window === "undefined") {
    return DEFAULT_UI_LANGUAGE;
  }
  try {
    return normalizeUiLanguage(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

function isJapaneseLocalizedPath(path) {
  return /^jp\//i.test(String(path || "").trim());
}

function prioritizeCandidatesByLanguage(candidates, uiLanguage) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (uiLanguage === "jp") {
    return list;
  }
  const nonJapanese = [];
  const japanese = [];
  for (const candidate of list) {
    if (candidate && isJapaneseLocalizedPath(candidate.path)) {
      japanese.push(candidate);
    } else {
      nonJapanese.push(candidate);
    }
  }
  return [...nonJapanese, ...japanese];
}

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

  const bytes = new Uint8Array(await response.arrayBuffer());
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

async function resolveCandidateAudioSource(path, prefix, uiLanguage) {
  for (const url of assetUrlCandidates(path, prefix, uiLanguage)) {
    try {
      const source = await probeDirectAudioSource(url);
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
  const uiLanguage = currentUiLanguage();
  const orderedCandidates = prioritizeCandidatesByLanguage(audioCandidates, uiLanguage);

  for (const candidate of orderedCandidates) {
    const key = `${uiLanguage}|${candidate.prefix}|${candidate.path}`;

    if (!audioSourceCache.has(key)) {
      const promise = resolveCandidateAudioSource(candidate.path, candidate.prefix, uiLanguage).catch(() => null);
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
