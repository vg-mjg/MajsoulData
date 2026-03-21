const MIRROR_SERVER_URL = "https://files.riichi.moe/mjg/game%20resources%20and%20tools/Mahjong%20Soul/raw%20assets"

const GAME_SERVER_URLS = {
  en: "https://mahjongsoul.game.yo-star.com",
  kr: "https://mahjongsoul.game.yo-star.com",
  chs_t: "https://game.maj-soul.com/1",
  jp: "https://game.mahjongsoul.com",
};

const LANGUAGE = {
  EN: "en",
  CHS: "chs",
  CHS_T: "chs_t",
  JP: "jp",
  KR: "kr",
};

const UI_LANGUAGE_PRIORITY = {
  [LANGUAGE.EN]: [LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.KR],
  [LANGUAGE.JP]: [LANGUAGE.JP, LANGUAGE.EN, LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.KR],
  [LANGUAGE.CHS]: [LANGUAGE.CHS, LANGUAGE.CHS_T, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.KR],
  [LANGUAGE.CHS_T]: [LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.KR],
  [LANGUAGE.KR]: [LANGUAGE.KR, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.CHS_T, LANGUAGE.CHS],
};

const UI_ASSET_PREFIX_PRIORITY = {
  [LANGUAGE.EN]: ["en/", "kr/", "en_kr/", "chs_t/", "", "jp/"],
  [LANGUAGE.JP]: ["jp/", "en/", "kr/", "en_kr/", "chs_t/", ""],
  [LANGUAGE.CHS]: ["", "chs_t/", "en/", "kr/", "en_kr/", "jp/"],
  [LANGUAGE.CHS_T]: ["chs_t/", "", "en/", "kr/", "en_kr/", "jp/"],
  [LANGUAGE.KR]: ["kr/", "en_kr/", "en/", "chs_t/", "", "jp/"],
};

const LANGUAGE_FIELD_SUFFIX = {
  [LANGUAGE.EN]: "En",
  [LANGUAGE.JP]: "Jp",
  [LANGUAGE.CHS]: "Chs",
  [LANGUAGE.CHS_T]: "ChsT",
  [LANGUAGE.KR]: "Kr",
};

const RESOURCE_PREFIXES_BY_LANGUAGE = {
  [LANGUAGE.CHS]: [""],
  [LANGUAGE.CHS_T]: ["chs_t/"],
  [LANGUAGE.EN]: ["en/"],
  [LANGUAGE.JP]: ["jp/"],
  [LANGUAGE.KR]: ["kr/", "en_kr/"],
};

const RESOURCE_PREFIX_FALLBACK = ["", "chs_t/", "en/", "jp/", "kr/", "en_kr/"];
const ASSET_PREFIX_FALLBACK = ["", "chs_t/", "en/", "kr/", "en_kr/", "jp/"];
const LANG_PATH_PREFIX_PRIORITY = {
  [LANGUAGE.EN]: ["base/", "base_q7/", "chs_t/", "chs_t_q7/", "chs/", "chs_q7/"],
  [LANGUAGE.JP]: ["base/", "base_q7/", "chs_t/", "chs_t_q7/", "chs/", "chs_q7/"],
  [LANGUAGE.KR]: ["base/", "base_q7/", "chs_t/", "chs_t_q7/", "chs/", "chs_q7/"],
  [LANGUAGE.CHS]: ["chs/", "chs_q7/", "chs_t/", "chs_t_q7/", "base/", "base_q7/"],
  [LANGUAGE.CHS_T]: ["chs_t/", "chs_t_q7/", "chs/", "chs_q7/", "base/", "base_q7/"],
};
const LANG_PATH_PATTERN = /^lang\/(base_q7|base|chs_t_q7|chs_t|chs_q7|chs)\//;
const UI_LANGUAGE_STORAGE_KEY = "mahjong-soul-data.language";

const LOCALIZED_PREFIX_PATTERN = /^(en_kr|en|jp|chs_t|kr)\//;

export function stripLocalizedPrefix(path) {
  const normalized = String(path || "").trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) return "";
  const stripped = normalized.replace(LOCALIZED_PREFIX_PATTERN, "");
  return stripped || normalized;
}

const ENCRYPTED_ASSETS_POSITIVE_PATTERN = /\/extendRes\//;
const ENCRYPTED_ASSETS_NEGATIVE_PATTERN = /\/spine\//;
const XOR_KEY = 73;

function parsePosix(path) {
  const slash = path.lastIndexOf("/");
  const dir = slash >= 0 ? path.slice(0, slash) : "";
  const base = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = base.lastIndexOf(".");
  const hasExt = dot > 0;
  const name = hasExt ? base.slice(0, dot) : base;
  const ext = hasExt ? base.slice(dot) : "";
  return { dir, base, name, ext };
}

function joinPosix(...parts) {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
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

export function languageOfResourcePath(path) {
  if (/^en\/|\/en\//.test(path)) {
    return LANGUAGE.EN;
  } else if (/^en_kr\/|\/en_kr\//.test(path)) {
    return LANGUAGE.KR;
  } else if (/^kr\/|\/kr\//.test(path)) {
    return LANGUAGE.KR;
  } else if (/^jp\/|\/jp\//.test(path)) {
    return LANGUAGE.JP;
  } else if (/^chs_t\/|\/chs_t\//.test(path)) {
    return LANGUAGE.CHS_T;
  }
  return LANGUAGE.CHS;
}

function resourcePrefixForLanguage(language) {
  return language === LANGUAGE.CHS ? "" : `${language}/`;
}

function prefixOfResourcePath(path) {
  const language = languageOfResourcePath(path);
  return resourcePrefixForLanguage(language);
}

export function stripLanguagePrefix(path) {
  const prefix = prefixOfResourcePath(path);
  if (!prefix) return path;
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length);
  }
  return path.replace(prefix, "");
}

function serverForLanguage(language) {
  if (language === LANGUAGE.EN) return "en";
  if (language === LANGUAGE.KR) return "kr";
  if (language === LANGUAGE.JP) return "jp";
  return "chs_t";
}

export function isEncryptedPath(pathname) {
  return (
    ENCRYPTED_ASSETS_POSITIVE_PATTERN.test(pathname) &&
    !ENCRYPTED_ASSETS_NEGATIVE_PATTERN.test(pathname)
  );
}

export function isEncryptedUrl(url) {
  if (url.startsWith(MIRROR_SERVER_URL)) {
    return false
  }

  try {
    const parsed = new URL(url);
    return isEncryptedPath(parsed.pathname);
  } catch {
    return isEncryptedPath(url);
  }
}

export function mapPath(filePath, mappings) {
  const basePath = stripLanguagePrefix(filePath);
  const parsed = parsePosix(basePath);
  const extensionlessPath = parsed.dir ? `${parsed.dir}/${parsed.name}` : parsed.name;

  const newBasePath = mappings[basePath];
  const newExtensionlessPath = mappings[extensionlessPath];
  const newDir = mappings[parsed.dir];

  if (newBasePath) {
    return newBasePath;
  }
  if (newExtensionlessPath) {
    return `${newExtensionlessPath}${parsed.ext}`;
  }
  if (newDir) {
    return joinPosix(newDir, parsed.base);
  }
  return joinPosix("other", basePath);
}

export function decryptBytes(buffer) {
  const output = new Uint8Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) {
    output[i] = XOR_KEY ^ buffer[i];
  }
  return output;
}

export const DEFAULT_UI_LANGUAGE = LANGUAGE.EN;

export function normalizeUiLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value === LANGUAGE.EN) return LANGUAGE.EN;
  if (value === LANGUAGE.JP) return LANGUAGE.JP;
  if (value === LANGUAGE.CHS) return LANGUAGE.CHS;
  if (value === LANGUAGE.CHS_T) return LANGUAGE.CHS_T;
  if (value === LANGUAGE.KR) return LANGUAGE.KR;
  return DEFAULT_UI_LANGUAGE;
}

export function localizedResourcePrefixes(language = DEFAULT_UI_LANGUAGE) {
  const normalizedLanguage = normalizeUiLanguage(language);
  const languageOrder = UI_LANGUAGE_PRIORITY[normalizedLanguage] || UI_LANGUAGE_PRIORITY[DEFAULT_UI_LANGUAGE];
  const prefixes = [];

  for (const code of languageOrder) {
    const localizedPrefixes = RESOURCE_PREFIXES_BY_LANGUAGE[code] || [];
    for (const prefix of localizedPrefixes) {
      if (!prefixes.includes(prefix)) {
        prefixes.push(prefix);
      }
    }
  }

  for (const prefix of RESOURCE_PREFIX_FALLBACK) {
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
    }
  }

  return prefixes;
}

export function localizedAssetPrefixes(language = DEFAULT_UI_LANGUAGE) {
  const normalizedLanguage = normalizeUiLanguage(language);
  const primary = UI_ASSET_PREFIX_PRIORITY[normalizedLanguage] || UI_ASSET_PREFIX_PRIORITY[DEFAULT_UI_LANGUAGE];
  const prefixes = [];

  for (const prefix of primary) {
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
    }
  }

  for (const prefix of ASSET_PREFIX_FALLBACK) {
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
    }
  }

  return prefixes;
}

function preferredLangPathPrefixes(language = DEFAULT_UI_LANGUAGE) {
  const normalizedLanguage = normalizeUiLanguage(language);
  return LANG_PATH_PREFIX_PRIORITY[normalizedLanguage] || LANG_PATH_PREFIX_PRIORITY[DEFAULT_UI_LANGUAGE];
}

export function localizedAssetPathCandidates(rawPath, language = DEFAULT_UI_LANGUAGE) {
  const normalized = String(rawPath || "").trim().replace(/^\/+/, "");
  if (!normalized) return [];

  const candidates = [];
  const seen = new Set();
  const add = (path) => {
    const value = String(path || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };

  const stripped = stripLocalizedPrefix(normalized);
  for (const prefix of localizedAssetPrefixes(language)) {
    add(prefix ? `${prefix}${stripped}` : stripped);
  }
  add(normalized);
  add(stripped);

  const langTail = LANG_PATH_PATTERN.test(normalized)
    ? normalized.replace(LANG_PATH_PATTERN, "")
    : stripped;
  if (langTail) {
    for (const prefix of preferredLangPathPrefixes(language)) {
      add(`lang/${prefix}${langTail}`);
    }
  }

  return candidates;
}

export function localizedFieldValue(entry, baseKey, language) {
  if (!entry || typeof entry !== "object") return "";
  const normalizedLanguage = normalizeUiLanguage(language);
  const languageOrder = UI_LANGUAGE_PRIORITY[normalizedLanguage] || UI_LANGUAGE_PRIORITY[DEFAULT_UI_LANGUAGE];

  for (const code of languageOrder) {
    const suffix = LANGUAGE_FIELD_SUFFIX[code];
    const key = `${baseKey}${suffix}`;
    const value = entry[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return "";
}

export function characterDisplayName(character, language = DEFAULT_UI_LANGUAGE) {
  const localized = localizedFieldValue(character, "name", language);
  if (localized.length > 0) return localized;
  return `#${character.id}`;
}

export function characterBigheadCandidatePaths(basePath, language = DEFAULT_UI_LANGUAGE) {
  if (!basePath) return [];
  return localizedAssetPathCandidates(`${basePath}/bighead.png`, language);
}

export function assetUrlFromPathAndPrefix(path, prefix) {
  const language = languageOfResourcePath(path);
  let server;
  switch (language) {
    case LANGUAGE.EN:
      server = GAME_SERVER_URLS.en;
      break;
    case LANGUAGE.JP:
      server = GAME_SERVER_URLS.jp;
      break;
    case LANGUAGE.KR:
      server = GAME_SERVER_URLS.kr;
      break;
    default:
      server = GAME_SERVER_URLS.chs_t;
      break;
  }
  const cleanPrefix = String(prefix || "").replace(/^\/+/, "");
  return `${server}/${cleanPrefix}/${path}`;
}

function currentUiLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_UI_LANGUAGE;
  }
  try {
    return normalizeUiLanguage(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

export function assetUrlCandidates(path, prefix, uiLanguage) {
  const normalizedUiLanguage = normalizeUiLanguage(uiLanguage || currentUiLanguage());
  const uiServerKey = serverForLanguage(normalizedUiLanguage);
  const pathLanguage = languageOfResourcePath(path);
  const pathServerKey = serverForLanguage(pathLanguage);
  const orderedBases = [
    MIRROR_SERVER_URL,
    GAME_SERVER_URLS[pathServerKey],
    GAME_SERVER_URLS[uiServerKey],
    GAME_SERVER_URLS.chs_t,
    GAME_SERVER_URLS.en,
    GAME_SERVER_URLS.kr,
    GAME_SERVER_URLS.jp,
  ];
  const uniqueBases = Array.from(new Set(orderedBases.filter(Boolean)));
  const cleanPrefix = String(prefix || "").replace(/^\/+/, "");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return uniqueBases.map((base) => {
    const url = new URL(`${base}/${cleanPrefix}/${cleanPath}`);
    return url.toString();
  });
}

export function makeInitials(name) {
  const text = String(name || "").trim();
  if (!text) return "?";
  return text;
}
