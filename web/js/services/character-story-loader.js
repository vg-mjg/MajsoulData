import { assetUrlCandidates, normalizeUiLanguage } from "../../utils.js";
import { loadCharactersRepository } from "./characters-repository.js";

const storyContentCache = new Map();
const blockedOrigins = new Set();

const LANGUAGE_SUFFIX = {
  en: "en",
  jp: "jp",
  kr: "kr",
  chs: "chs",
  chs_t: "chs_t",
};

const LANGUAGE_SUFFIX_FALLBACKS = {
  en: ["en", "chs_t", "jp", "kr", "chs"],
  jp: ["jp", "en", "chs_t", "chs", "kr"],
  kr: ["kr", "en", "jp", "chs_t", "chs"],
  chs: ["chs", "chs_t", "en", "jp", "kr"],
  chs_t: ["chs_t", "chs", "en", "jp", "kr"],
};

function stringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function numberValue(value) {
  return Number(value || 0);
}

function manifestCandidate(path, resourceManifest) {
  const entry = resourceManifest[path];
  if (!entry || !entry.prefix) return null;
  return {
    path,
    prefix: stringValue(entry.prefix),
  };
}

async function fetchTextFromManifestCandidate(candidate) {
  if (!candidate) return null;

  for (const url of assetUrlCandidates(candidate.path, candidate.prefix)) {
    let origin = "";
    try {
      origin = new URL(url).origin;
    } catch {
      continue;
    }

    if (blockedOrigins.has(origin)) {
      continue;
    }

    try {
      const response = await fetch(url, { cache: "force-cache", mode: "cors" });
      if (!response.ok) {
        continue;
      }
      return await response.text();
    } catch (error) {
      if (error instanceof TypeError) {
        blockedOrigins.add(origin);
      }
    }
  }

  return null;
}

async function fetchJsonFromManifestCandidate(candidate) {
  const text = await fetchTextFromManifestCandidate(candidate);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseStoryBytesMap(text) {
  const dictionary = new Map();
  const lines = stringValue(text).split(/\r?\n/);

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;

    const keyText = line.slice(0, separatorIndex).trim();
    const key = Number.parseInt(keyText, 10);
    if (!Number.isFinite(key) || key <= 0) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (value.startsWith("\"") && value.endsWith("\"")) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    }

    const normalizedValue = stringValue(value)
      .replace(/\/\/n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r");
    dictionary.set(key, normalizedValue);
  }

  return dictionary;
}

function parseStoryMapJson(mapJson) {
  const dictionary = new Map();
  const entries = Array.isArray(mapJson && mapJson.contents) ? mapJson.contents : [];
  for (const entry of entries) {
    const id = numberValue(entry && entry.id);
    if (id <= 0) continue;
    dictionary.set(id, stringValue(entry && entry.content));
  }
  return dictionary;
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function buildBytesPathCandidates(contentPath, language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  const preferredSuffix = LANGUAGE_SUFFIX[normalizedLanguage] || LANGUAGE_SUFFIX.en;
  const fallbacks = LANGUAGE_SUFFIX_FALLBACKS[normalizedLanguage] || LANGUAGE_SUFFIX_FALLBACKS.en;
  const orderedSuffixes = uniqueValues([preferredSuffix, ...fallbacks]);
  return orderedSuffixes.map((suffix) => `docs/spot/${contentPath}_${suffix}.bytes`);
}

function resolveStoryText(dictionary, textId) {
  const normalizedTextId = numberValue(textId);
  if (normalizedTextId <= 0) return "";
  return stringValue(dictionary.get(normalizedTextId));
}

function buildScenarioEntries(scenarioJson, dictionary) {
  const spots = Array.isArray(scenarioJson && scenarioJson.Spots) ? scenarioJson.Spots : [];
  const entries = [];
  let sceneCount = 0;
  let chooseSceneCount = 0;
  let endSceneCount = 0;

  for (const spot of spots) {
    const spotId = numberValue(spot && spot.spotid);
    const scenes = Array.isArray(spot && spot.SceneMap) ? spot.SceneMap : [];

    for (const scene of scenes) {
      sceneCount += 1;
      if (scene && scene.haveChoose) chooseSceneCount += 1;
      if (scene && scene.isEnd) endSceneCount += 1;

      const sceneId = numberValue(scene && scene.sceneId);
      const chatType = numberValue(scene && scene.chatBlock && scene.chatBlock.chatType);
      const contentId = numberValue(scene && scene.chatBlock && scene.chatBlock.content_id);
      const speakerId = numberValue(scene && scene.chatBlock && scene.chatBlock.charname_id);
      const text = resolveStoryText(dictionary, contentId);
      const speaker = resolveStoryText(dictionary, speakerId);

      const options = (Array.isArray(scene && scene.options) ? scene.options : [])
        .map((option) => ({
          id: numberValue(option && option.optionid),
          textId: numberValue(option && option.content_id),
          text: resolveStoryText(dictionary, option && option.content_id),
          eventType: numberValue(option && option._event && option._event.eventtype),
          eventParam: numberValue(option && option._event && option._event.param),
          consumeItemId: numberValue(option && option.consume && option.consume.itemId),
          consumeCount: numberValue(option && option.consume && option.consume.count),
        }));

      const conditionRewards = (Array.isArray(scene && scene.conditions) ? scene.conditions : [])
        .map((condition) => numberValue(condition && condition.rewardId))
        .filter((rewardId) => rewardId > 0);

      if (text || speaker || options.length > 0 || conditionRewards.length > 0) {
        entries.push({
          spotId,
          sceneId,
          chatType,
          textId: contentId,
          speakerId,
          speaker,
          text,
          options,
          conditionRewards,
          isEnd: Boolean(scene && scene.isEnd),
        });
      }
    }
  }

  return {
    entries,
    summary: {
      spotCount: spots.length,
      sceneCount,
      chooseSceneCount,
      endSceneCount,
      entryCount: entries.length,
    },
  };
}

export async function loadCharacterStoryContent(contentPath, language) {
  const normalizedPath = stringValue(contentPath).trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedPath) {
    return null;
  }

  const normalizedLanguage = normalizeUiLanguage(language);
  const cacheKey = `${normalizedPath}:${normalizedLanguage}`;
  if (storyContentCache.has(cacheKey)) {
    return storyContentCache.get(cacheKey);
  }

  const loadPromise = (async () => {
    const repository = await loadCharactersRepository();
    const resourceManifest = repository.resourceManifest || {};

    const scenarioPath = `docs/spot/${normalizedPath}.json`;
    const mapPath = `docs/spot/${normalizedPath}_map.json`;
    const bytesPaths = buildBytesPathCandidates(normalizedPath, normalizedLanguage);

    const scenarioJson = await fetchJsonFromManifestCandidate(
      manifestCandidate(scenarioPath, resourceManifest),
    );
    const mapJson = await fetchJsonFromManifestCandidate(
      manifestCandidate(mapPath, resourceManifest),
    );

    let bytesDictionary = null;
    for (const bytesPath of bytesPaths) {
      const bytesText = await fetchTextFromManifestCandidate(
        manifestCandidate(bytesPath, resourceManifest),
      );
      if (!bytesText) continue;
      const parsedDictionary = parseStoryBytesMap(bytesText);
      if (parsedDictionary.size > 0) {
        bytesDictionary = parsedDictionary;
        break;
      }
    }

    const mapDictionary = mapJson ? parseStoryMapJson(mapJson) : new Map();
    const dictionary = bytesDictionary && bytesDictionary.size > 0
      ? bytesDictionary
      : mapDictionary;

    const scenario = buildScenarioEntries(scenarioJson, dictionary);

    return {
      path: normalizedPath,
      language: normalizedLanguage,
      hasScenarioJson: Boolean(scenarioJson),
      hasMapJson: Boolean(mapJson),
      hasBytesMap: Boolean(bytesDictionary && bytesDictionary.size > 0),
      textEntryCount: dictionary.size,
      summary: scenario.summary,
      entries: scenario.entries,
    };
  })();

  storyContentCache.set(cacheKey, loadPromise);
  return loadPromise;
}
