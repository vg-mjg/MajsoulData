import { localizedFieldValue } from "../../utils.js";
import { imageCandidates } from "./resources.js";

export function numberValue(value) {
  return Number(value || 0);
}

export function stringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function itemIconCandidates(entry, resources, language) {
  if (!entry || !resources) return [];
  for (const field of ["icon", "icon_transparent", "icon_item"]) {
    const ref = stringValue(entry[field]).trim();
    if (!ref) continue;
    const candidates = imageCandidates(resources, ref, language);
    if (candidates.length > 0) return candidates;
  }
  return [];
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
      pairs.push({ itemId, count, raw: match[0] });
    }
    match = pattern.exec(text);
  }

  return pairs;
}

export function localizedNameFromEntry(entry, language, fallbackId = 0) {
  const localized = localizedFieldValue(entry, "name", language);
  if (localized) return localized;
  return fallbackId > 0 ? `#${fallbackId}` : "Unknown";
}

export function localizedDescriptionFromEntry(entry, language) {
  const desc = localizedFieldValue(entry, "desc", language);
  if (desc) return desc;

  const descFunc = localizedFieldValue(entry, "descFunc", language);
  if (descFunc) return descFunc;

  return "";
}

const LOADING_SPRITE_NAME_PREFIX = "Loading:";

const LOADING_SPRITE_CATEGORY_LABELS = {
  table: "Table",
  left: "Left",
  mid: "Mid",
  right: "Right",
};

export function loadingSpriteDisplayName(filename) {
  const positionMatch = filename.match(/^([a-z]+)_?(\d+)\.png$/);
  if (positionMatch) {
    const category = LOADING_SPRITE_CATEGORY_LABELS[positionMatch[1]] || positionMatch[1];
    return `${LOADING_SPRITE_NAME_PREFIX} ${category} ${positionMatch[2]}`;
  }
  const categoryMatch = filename.match(/^([a-z]+)\.png$/);
  if (categoryMatch) {
    const category = LOADING_SPRITE_CATEGORY_LABELS[categoryMatch[1]] || categoryMatch[1];
    return `${LOADING_SPRITE_NAME_PREFIX} ${category}`;
  }
  const filenameWithoutExt = filename.replace(/\.png$/, "");
  return `${LOADING_SPRITE_NAME_PREFIX} ${filenameWithoutExt}`;
}

export function loadingSpriteImageCandidates(sprite, resources, language) {
  if (!sprite || !resources) return [];
  return imageCandidates(resources, stringValue(sprite.key).trim(), language);
}
