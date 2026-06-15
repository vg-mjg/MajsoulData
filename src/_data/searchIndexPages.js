import locales from "./locales.js";
import { readFileSync } from "node:fs";

const UI_LANGUAGE_PRIORITY = {
  en: ["en", "jp", "chs_t", "chs", "kr"],
  jp: ["jp", "en", "chs_t", "chs", "kr"],
  chs: ["chs", "chs_t", "en", "jp", "kr"],
  chs_t: ["chs_t", "chs", "en", "jp", "kr"],
  kr: ["kr", "en", "jp", "chs_t", "chs"],
};

const ASSET_FALLBACK = {
  en: ["en"],
  jp: ["jp", "en"],
  kr: ["kr", "en"],
  chs_t: ["cn", "en"],
  chs: ["chs", "cn", "en"],
};

function loadJsonFile(name, fallback) {
  try {
    const raw = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function localizeText(textMap, code) {
  if (!textMap || typeof textMap !== "object") return "";
  for (const key of UI_LANGUAGE_PRIORITY[code] || UI_LANGUAGE_PRIORITY.en) {
    const value = textMap[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized.length > 0) return normalized;
  }
  return "";
}

function resolveResourceUrl(value, code) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  for (const key of ASSET_FALLBACK[code] || ASSET_FALLBACK.en) {
    if (value[key]) return value[key];
  }
  return Object.values(value).find(Boolean) || "";
}

function firstResolvedAsset(values, code) {
  for (const value of values) {
    const resolved = resolveResourceUrl(value, code);
    if (resolved) return resolved;
  }
  return "";
}

function characterEntry(character, code) {
  const id = Number(character && character.id ? character.id : 0);
  const name = localizeText(character && character.text && character.text.name, code) || `#${id}`;
  const assets = (character && character.assets) || {};
  return {
    type: "character",
    id,
    name,
    route: `/${code}/characters/${id}/`,
    thumbnail: firstResolvedAsset([assets.smallhead, assets.bighead, assets.full], code),
  };
}

function itemEntry(item, code) {
  const id = Number(item && item.id ? item.id : 0);
  const name = localizeText(item && item.text && item.text.name, code) || `#${id}`;
  const assets = (item && item.assets) || {};
  return {
    type: "item",
    id,
    name,
    route: `/${code}/items/${id}/`,
    thumbnail: firstResolvedAsset(
      [
        assets.icon,
        assets.loadingImage,
        assets.tablecloth,
        assets.tile,
        assets.portraitFrame,
        assets.background,
        assets.titleArt,
      ],
      code,
    ),
  };
}

export default function () {
  const characters = loadJsonFile("characters.json", []);
  const items = loadJsonFile("items.json", []);
  return locales.map((locale) => ({
    ...locale,
    index: [
      ...characters.map((character) => characterEntry(character, locale.code)),
      ...items.map((item) => itemEntry(item, locale.code)),
    ],
  }));
}
