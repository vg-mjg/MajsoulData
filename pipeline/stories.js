// Stories domain transformer and loader. Scenario scripts live in the mirror under
// extracted/MyAssets/docs/spots/<content_path>.json alongside localized text
// dictionaries (<content_path>_<lang>.bytes) and a source _map.json fallback.
// Ingest turns those remote files into a committed, language-agnostic collection
// keyed by content_path so character pages render stories without browser fetches.

import { LANGUAGE_CODES, rowsOf, textMap } from "../lib/localization.js";
import { readOptionalJson, readOptionalText } from "./mirror.js";

const STORY_DIR = "extracted/MyAssets/docs/spots";

const STORY_LANGUAGE_PRIORITY = {
  en: ["en", "jp", "chs_t", "chs", "kr"],
  jp: ["jp", "en", "chs_t", "chs", "kr"],
  chs: ["chs", "chs_t", "en", "jp", "kr"],
  chs_t: ["chs_t", "chs", "en", "jp", "kr"],
  kr: ["kr", "en", "jp", "chs_t", "chs"],
};

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function str(value) {
  return value === null || value === undefined ? "" : String(value);
}

function normalizedContentPath(value) {
  return str(value).trim().replace(/^\/+|\/+$/g, "");
}

function decodeStoryText(value) {
  return str(value)
    .replace(/\/\/n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r");
}

export function parseStoryBytesMap(text) {
  const dictionary = new Map();
  for (const line of str(text).split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;

    const key = Number.parseInt(line.slice(0, separatorIndex).trim(), 10);
    if (!Number.isFinite(key) || key <= 0) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    }

    dictionary.set(key, decodeStoryText(value));
  }
  return dictionary;
}

export function parseStoryMapJson(mapJson) {
  const dictionary = new Map();
  const entries = Array.isArray(mapJson && mapJson.contents) ? mapJson.contents : [];
  for (const entry of entries) {
    const id = num(entry && entry.id);
    if (id <= 0) continue;
    dictionary.set(id, decodeStoryText(entry && entry.content));
  }
  return dictionary;
}

function resolveStoryText(dictionaries, textId, language) {
  const id = num(textId);
  if (id <= 0) return "";
  const priority = STORY_LANGUAGE_PRIORITY[language] || STORY_LANGUAGE_PRIORITY.en;
  for (const key of priority) {
    const value = dictionaries[key] && dictionaries[key].get(id);
    const text = str(value).trim();
    if (text) return text;
  }
  const mapValue = dictionaries.map && dictionaries.map.get(id);
  return str(mapValue).trim();
}

function resolvedTextMap(dictionaries, textId) {
  const out = {};
  for (const language of LANGUAGE_CODES) {
    out[language] = resolveStoryText(dictionaries, textId, language);
  }
  return out;
}

function parseItemAmountPairs(raw) {
  return str(raw)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [itemIdRaw, countRaw] = token.split("-");
      return { itemId: num(itemIdRaw), count: num(countRaw) };
    })
    .filter((entry) => entry.itemId > 0 && entry.count > 0);
}

function itemIcon(item) {
  if (!item || !item.assets) return "";
  return item.assets.icon || item.assets.loadingImage || item.assets.titleArt || "";
}

function fallbackItemName(itemId) {
  return { en: `#${itemId}`, jp: "", chs: "", chs_t: "", kr: "" };
}

function buildReward(rewardId, rewardById, itemById) {
  const id = num(rewardId);
  const row = rewardById.get(id);
  const rewardItems = parseItemAmountPairs(row && row.reward).map((entry) => {
    const item = itemById.get(entry.itemId);
    return {
      itemId: entry.itemId,
      count: entry.count,
      text: { name: item && item.text ? item.text.name : fallbackItemName(entry.itemId) },
      icon: itemIcon(item),
    };
  });
  return {
    id,
    type: num(row && row.type),
    text: row ? textMap(row, "content") : fallbackItemName(id),
    items: rewardItems,
  };
}

function buildOption(option, dictionaries) {
  const textId = num(option && option.content_id);
  const event = option && option._event ? option._event : {};
  const consume = option && option.consume ? option.consume : {};
  return {
    id: num(option && option.optionid),
    textId,
    text: resolvedTextMap(dictionaries, textId),
    eventType: num(event.eventtype),
    eventParam: num(event.param),
    consume: {
      itemId: num(consume.itemId),
      count: num(consume.count),
    },
  };
}

function buildScene(scene, dictionaries, rewardById, itemById) {
  const chatBlock = scene && scene.chatBlock ? scene.chatBlock : {};
  const textId = num(chatBlock.content_id);
  const speakerId = num(chatBlock.charname_id);
  const rewardIds = (Array.isArray(scene && scene.conditions) ? scene.conditions : [])
    .map((condition) => num(condition && condition.rewardId))
    .filter((rewardId) => rewardId > 0);

  return {
    id: num(scene && scene.sceneId),
    chatType: num(chatBlock.chatType),
    textId,
    text: resolvedTextMap(dictionaries, textId),
    speakerId,
    speaker: resolvedTextMap(dictionaries, speakerId),
    options: (Array.isArray(scene && scene.options) ? scene.options : []).map((option) =>
      buildOption(option, dictionaries),
    ),
    rewards: rewardIds.map((rewardId) => buildReward(rewardId, rewardById, itemById)),
    isEnd: Boolean(scene && scene.isEnd),
    hasChoose: Boolean(scene && scene.haveChoose),
  };
}

export function buildStoryEntry(contentPath, scenarioJson, dictionaries, rewardRows = [], items = []) {
  const rewardById = new Map(rowsOf(rewardRows).map((row) => [num(row.id), row]));
  const itemById = new Map((items || []).map((item) => [num(item.id), item]));
  const scenarioSpots = Array.isArray(scenarioJson && scenarioJson.Spots) ? scenarioJson.Spots : [];
  let sceneCount = 0;
  let chooseSceneCount = 0;
  let endSceneCount = 0;
  let entryCount = 0;

  const spots = scenarioSpots.map((spot) => {
    const scenes = (Array.isArray(spot && spot.SceneMap) ? spot.SceneMap : []).map((scene) => {
      sceneCount += 1;
      if (scene && scene.haveChoose) chooseSceneCount += 1;
      if (scene && scene.isEnd) endSceneCount += 1;
      const built = buildScene(scene, dictionaries, rewardById, itemById);
      if (
        Object.values(built.text).some(Boolean) ||
        Object.values(built.speaker).some(Boolean) ||
        built.options.length > 0 ||
        built.rewards.length > 0
      ) {
        entryCount += 1;
      }
      return built;
    });
    return { id: num(spot && spot.spotid), scenes };
  });

  return {
    contentPath: normalizedContentPath(contentPath),
    summary: {
      spotCount: spots.length,
      sceneCount,
      chooseSceneCount,
      endSceneCount,
      entryCount,
    },
    spots,
  };
}

async function loadDictionary(contentPath, language, warn, readTextFn = readOptionalText) {
  const relPath = `${STORY_DIR}/${contentPath}_${language}.bytes`;
  const text = await readTextFn(relPath);
  if (!text) return new Map();
  try {
    return parseStoryBytesMap(text);
  } catch (error) {
    warn(`Story dictionary ${contentPath}_${language}.bytes failed: ${error.message}`);
    return new Map();
  }
}

async function loadStory(contentPath, rewardRows, items, warn, readJsonFn = readOptionalJson, readTextFn = readOptionalText) {
  const jsonRelPath = `${STORY_DIR}/${contentPath}.json`;
  let scenarioJson = null;
  try {
    scenarioJson = await readJsonFn(jsonRelPath);
  } catch (error) {
    warn(`Story scenario ${contentPath}.json failed: ${error.message}`);
    return null;
  }
  if (!scenarioJson) {
    warn(`Story scenario ${contentPath}.json missing; skipped.`);
    return null;
  }

  const dictionaries = { map: new Map() };
  for (const language of LANGUAGE_CODES) {
    dictionaries[language] = await loadDictionary(contentPath, language, warn, readTextFn);
  }

  try {
    const mapJson = await readJsonFn(`${STORY_DIR}/${contentPath}_map.json`);
    dictionaries.map = mapJson ? parseStoryMapJson(mapJson) : new Map();
  } catch (error) {
    warn(`Story dictionary ${contentPath}_map.json failed: ${error.message}`);
  }

  return buildStoryEntry(contentPath, scenarioJson, dictionaries, rewardRows, items);
}

export async function loadStoriesCollection(contentPaths, rewardRows = [], items = [], options = {}) {
  const warn = typeof options.warn === "function" ? options.warn : (message) => console.warn(message);
  const readJsonFn = typeof options.readJson === "function" ? options.readJson : readOptionalJson;
  const readTextFn = typeof options.readText === "function" ? options.readText : readOptionalText;
  const paths = Array.from(new Set((contentPaths || []).map(normalizedContentPath).filter(Boolean))).sort();
  const stories = {};
  for (const contentPath of paths) {
    const story = await loadStory(contentPath, rewardRows, items, warn, readJsonFn, readTextFn);
    if (story) stories[contentPath] = story;
  }
  return stories;
}
