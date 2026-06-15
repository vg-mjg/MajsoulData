// Shared localization helpers used by BOTH the ingest pipeline and the Eleventy
// build filters, so text and asset resolution behave identically in both stages.
// Ported from the old SPA's `web/utils.js`. Pure ESM, no dependencies.

export const LANGUAGE = {
  EN: "en",
  CHS: "chs",
  CHS_T: "chs_t",
  JP: "jp",
  KR: "kr",
};

export const LANGUAGE_CODES = [
  LANGUAGE.EN,
  LANGUAGE.JP,
  LANGUAGE.CHS,
  LANGUAGE.CHS_T,
  LANGUAGE.KR,
];

export const DEFAULT_UI_LANGUAGE = LANGUAGE.EN;

// Order in which to look for a localized text value when the preferred language
// is blank. Every language ends by trying all the others, so a row that only
// carries, say, Japanese text still renders something everywhere.
const UI_LANGUAGE_PRIORITY = {
  [LANGUAGE.EN]: [LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.KR],
  [LANGUAGE.JP]: [LANGUAGE.JP, LANGUAGE.EN, LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.KR],
  [LANGUAGE.CHS]: [LANGUAGE.CHS, LANGUAGE.CHS_T, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.KR],
  [LANGUAGE.CHS_T]: [LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.KR],
  [LANGUAGE.KR]: [LANGUAGE.KR, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.CHS_T, LANGUAGE.CHS],
};

// Mirror region that serves a given UI language's assets. Both Chinese variants
// pull region-exclusive assets from the CN dump (issuer chs_t); everything else
// falls back to the complete EN base inside resolveResourceUrl.
const REGION_BY_LANGUAGE = {
  [LANGUAGE.EN]: "en",
  [LANGUAGE.JP]: "jp",
  [LANGUAGE.KR]: "kr",
  [LANGUAGE.CHS]: "cn",
  [LANGUAGE.CHS_T]: "cn",
};

// Ordered keys to try in an asset value-map for each UI language. The `cn` key
// holds Traditional Chinese (the cn dump's issuer); Simplified Chinese (`chs`)
// is emitted only when it differs, so chs falls back to cn then en. Every
// language ends at the EN base, then any remaining entry (region-exclusive).
const LOCALE_FALLBACK_BY_LANGUAGE = {
  [LANGUAGE.EN]: ["en"],
  [LANGUAGE.JP]: ["jp", "en"],
  [LANGUAGE.KR]: ["kr", "en"],
  [LANGUAGE.CHS_T]: ["cn", "en"],
  [LANGUAGE.CHS]: ["chs", "cn", "en"],
};

export function normalizeUiLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (LANGUAGE_CODES.includes(value)) return value;
  return DEFAULT_UI_LANGUAGE;
}

export function regionForLanguage(language) {
  return REGION_BY_LANGUAGE[normalizeUiLanguage(language)] || "en";
}

// Resolve an asset value-map to a single URL for the given UI language. Values
// are either a bare string (the EN base, shared by every language) or a sparse
// `{region: url}` object (region-exclusive assets, plus a `chs` split for assets
// that ship distinct Simplified Chinese art).
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

// Resolve a per-language text map `{en, jp, chs, chs_t, kr}` to a single string
// for the given UI language, applying the documented fallback chain. Blank and
// whitespace-only entries are skipped so a fallback language wins over an empty
// preferred column.
export function localizeText(textMap, language = DEFAULT_UI_LANGUAGE) {
  if (!textMap || typeof textMap !== "object") return "";
  const order =
    UI_LANGUAGE_PRIORITY[normalizeUiLanguage(language)] ||
    UI_LANGUAGE_PRIORITY[DEFAULT_UI_LANGUAGE];
  for (const code of order) {
    const value = textMap[code];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized.length > 0) return normalized;
  }
  return "";
}

// Read a localized text column straight off a raw data row. `snakeBase` is the
// column stem (e.g. "name", "desc_stature") and the row carries `<stem>_<code>`
// columns. Returns the language-agnostic `{en, jp, chs, chs_t, kr}` map that the
// pipeline folds into a collection entry.
export function textMap(row, snakeBase) {
  const out = {};
  for (const code of LANGUAGE_CODES) {
    const value = row ? row[`${snakeBase}_${code}`] : undefined;
    out[code] = value === null || value === undefined ? "" : String(value);
  }
  return out;
}

export function characterDisplayName(nameMap, id, language = DEFAULT_UI_LANGUAGE) {
  const localized = localizeText(nameMap, language);
  if (localized.length > 0) return localized;
  return `#${id}`;
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

// Some data tables serialize as an array of row-groups (arrays of arrays);
// flatten those one level so callers always see a flat array of rows.
export function rowsOf(data) {
  if (!Array.isArray(data)) return [];
  if (data.length > 0 && Array.isArray(data[0])) return data.flat();
  return data;
}
