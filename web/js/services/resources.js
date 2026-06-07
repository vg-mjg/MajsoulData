import { fetchJson } from "../core/http.js";
import { resolveResourceUrl } from "../../utils.js";

const RESOURCES_URL = new URL("../../resources.json", import.meta.url);

let cachedPromise = null;

// resources.json shape: { images: {key: url|{region:url}}, audio: {key: url}, spine: {skinId: {layers}} }.
export async function loadResources() {
  if (!cachedPromise) {
    cachedPromise = fetchJson(RESOURCES_URL).catch((error) => {
      cachedPromise = null;
      throw error;
    });
  }
  return cachedPromise;
}

// Entries store paths relative to `resources.base` (the common mirror prefix)
// prepend it to recover the full URL
function fullUrl(resources, relative) {
  return relative ? `${resources.base || ""}${relative}` : "";
}

function asCandidates(url) {
  return url ? [{ url }] : [];
}

// Asset loaders consume arrays of `{ url }` candidates
// the resource map already resolves to a single path, so these arrays hold 0 or 1 entry
export function imageCandidates(resources, key, language) {
  if (!resources || !key) return [];
  return asCandidates(
    fullUrl(resources, resolveResourceUrl(resources.images[key], language)),
  );
}

export function audioCandidates(resources, key) {
  if (!resources || !key) return [];
  // Audio is EN-only and shared across regions.
  return asCandidates(fullUrl(resources, resources.audio[key]));
}

// Try several audio keys, returning candidates for the first one present.
export function firstAudioCandidates(resources, keys) {
  if (!resources) return [];
  for (const key of keys || []) {
    const candidates = audioCandidates(resources, key);
    if (candidates.length > 0) return candidates;
  }
  return [];
}

// Enumerate emoji sub-entries for a character whose `emo` base is, e.g., "deco/emo/e200001"
// The trailing slash keeps a shorter character id from matching a longer one (e200001 vs e20000106)
// Returns [{ subId, candidates }] in numeric sub-id order.
export function emojiEntries(resources, emoBase, language) {
  if (!resources || !emoBase) return [];
  const prefix = `${String(emoBase).replace(/\/+$/, "")}/`;
  const out = [];
  for (const key of Object.keys(resources.images)) {
    if (!key.startsWith(prefix)) continue;
    const subId = key.slice(prefix.length);
    out.push({ subId, candidates: imageCandidates(resources, key, language) });
  }
  out.sort((a, b) => (Number(a.subId) || 0) - (Number(b.subId) || 0));
  return out;
}

// Resolve a skin's spine asset set into concrete URLs for the viewer.
export function spineLayersForSkin(resources, skinId, language) {
  if (!resources || skinId === undefined || skinId === null) return [];
  const entry = resources.spine[String(skinId)];
  if (!entry || !Array.isArray(entry.layers)) return [];
  return entry.layers
    .map((layer) => ({
      name: layer.name,
      skeletonUrl: fullUrl(
        resources,
        resolveResourceUrl(layer.skeleton, language),
      ),
      atlasUrl: fullUrl(resources, resolveResourceUrl(layer.atlas, language)),
      textureUrls: (layer.textures || [])
        .map((tex) => fullUrl(resources, resolveResourceUrl(tex, language)))
        .filter(Boolean),
    }))
    .filter((layer) => layer.skeletonUrl && layer.atlasUrl);
}
