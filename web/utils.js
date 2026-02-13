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

const LANGUAGE_ORDER = [
  LANGUAGE.EN,
  LANGUAGE.CHS,
  LANGUAGE.CHS_T,
  LANGUAGE.JP,
  LANGUAGE.KR,
];

const UI_LANGUAGE_PRIORITY = {
  [LANGUAGE.EN]: [LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.KR],
  [LANGUAGE.JP]: [LANGUAGE.JP, LANGUAGE.EN, LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.KR],
  [LANGUAGE.CHS]: [LANGUAGE.CHS, LANGUAGE.CHS_T, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.KR],
  [LANGUAGE.CHS_T]: [LANGUAGE.CHS_T, LANGUAGE.CHS, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.KR],
  [LANGUAGE.KR]: [LANGUAGE.KR, LANGUAGE.EN, LANGUAGE.JP, LANGUAGE.CHS_T, LANGUAGE.CHS],
};

const UI_ASSET_PREFIX_PRIORITY = {
  [LANGUAGE.EN]: ["en/", "", "chs_t/", "kr/", "en_kr/", "jp/"],
  [LANGUAGE.JP]: ["jp/", "", "chs_t/", "en/", "kr/", "en_kr/"],
  [LANGUAGE.CHS]: ["", "chs_t/", "en/", "kr/", "en_kr/", "jp/"],
  [LANGUAGE.CHS_T]: ["chs_t/", "", "en/", "kr/", "en_kr/", "jp/"],
  [LANGUAGE.KR]: ["kr/", "en_kr/", "en/", "", "chs_t/", "jp/"],
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

export function resourceUrl(resource) {
  const server = serverForLanguage(resource.language);
  const version = versionToString(resource.version);
  const base = GAME_SERVER_URLS[server];
  return `${base}/v${version}/${resource.path}`;
}

export function isEncryptedPath(pathname) {
  return (
    ENCRYPTED_ASSETS_POSITIVE_PATTERN.test(pathname) &&
    !ENCRYPTED_ASSETS_NEGATIVE_PATTERN.test(pathname)
  );
}

export function isEncryptedUrl(url) {
  try {
    const parsed = new URL(url);
    return isEncryptedPath(parsed.pathname);
  } catch {
    return isEncryptedPath(url);
  }
}

function compareByLanguage(a, b) {
  return LANGUAGE_ORDER.indexOf(a.language) - LANGUAGE_ORDER.indexOf(b.language);
}

function guessType(path) {
  const ext = parsePosix(path).ext.toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"].includes(ext)) {
    return "image";
  }
  if ([".mp3", ".ogg", ".wav", ".m4a"].includes(ext)) {
    return "audio";
  }
  if (path.includes("/spine/") || ext === ".skel" || ext === ".atlas") {
    return "spine";
  }
  if ([".txt", ".json", ".md", ".xml", ".proto"].includes(ext)) {
    return "text";
  }
  return "other";
}

export function parseResourcesFromResversion(resversionJson) {
  const entries = Object.entries((resversionJson && resversionJson.res) || {});
  const resources = entries.map(([path, value]) => {
    const rawPrefix = value && value.prefix ? String(value.prefix) : "v0.0.0.w";
    const version = parseVersion(rawPrefix);
    const language = languageOfResourcePath(path);
    const url = resourceUrl({ path, version, language });
    const encrypted = isEncryptedUrl(url);
    return {
      language,
      path,
      version,
      versionText: versionToString(version),
      prefix: rawPrefix,
      url,
      encrypted,
      type: guessType(path),
    };
  });
  resources.sort(compareByLanguage);
  return resources;
}

function stripIllegalCharacters(text) {
  return String(text || "")
    .replaceAll("/", " ")
    .replace(/[/\\?%*:|"<>]/g, "");
}

function metadataHasForeignName(entry) {
  const englishName = entry.nameEn;
  const otherNames = [entry.nameJp, entry.nameChsT, entry.nameChs];
  return otherNames.includes(englishName);
}

function buildCharacterIdMappings(itemDefinitionCharacter) {
  const mappings = { 0: "Freed Jyanshi" };
  for (const character of itemDefinitionCharacter || []) {
    mappings[character.id] = character.nameEn;
  }
  return mappings;
}

function buildCharacterSoundFolderMappings(itemDefinitionCharacter) {
  const mappings = {};
  for (const character of itemDefinitionCharacter || []) {
    if (character.soundFolder) {
      mappings[character.id] = character.soundFolder;
    }
  }
  return mappings;
}

function buildVoiceMappings(voiceSound, characterIdMappings, soundFolderMappings) {
  const mappings = {};
  for (const entry of voiceSound || []) {
    const voiceType = String(entry.type || "");
    const rawPath = String(entry.path || "");
    if (!rawPath) continue;

    const originalName = rawPath.split("/").pop() || rawPath;
    const englishName = String(entry.nameEn || "").toLowerCase();
    const characterId = 200000 + Number(entry.id || 0);
    const characterId2 = 20000000 + Number(entry.id || 0);
    const characterName =
      characterIdMappings[characterId] ||
      characterIdMappings[characterId2] ||
      `Unknown_${entry.id}`;
    const soundFolder =
      soundFolderMappings[characterId] ||
      soundFolderMappings[characterId2] ||
      "";

    let basePath = `voices/${stripIllegalCharacters(characterName)}/`;
    if (voiceType.startsWith("fan_")) basePath += "yaku - ";
    if (voiceType.startsWith("scfan_")) basePath += "sp yaku - ";
    if (voiceType.startsWith("act_")) basePath += "action - ";
    if (voiceType.startsWith("gameend_")) basePath += "game end - ";
    if (englishName.length > 0) {
      basePath += stripIllegalCharacters(englishName);
    } else {
      basePath += originalName;
    }

    mappings[rawPath] = basePath;

    if (soundFolder) {
      mappings[`audio/sound/${soundFolder}/${rawPath}`] = basePath;
      const tail = rawPath.split("/").pop();
      if (tail) {
        mappings[`audio/sound/${soundFolder}/${tail}`] = basePath;
      }
    }
  }
  return mappings;
}

function buildTitleMapping(entry, pathKey, defaultExtension, suffix = "") {
  const basePath = "titles/";
  const filePath = String(entry[pathKey] || "");
  if (!filePath) return null;

  const parsedPath = parsePosix(filePath);
  const extension = parsedPath.ext || defaultExtension;
  const englishName = entry.nameEn;

  let finalSuffix = suffix;
  if (parsedPath.name.endsWith("3")) {
    finalSuffix = ` (sanma)${finalSuffix}`;
  }

  let newPath;
  if (englishName && !metadataHasForeignName(entry)) {
    newPath = `${basePath}${stripIllegalCharacters(englishName)}${finalSuffix}${extension}`;
  } else {
    newPath = `${basePath}${parsedPath.base}`;
  }

  return [filePath, newPath];
}

function buildTitleMappings(itemDefinitionTitle) {
  const mappings = {};
  for (const entry of itemDefinitionTitle || []) {
    const icon = buildTitleMapping(entry, "icon", ".png");
    const iconItem = buildTitleMapping(entry, "iconItem", ".jpg", " item");
    if (icon) {
      mappings[icon[0]] = icon[1];
    }
    if (iconItem && (!icon || icon[0] !== iconItem[0])) {
      mappings[iconItem[0]] = iconItem[1];
    }
  }
  return mappings;
}

function buildItemMappings(entries) {
  const mappings = {};
  const basePath = "items/";

  for (const entry of entries || []) {
    const filePath = String(entry.icon || "");
    const englishName = entry.nameEn;
    if (!filePath || filePath === "-") continue;

    const parsed = parsePosix(filePath);
    const extension = parsed.ext || ".jpg";
    const suffix = parsed.base.includes("_limit") ? " locked" : "";

    if (englishName && !metadataHasForeignName(entry)) {
      mappings[filePath] = `${basePath}${stripIllegalCharacters(englishName)}${suffix}${extension}`;
    } else {
      mappings[filePath] = `${basePath}${parsed.base}`;
    }
  }

  return mappings;
}

function buildRankMappings(levelDefinitionLevelDefinition) {
  const mappings = {};
  const basePath = "ranks/";

  for (const entry of levelDefinitionLevelDefinition || []) {
    const filePath = String(entry.primaryIcon || "");
    if (!filePath) continue;

    const englishName = String(entry.nameEn || "");
    const parsed = parsePosix(filePath);
    const prefix = parsed.base.startsWith("sanma_") ? "3p " : "";
    mappings[filePath] = `${basePath}${prefix}${stripIllegalCharacters(englishName)}${parsed.ext}`;
  }

  return mappings;
}

function buildSkinMappings(itemDefinitionSkin, characterIdMappings) {
  const mappings = {};
  const basePath = "skins";

  for (const entry of itemDefinitionSkin || []) {
    const filePath = String(entry.path || "");
    if (!filePath) continue;

    const skinName = stripIllegalCharacters(entry.nameEn);
    const characterId = Number(entry.characterId || 0);
    const characterName = stripIllegalCharacters(
      characterIdMappings[characterId] || `Unknown_${characterId}`,
    );

    let newPath;
    if (characterId === 0) {
      const suffix = filePath.split("_").pop() || parsePosix(filePath).base;
      newPath = joinPosix(basePath, `${characterName}${suffix}`);
    } else if (Number(entry.type || 0) === 0) {
      newPath = joinPosix(basePath, characterName, "Default");
    } else {
      newPath = joinPosix(basePath, characterName, skinName);
    }
    mappings[filePath] = newPath;
  }

  return mappings;
}

function buildEmoteMappings(itemDefinitionCharacter) {
  const mappings = {};
  const basePath = "emotes/";
  for (const character of itemDefinitionCharacter || []) {
    if (!character.emo) continue;
    mappings[character.emo] = `${basePath}${stripIllegalCharacters(character.nameEn)}`;
  }
  return mappings;
}

export function buildMappingsFromTables(tables) {
  const itemDefinitionCharacter = tables.itemDefinitionCharacter || [];
  const characterIdMappings = buildCharacterIdMappings(itemDefinitionCharacter);
  const soundFolderMappings = buildCharacterSoundFolderMappings(itemDefinitionCharacter);

  return {
    ...buildVoiceMappings(tables.voiceSound, characterIdMappings, soundFolderMappings),
    ...buildTitleMappings(tables.itemDefinitionTitle),
    ...buildItemMappings(tables.itemDefinitionItem),
    ...buildItemMappings(tables.mallGoods),
    ...buildItemMappings(tables.desktopChest),
    ...buildItemMappings(tables.exchangeExchange),
    ...buildItemMappings(tables.exchangeSearchexchange),
    ...buildItemMappings(tables.mallMonthTicket),
    ...buildRankMappings(tables.levelDefinitionLevelDefinition),
    ...buildSkinMappings(tables.itemDefinitionSkin, characterIdMappings),
    ...buildEmoteMappings(itemDefinitionCharacter),
  };
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

function hasLocalizedPrefix(path) {
  return LOCALIZED_PREFIX_PATTERN.test(String(path || ""));
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
    GAME_SERVER_URLS[pathServerKey],
    GAME_SERVER_URLS[uiServerKey],
    GAME_SERVER_URLS.chs_t,
    GAME_SERVER_URLS.en,
    GAME_SERVER_URLS.kr,
    GAME_SERVER_URLS.jp,
  ];
  const uniqueBases = Array.from(new Set(orderedBases.filter(Boolean)));
  const cleanPrefix = String(prefix || "").replace(/^\/+/, "");
  return uniqueBases.map((base) => `${base}/${cleanPrefix}/${path}`);
}

export function makeInitials(name) {
  const text = String(name || "").trim();
  if (!text) return "?";
  return text;
}
