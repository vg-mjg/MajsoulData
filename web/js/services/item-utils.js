import { localizedAssetPrefixes, localizedFieldValue, normalizeUiLanguage } from "../../utils.js";

const LOCALIZED_PREFIX_PATTERN = /^(en|jp|chs_t|kr|en_kr)\//;

export function numberValue(value) {
  return Number(value || 0);
}

export function stringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function hasLocalizedPrefix(path) {
  return LOCALIZED_PREFIX_PATTERN.test(path);
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).map((value) => stringValue(value).trim()).filter(Boolean)));
}

export function expandLocalizedAssetPaths(rawPath, language) {
  const normalized = stringValue(rawPath).trim().replace(/^\/+/, "");
  if (!normalized) return [];
  if (hasLocalizedPrefix(normalized)) return [normalized];
  return localizedAssetPrefixes(language).map((prefix) => (prefix ? `${prefix}${normalized}` : normalized));
}

export function itemIconPaths(entry, language) {
  if (!entry || typeof entry !== "object") return [];

  const directPaths = uniqueStrings([
    entry.iconItem,
    entry.iconTransparent,
    entry.iconJpg,
    entry.icon,
  ]);

  const expanded = [];
  for (const path of directPaths) {
    expanded.push(...expandLocalizedAssetPaths(path, language));
  }
  return uniqueStrings(expanded);
}

export function assetCandidatesFromPaths(paths, resourceManifest) {
  const candidates = [];
  const seen = new Set();

  for (const path of paths || []) {
    const entry = resourceManifest[path];
    if (!entry || !entry.prefix) continue;

    const key = `${entry.prefix}|${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      path,
      prefix: stringValue(entry.prefix),
    });
  }

  return candidates;
}

export function itemIconCandidates(entry, resourceManifest, language) {
  return assetCandidatesFromPaths(itemIconPaths(entry, language), resourceManifest);
}

export function parseItemAmountPairs(raw) {
  const text = stringValue(raw);
  const pairs = [];
  const pattern = /(\d+)\s*-\s*(\d+)/g;
  let match = pattern.exec(text);

  while (match) {
    const itemId = numberValue(match[1]);
    const count = numberValue(match[2]);
    if (itemId > 0 && count > 0) {
      pairs.push({
        itemId,
        count,
        raw: match[0],
      });
    }
    match = pattern.exec(text);
  }

  return pairs;
}

function localizedFallbackOrder(language) {
  const normalized = normalizeUiLanguage(language);
  if (normalized === "jp") return ["jp", "en", "chs_t", "chs", "kr"];
  if (normalized === "kr") return ["kr", "en", "jp", "chs_t", "chs"];
  if (normalized === "chs") return ["chs", "chs_t", "en", "jp", "kr"];
  if (normalized === "chs_t") return ["chs_t", "chs", "en", "jp", "kr"];
  return ["en", "jp", "chs_t", "chs", "kr"];
}

export function localizedNameFromEntry(entry, language, fallbackId = 0) {
  const localized = localizedFieldValue(entry, "name", language);
  if (localized) return localized;

  const order = localizedFallbackOrder(language);
  for (const code of order) {
    const suffix = code === "chs_t" ? "ChsT" : code === "chs" ? "Chs" : code === "en" ? "En" : code === "jp" ? "Jp" : "Kr";
    const value = stringValue(entry && entry[`name${suffix}`]).trim();
    if (value) return value;
  }

  return fallbackId > 0 ? `#${fallbackId}` : "Unknown";
}

export function localizedDescriptionFromEntry(entry, language) {
  const desc = localizedFieldValue(entry, "desc", language);
  if (desc) return desc;

  const descFunc = localizedFieldValue(entry, "descFunc", language);
  if (descFunc) return descFunc;

  return "";
}
