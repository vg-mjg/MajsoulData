import { characterDisplayName, localizedFieldValue, normalizeUiLanguage } from "../../utils.js";
import { loadCharacters } from "./characters-data.js";
import { loadItems } from "./items-data.js";
import { loadAchievementsData } from "./achievements-data.js";
import { loadActivitiesData } from "./activities-data.js";

const SEARCH_RESULT_LIMIT_DEFAULT = 10;
const MAX_QUERY_LENGTH = 120;

const searchIndexCacheByLanguage = new Map();

function stringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeText(value) {
  return stringValue(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).map((value) => stringValue(value).trim()).filter(Boolean)));
}

function allNameVariants(entry) {
  return uniqueValues([
    entry && entry.nameEn,
    entry && entry.nameJp,
    entry && entry.nameChs,
    entry && entry.nameChsT,
    entry && entry.nameKr,
  ]);
}

function itemDisplayName(item, language) {
  const localized = localizedFieldValue(item, "name", language);
  if (localized) return localized;
  return `#${Number(item && item.id ? item.id : 0)}`;
}

function buildSearchTokens(rawValues) {
  const exact = [];
  const compact = [];
  const seenExact = new Set();
  const seenCompact = new Set();

  for (const rawValue of rawValues || []) {
    const normalized = normalizeText(rawValue);
    if (normalized.length > 0 && !seenExact.has(normalized)) {
      seenExact.add(normalized);
      exact.push(normalized);
    }

    const normalizedCompact = compactText(rawValue);
    if (normalizedCompact.length > 0 && !seenCompact.has(normalizedCompact)) {
      seenCompact.add(normalizedCompact);
      compact.push(normalizedCompact);
    }
  }

  return {
    exact,
    compact,
  };
}

function mapCharacterEntry(character, language) {
  const id = Number(character && character.id ? character.id : 0);
  const title = characterDisplayName(character, language);
  const aliases = allNameVariants(character);
  const tokenSource = uniqueValues([title, ...aliases, String(id)]);
  const tokens = buildSearchTokens(tokenSource);

  return {
    key: `character:${id}`,
    type: "character",
    id,
    title,
    subtitle: "Character",
    route: `#/characters/${id}`,
    imageCandidates: Array.isArray(character && character.imageCandidates) ? character.imageCandidates : [],
    tokens,
  };
}

function mapItemEntry(item, language) {
  const id = Number(item && item.id ? item.id : 0);
  const title = itemDisplayName(item, language);
  const aliases = allNameVariants(item);
  const tokenSource = uniqueValues([title, ...aliases, String(id)]);
  const tokens = buildSearchTokens(tokenSource);
  const isCurrency = String(item && item.kind ? item.kind : "") === "currency";

  return {
    key: `item:${id}`,
    type: "item",
    id,
    title,
    subtitle: isCurrency ? "Currency" : "Item",
    route: `#/items/${id}`,
    imageCandidates: Array.isArray(item && item.imageCandidates) ? item.imageCandidates : [],
    tokens,
  };
}

function mapAchievementEntry(achievement) {
  const id = Number(achievement && achievement.id ? achievement.id : 0);
  const title = String((achievement && achievement.name) || `#${id}`);
  const groupName = String((achievement && achievement.groupName) || "").trim();
  const description = String((achievement && achievement.description) || "").trim();
  const tokenSource = uniqueValues([title, groupName, description, String(id)]);
  const tokens = buildSearchTokens(tokenSource);

  return {
    key: `achievement:${id}`,
    type: "achievement",
    id,
    title,
    subtitle: groupName ? `Achievement · ${groupName}` : "Achievement",
    route: "#/achievements",
    imageCandidates: [],
    tokens,
  };
}

function mapActivityEntry(activity) {
  const id = Number(activity && activity.id ? activity.id : 0);
  const title = String((activity && activity.name) || `Activity #${id}`);
  const type = String((activity && activity.type) || "").trim();
  const tokenSource = uniqueValues([title, type, String(id)]);
  const tokens = buildSearchTokens(tokenSource);

  return {
    key: `activity:${id}`,
    type: "activity",
    id,
    title,
    subtitle: type ? `Activity · ${type}` : "Activity",
    route: "#/activities",
    imageCandidates: Array.isArray(activity && activity.bannerCandidates) ? activity.bannerCandidates : [],
    tokens,
  };
}

async function buildSearchIndex(language) {
  const [characters, items, achievementsData, activitiesData] = await Promise.all([
    loadCharacters(language),
    loadItems(language),
    loadAchievementsData(language),
    loadActivitiesData(language),
  ]);

  const entries = [];
  for (const character of characters || []) {
    entries.push(mapCharacterEntry(character, language));
  }
  for (const item of items || []) {
    entries.push(mapItemEntry(item, language));
  }
  for (const achievement of (achievementsData && achievementsData.achievements) || []) {
    entries.push(mapAchievementEntry(achievement));
  }
  for (const activity of (activitiesData && activitiesData.activities) || []) {
    entries.push(mapActivityEntry(activity));
  }

  return entries;
}

async function loadSearchIndex(language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  if (searchIndexCacheByLanguage.has(normalizedLanguage)) {
    return searchIndexCacheByLanguage.get(normalizedLanguage);
  }

  const index = await buildSearchIndex(normalizedLanguage);
  searchIndexCacheByLanguage.set(normalizedLanguage, index);
  return index;
}

function tokenScore(tokens, queryNormalized, queryCompact, titleNormalized, titleCompact, idText) {
  let score = 0;

  if (idText === queryNormalized) {
    score = Math.max(score, 160);
  } else if (idText.startsWith(queryNormalized)) {
    score = Math.max(score, 120);
  }

  if (titleNormalized === queryNormalized) {
    score = Math.max(score, 150);
  } else if (titleNormalized.startsWith(queryNormalized)) {
    score = Math.max(score, 120);
  } else if (titleNormalized.includes(queryNormalized)) {
    score = Math.max(score, 92);
  }

  if (queryCompact.length > 0) {
    if (titleCompact === queryCompact) {
      score = Math.max(score, 145);
    } else if (titleCompact.startsWith(queryCompact)) {
      score = Math.max(score, 110);
    } else if (titleCompact.includes(queryCompact)) {
      score = Math.max(score, 84);
    }
  }

  for (const value of tokens.exact || []) {
    if (value === queryNormalized) {
      score = Math.max(score, 115);
    } else if (value.startsWith(queryNormalized)) {
      score = Math.max(score, 94);
    } else if (value.includes(queryNormalized)) {
      score = Math.max(score, 72);
    }
  }

  if (queryCompact.length > 0) {
    for (const value of tokens.compact || []) {
      if (value === queryCompact) {
        score = Math.max(score, 108);
      } else if (value.startsWith(queryCompact)) {
        score = Math.max(score, 88);
      } else if (value.includes(queryCompact)) {
        score = Math.max(score, 68);
      }
    }
  }

  return score;
}

export async function searchGlobalEntries(query, language, options = {}) {
  const rawQuery = stringValue(query).slice(0, MAX_QUERY_LENGTH);
  const queryNormalized = normalizeText(rawQuery);
  const queryCompact = compactText(rawQuery);
  if (!queryNormalized) return [];

  const limit = Math.max(1, Number(options.limit || SEARCH_RESULT_LIMIT_DEFAULT));
  const index = await loadSearchIndex(language);
  const matches = [];

  for (const entry of index) {
    const titleNormalized = normalizeText(entry.title);
    const titleCompact = compactText(entry.title);
    const idText = String(Number(entry.id || 0));

    const score = tokenScore(
      entry.tokens || { exact: [], compact: [] },
      queryNormalized,
      queryCompact,
      titleNormalized,
      titleCompact,
      idText,
    );
    if (score <= 0) continue;
    matches.push({ entry, score });
  }

  matches.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.entry.type !== right.entry.type) return left.entry.type.localeCompare(right.entry.type);
    const leftTitle = stringValue(left.entry.title);
    const rightTitle = stringValue(right.entry.title);
    const titleCompare = leftTitle.localeCompare(rightTitle);
    if (titleCompare !== 0) return titleCompare;
    return Number(left.entry.id || 0) - Number(right.entry.id || 0);
  });

  return matches.slice(0, limit).map((item) => item.entry);
}
