const LANGUAGE = {
  EN: "en",
  CHS: "chs",
  CHS_T: "chs_t",
  JP: "jp",
  KR: "kr",
};

// Order in which to look for a localized text column when the preferred one is blank.
const UI_LANGUAGE_PRIORITY = {
  [LANGUAGE.EN]: [
    LANGUAGE.EN,
    LANGUAGE.JP,
    LANGUAGE.CHS_T,
    LANGUAGE.CHS,
    LANGUAGE.KR,
  ],
  [LANGUAGE.JP]: [
    LANGUAGE.JP,
    LANGUAGE.EN,
    LANGUAGE.CHS_T,
    LANGUAGE.CHS,
    LANGUAGE.KR,
  ],
  [LANGUAGE.CHS]: [
    LANGUAGE.CHS,
    LANGUAGE.CHS_T,
    LANGUAGE.EN,
    LANGUAGE.JP,
    LANGUAGE.KR,
  ],
  [LANGUAGE.CHS_T]: [
    LANGUAGE.CHS_T,
    LANGUAGE.CHS,
    LANGUAGE.EN,
    LANGUAGE.JP,
    LANGUAGE.KR,
  ],
  [LANGUAGE.KR]: [
    LANGUAGE.KR,
    LANGUAGE.EN,
    LANGUAGE.JP,
    LANGUAGE.CHS_T,
    LANGUAGE.CHS,
  ],
};

// Mirror region that serves a given UI language's assets
// Both Chinese variants pull region-exclusive assets from the CN dump (issuer chs_t)
// Everything else falls back to the complete EN base inside resolveResourceUrl
const REGION_BY_LANGUAGE = {
  [LANGUAGE.EN]: "en",
  [LANGUAGE.JP]: "jp",
  [LANGUAGE.KR]: "kr",
  [LANGUAGE.CHS]: "cn",
  [LANGUAGE.CHS_T]: "cn",
};

// Ordered keys to try in a resources.json value object for each UI language.
// The `cn` key holds Traditional Chinese (the cn dump's issuer); Simplified
// Chinese (`chs`) is emitted only when it differs, so chs falls back to cn then en.
// Every language ends at the EN base, then any remaining entry (region-exclusive).
const LOCALE_FALLBACK_BY_LANGUAGE = {
  [LANGUAGE.EN]: ["en"],
  [LANGUAGE.JP]: ["jp", "en"],
  [LANGUAGE.KR]: ["kr", "en"],
  [LANGUAGE.CHS_T]: ["cn", "en"],
  [LANGUAGE.CHS]: ["chs", "cn", "en"],
};

const UI_LANGUAGE_STORAGE_KEY = "mahjong-soul-data.language";

export const DEFAULT_UI_LANGUAGE = LANGUAGE.EN;

export { LANGUAGE, UI_LANGUAGE_STORAGE_KEY };

export function normalizeUiLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value === LANGUAGE.EN) return LANGUAGE.EN;
  if (value === LANGUAGE.JP) return LANGUAGE.JP;
  if (value === LANGUAGE.CHS) return LANGUAGE.CHS;
  if (value === LANGUAGE.CHS_T) return LANGUAGE.CHS_T;
  if (value === LANGUAGE.KR) return LANGUAGE.KR;
  return DEFAULT_UI_LANGUAGE;
}

export function regionForLanguage(language) {
  return REGION_BY_LANGUAGE[normalizeUiLanguage(language)] || "en";
}

// Resolve a resources.json value to a single (base-relative) path for the given UI language
// Values are either a bare string (EN base, shared by every language) or a sparse `{region: path}` object
// (region-exclusive assets, plus a `chs` split for assets that ship distinct Simplified Chinese art).
export function resolveResourceUrl(value, language = DEFAULT_UI_LANGUAGE) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  const chain = LOCALE_FALLBACK_BY_LANGUAGE[normalizeUiLanguage(language)] || ["en"];
  for (const key of chain) {
    if (value[key]) return value[key];
  }
  return Object.values(value).find(Boolean) || "";
}

// Read a localized text column. `baseKey` may be camelCase (e.g. "descStature", "lockTips") for caller convenience
// Columns in the data are snake_case (desc_stature_en, lock_tips_en, ...)
export function localizedFieldValue(entry, baseKey, language) {
  if (!entry || typeof entry !== "object") return "";
  const snakeBase = String(baseKey)
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase();
  const normalizedLanguage = normalizeUiLanguage(language);
  const order =
    UI_LANGUAGE_PRIORITY[normalizedLanguage] ||
    UI_LANGUAGE_PRIORITY[DEFAULT_UI_LANGUAGE];

  for (const code of order) {
    const value = entry[`${snakeBase}_${code}`];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized.length > 0) return normalized;
  }

  return "";
}

export function characterDisplayName(
  character,
  language = DEFAULT_UI_LANGUAGE,
) {
  const localized = localizedFieldValue(character, "name", language);
  if (localized.length > 0) return localized;
  return `#${character && character.id}`;
}

export function parseVersion(text) {
  if (typeof text !== "string") {
    throw new Error("invalid version input");
  }
  const normalized = text.startsWith("v") ? text.slice(1) : text;
  const chunks = normalized.split(".");
  if (chunks.length < 3) {
    throw new Error(`invalid version ${text}`);
  }
  const major = Number.parseInt(chunks[0], 10);
  const minor = Number.parseInt(chunks[1], 10);
  const patch = Number.parseInt(chunks[2], 10);
  if ([major, minor, patch].some(Number.isNaN)) {
    throw new Error(`invalid version ${text}`);
  }
  const stem = chunks.length > 3 ? chunks.slice(3).join(".") : undefined;
  return { major, minor, patch, stem };
}

export function versionToString(version) {
  const stem = version.stem || "w";
  return `${version.major}.${version.minor}.${version.patch}.${stem}`;
}

export function compareVersion(v1, v2) {
  const left = [v1.major, v1.minor, v1.patch];
  const right = [v2.major, v2.minor, v2.patch];
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }
  return 0;
}

export function makeInitials(name) {
  const text = String(name || "").trim();
  if (!text) return "?";
  return text;
}

// Some data tables serialize as an array of row-groups (arrays of arrays)
// flatten those one level so callers always see a flat array of rows
export function rowsOf(data) {
  if (!Array.isArray(data)) return [];
  if (data.length > 0 && Array.isArray(data[0])) return data.flat();
  return data;
}
