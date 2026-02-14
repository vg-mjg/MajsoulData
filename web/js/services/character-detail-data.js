import {
  characterBigheadCandidatePaths,
  characterDisplayName,
  localizedFieldValue,
  localizedAssetPathCandidates,
  localizedAssetPrefixes,
  normalizeUiLanguage,
  stripLocalizedPrefix,
} from "../../utils.js";
import { itemIconCandidates } from "./item-utils.js";
import { loadCharactersRepository } from "./characters-repository.js";

const LOCALIZED_PREFIX_PATTERN = /^(en|jp|chs_t|kr|en_kr)\//;
const EMOJI_STEM_PATTERN = /^(\d+)(?:_[A-Za-z]+)?$/;
const EMOJI_LEGACY_STEM_PATTERN = /^l_(\d+)$/i;
const SPINE_SKELETON_FILENAMES = [
  "spine.skel.txt",
  "spine.skel",
  "spine.json",
  "spine_0.skel.txt",
  "spine_0.skel",
  "spine_0.json",
  "spine_1.skel.txt",
  "spine_1.skel",
  "spine_1.json",
  "spine_2.skel.txt",
  "spine_2.skel",
  "spine_2.json",
];
const EMOJI_LOCALE_PRIORITY = {
  en: ["EN", "", "CHST", "CH", "KR", "JP"],
  jp: ["JP", "", "EN", "CHST", "CH", "KR"],
  kr: ["KR", "", "EN", "CHST", "CH", "JP"],
  chs: ["CH", "CHST", "", "EN", "KR", "JP"],
  chs_t: ["CHST", "CH", "", "EN", "KR", "JP"],
};
const EMOJI_FOLDER_BY_CODE = {
  CH: "CH",
  CHST: "CHST",
  EN: "EN",
  JP: "JP",
  KR: "KR",
};
const emojiPathIndexCache = new WeakMap();

function numberValue(value) {
  return Number(value || 0);
}

function stringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseMaterialSegment(segment) {
  const tokens = stringValue(segment).split(",").map((token) => token.trim()).filter(Boolean);
  return tokens.map((token) => {
    const [itemIdRaw, countRaw] = token.split("-");
    return {
      itemId: numberValue(itemIdRaw),
      count: numberValue(countRaw),
      raw: token,
    };
  });
}

function parseStarMaterials(raw) {
  const text = stringValue(raw).trim();
  if (!text) return [];

  const stages = text.split("|").map((segment, index) => ({
    stage: index + 1,
    materials: parseMaterialSegment(segment),
  }));

  return stages.filter((stage) => stage.materials.length > 0);
}

function parseContractItems(raw) {
  const text = stringValue(raw).trim();
  if (!text) return [];

  return text
    .split(",")
    .map((token) => stringValue(token).trim())
    .filter(Boolean)
    .map((token) => {
      const normalizedToken = token.includes("|")
        ? stringValue(token.split("|").pop()).trim()
        : token;
      const [itemIdRaw, countRaw] = normalizedToken.split("-");
      return {
        itemId: numberValue(itemIdRaw),
        count: numberValue(countRaw),
        raw: token,
        normalized: normalizedToken,
      };
    })
    .filter((item) => item.itemId > 0 && item.count > 0);
}

function normalizeEmojiBasePath(emoBasePath) {
  return stripLocalizedPrefix(
    stringValue(emoBasePath)
      .trim()
      .replace(/^\/+|\/+$/g, ""),
  );
}

function addEmojiIndexPath(index, basePath, subId, path) {
  if (!basePath || subId < 0 || !path) return;
  if (!index.has(basePath)) {
    index.set(basePath, new Map());
  }
  const bySubId = index.get(basePath);
  if (!bySubId.has(subId)) {
    bySubId.set(subId, new Set());
  }
  bySubId.get(subId).add(path);
}

function buildEmojiPathIndex(resourceManifest) {
  const index = new Map();
  for (const path of Object.keys(resourceManifest || {})) {
    const strippedPath = stripLocalizedPrefix(stringValue(path));
    const match = strippedPath.match(/^(.*?extendRes\/emo\/[^/]+)(?:\/[^/]+)?\/([^/]+)\.png$/i);
    if (!match) continue;

    const normalizedBasePath = stringValue(match[1]).replace(/\/+$/, "");
    const fileStem = stringValue(match[2]);
    const subIdMatch = fileStem.match(EMOJI_STEM_PATTERN) || fileStem.match(EMOJI_LEGACY_STEM_PATTERN);
    if (!subIdMatch) continue;

    const subId = numberValue(subIdMatch[1]);
    addEmojiIndexPath(index, normalizedBasePath, subId, path);

    const extendResIndex = normalizedBasePath.indexOf("extendRes/emo/");
    if (extendResIndex > 0) {
      addEmojiIndexPath(index, normalizedBasePath.slice(extendResIndex), subId, path);
    }
  }
  return index;
}

function getEmojiPathIndex(resourceManifest) {
  if (!resourceManifest || typeof resourceManifest !== "object") {
    return new Map();
  }
  if (emojiPathIndexCache.has(resourceManifest)) {
    return emojiPathIndexCache.get(resourceManifest);
  }
  const index = buildEmojiPathIndex(resourceManifest);
  emojiPathIndexCache.set(resourceManifest, index);
  return index;
}

function emojiPathsFromManifest(emoBasePath, subId, resourceManifest, language) {
  const normalizedBasePath = normalizeEmojiBasePath(emoBasePath);
  if (!normalizedBasePath) return [];

  const bySubId = getEmojiPathIndex(resourceManifest).get(normalizedBasePath);
  if (!bySubId) return [];
  const values = bySubId.get(numberValue(subId));
  if (!values) return [];
  return sortEmojiPathsByLanguage(Array.from(values), language);
}

function emojiSubIdsFromManifest(emoBasePath, resourceManifest) {
  const normalizedBasePath = normalizeEmojiBasePath(emoBasePath);
  if (!normalizedBasePath) return [];
  const bySubId = getEmojiPathIndex(resourceManifest).get(normalizedBasePath);
  if (!bySubId) return [];
  return Array.from(bySubId.keys()).sort((a, b) => a - b);
}

function candidatePathsForSkinFile(basePath, filename, language) {
  if (!basePath) return [];
  const normalizedBasePath = stringValue(basePath).replace(/\/+$/, "");
  return localizedAssetPathCandidates(`${normalizedBasePath}/${filename}`, language);
}

function candidatePathsForEmoji(emoBasePath, subId, language) {
  if (!emoBasePath) return [];

  const normalizedBasePath = stringValue(emoBasePath).replace(/\/+$/, "");
  const paths = new Set();
  const normalizedSubId = numberValue(subId);
  const localePriority = EMOJI_LOCALE_PRIORITY[normalizeUiLanguage(language)] || EMOJI_LOCALE_PRIORITY.en;

  const basePaths = LOCALIZED_PREFIX_PATTERN.test(normalizedBasePath)
    ? [normalizedBasePath]
    : localizedAssetPrefixes(language).map((prefix) => (
      prefix ? `${prefix}${normalizedBasePath}` : normalizedBasePath
    ));

  for (const basePath of basePaths) {
    for (const localeCode of localePriority) {
      if (!localeCode) {
        paths.add(`${basePath}/${normalizedSubId}.png`);
        continue;
      }

      const folderName = EMOJI_FOLDER_BY_CODE[localeCode];
      if (folderName) {
        paths.add(`${basePath}/${folderName}/${normalizedSubId}.png`);
      }
      paths.add(`${basePath}/${normalizedSubId}_${localeCode}.png`);
    }
  }

  return Array.from(paths);
}

function emojiLocaleCodeFromPath(path) {
  const normalizedPath = stringValue(path).trim();
  if (!normalizedPath) return "";

  const suffixMatch = normalizedPath.match(/_(EN|JP|KR|CHST|CH)\.png$/i);
  if (suffixMatch) {
    return stringValue(suffixMatch[1]).toUpperCase();
  }

  const folderMatch = normalizedPath.match(/\/(EN|JP|KR|CHST|CH)\/\d+\.png$/i);
  if (folderMatch) {
    return stringValue(folderMatch[1]).toUpperCase();
  }

  if (/^en\//i.test(normalizedPath)) return "EN";
  if (/^jp\//i.test(normalizedPath)) return "JP";
  if (/^(kr|en_kr)\//i.test(normalizedPath)) return "KR";
  if (/^chs_t\//i.test(normalizedPath)) return "CHST";
  return "";
}

function sortEmojiPathsByLanguage(paths, language) {
  const localePriority = EMOJI_LOCALE_PRIORITY[normalizeUiLanguage(language)] || EMOJI_LOCALE_PRIORITY.en;
  const priorityMap = new Map(localePriority.map((localeCode, index) => [localeCode, index]));
  const fallbackRank = localePriority.length + 1;

  return (paths || []).slice().sort((left, right) => {
    const leftCode = emojiLocaleCodeFromPath(left);
    const rightCode = emojiLocaleCodeFromPath(right);
    const leftRank = priorityMap.has(leftCode) ? priorityMap.get(leftCode) : fallbackRank;
    const rightRank = priorityMap.has(rightCode) ? priorityMap.get(rightCode) : fallbackRank;

    if (leftRank !== rightRank) return leftRank - rightRank;
    return String(left).localeCompare(String(right));
  });
}

function appendMp3Candidate(paths, rawPath) {
  const normalized = stringValue(rawPath).trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) return;

  if (normalized.toLowerCase().endsWith(".mp3")) {
    paths.add(normalized);
    return;
  }
  paths.add(`${normalized}.mp3`);
}

function candidatePathsForVoiceAudio(voicePath, soundFolder, language) {
  const raw = stringValue(voicePath).trim().replace(/^\/+|\/+$/g, "");
  if (!raw) return [];

  const paths = new Set();
  const rawNoExt = raw.replace(/\.mp3$/i, "");
  const trimmedFirstSegment = rawNoExt.includes("/")
    ? rawNoExt.split("/").slice(1).join("/")
    : "";

  if (rawNoExt.startsWith("audio/")) {
    appendMp3Candidate(paths, rawNoExt);
    return expandLocalizedAudioPaths(paths, language);
  }

  appendMp3Candidate(paths, rawNoExt);
  appendMp3Candidate(paths, `audio/${rawNoExt}`);
  appendMp3Candidate(paths, `audio/sound/${rawNoExt}`);

  const normalizedSoundFolder = stringValue(soundFolder).trim().replace(/^\/+|\/+$/g, "");
  if (normalizedSoundFolder) {
    appendMp3Candidate(paths, `audio/sound/${normalizedSoundFolder}/${rawNoExt}`);
    if (trimmedFirstSegment) {
      appendMp3Candidate(paths, `audio/sound/${normalizedSoundFolder}/${trimmedFirstSegment}`);
    }
  }

  return expandLocalizedAudioPaths(paths, language);
}

function expandLocalizedAudioPaths(paths, language) {
  const expanded = new Set();
  for (const path of paths || []) {
    const normalized = stringValue(path).trim().replace(/^\/+/, "");
    if (!normalized) continue;
    if (LOCALIZED_PREFIX_PATTERN.test(normalized)) {
      expanded.add(normalized);
      continue;
    }
    for (const prefix of localizedAssetPrefixes(language)) {
      expanded.add(prefix ? `${prefix}${normalized}` : normalized);
    }
  }
  return Array.from(expanded);
}

function assetCandidatesFromPaths(paths, resourceManifest) {
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

function buildSkinAssetCandidates(skinPath, resourceManifest, filename, language) {
  const paths = candidatePathsForSkinFile(skinPath, filename, language);
  return assetCandidatesFromPaths(paths, resourceManifest);
}

function atlasCandidatesForSkeletonFile(skeletonFileName) {
  if (skeletonFileName.endsWith(".skel.txt")) {
    return [skeletonFileName.replace(".skel.txt", ".atlas.txt")];
  }
  if (skeletonFileName.endsWith(".skel")) {
    return [
      skeletonFileName.replace(".skel", ".atlas"),
      skeletonFileName.replace(".skel", ".atlas.txt"),
    ];
  }
  if (skeletonFileName.endsWith(".json")) {
    return [
      skeletonFileName.replace(".json", ".atlas"),
      skeletonFileName.replace(".json", ".atlas.txt"),
    ];
  }
  return [];
}

function buildSpineAssetPairs(skinPath, resourceManifest, language) {
  const pairs = [];
  const seen = new Set();

  for (const skeletonFileName of SPINE_SKELETON_FILENAMES) {
    const skeletonPaths = candidatePathsForSkinFile(
      skinPath,
      `spine/${skeletonFileName}`,
      language,
    );
    if (!Array.isArray(skeletonPaths) || skeletonPaths.length === 0) continue;

    for (const skeletonPath of skeletonPaths) {
      const skeletonEntry = resourceManifest[skeletonPath];
      if (!skeletonEntry || !skeletonEntry.prefix) continue;

      const basePath = skeletonPath.slice(0, -skeletonFileName.length);
      const atlasPaths = atlasCandidatesForSkeletonFile(skeletonFileName)
        .map((atlasFileName) => `${basePath}${atlasFileName}`)
        .filter((candidatePath) => {
          const candidateEntry = resourceManifest[candidatePath];
          return candidateEntry && candidateEntry.prefix;
        });
      if (atlasPaths.length === 0) continue;

      for (const atlasPath of atlasPaths) {
        const atlasEntry = resourceManifest[atlasPath];
        if (!atlasEntry || !atlasEntry.prefix) continue;

        const key = `${skeletonEntry.prefix}|${skeletonPath}|${atlasEntry.prefix}|${atlasPath}`;
        if (seen.has(key)) continue;
        seen.add(key);

        pairs.push({
          skeleton: {
            path: skeletonPath,
            prefix: stringValue(skeletonEntry.prefix),
          },
          atlas: {
            path: atlasPath,
            prefix: stringValue(atlasEntry.prefix),
          },
        });
      }
    }
  }

  return pairs;
}

function characterCategory(character) {
  const collaboration = numberValue(character.collaboration);
  const limited = numberValue(character.limited);

  if (collaboration > 0) return "Collaboration";
  if (limited > 0) return "Limited";
  return "Standard";
}

function localizedCharacterInfo(character, language) {
  return {
    name: characterDisplayName(character, language),
    description: localizedFieldValue(character, "desc", language),
    stature: localizedFieldValue(character, "descStature", language),
    birth: localizedFieldValue(character, "descBirth", language),
    age: localizedFieldValue(character, "descAge", language),
    bloodType: localizedFieldValue(character, "descBloodtype", language),
    cv: localizedFieldValue(character, "descCv", language),
    hobby: localizedFieldValue(character, "descHobby", language),
  };
}

function localizedSkinInfo(skin, language) {
  return {
    name: localizedFieldValue(skin, "name", language),
    description: localizedFieldValue(skin, "desc", language),
    lockTips: localizedFieldValue(skin, "lockTips", language),
  };
}

function localizedEmojiInfo(emoji, language) {
  return {
    unlockDescription: localizedFieldValue(emoji, "unlockDesc", language),
    afterUnlockDescription: localizedFieldValue(emoji, "afterUnlockDesc", language),
  };
}

function localizedVoiceInfo(voice, language) {
  return {
    name: localizedFieldValue(voice, "name", language),
    words: localizedFieldValue(voice, "words", language),
  };
}

function localizedLevelInfo(levelEntry, language) {
  return {
    unlockDescription: localizedFieldValue(levelEntry, "unlockDesc", language),
  };
}

function localizedSpotSkinInfo(spotSkin, language) {
  return {
    name: localizedFieldValue(spotSkin, "name", language),
    description: localizedFieldValue(spotSkin, "desc", language),
    lockTips: localizedFieldValue(spotSkin, "lockTips", language),
  };
}

function resolveItemName(repository, itemId, language) {
  const normalizedItemId = numberValue(itemId);
  if (normalizedItemId <= 0) return "";

  const item = repository.itemById.get(normalizedItemId);
  if (!item) return `#${normalizedItemId}`;

  const localized = localizedFieldValue(item, "name", language);
  if (localized) return localized;
  return `#${normalizedItemId}`;
}

function resolveItemDescriptor(repository, itemId, count, language) {
  const id = numberValue(itemId);
  const amount = numberValue(count);
  const name = resolveItemName(repository, id, language);

  if (id <= 0 || amount <= 0) {
    return {
      id,
      count: amount,
      name,
      summary: "-",
    };
  }

  return {
    id,
    count: amount,
    name,
    summary: `${name} (${id}) x${amount}`,
  };
}

function enrichMaterialsWithItemNames(materials, repository, language) {
  return (materials || []).map((material) => {
    const itemName = resolveItemName(repository, material.itemId, language);
    const itemEntry = repository.itemById.get(material.itemId);
    const imageCandidates = itemIconCandidates(itemEntry, repository.resourceManifest, language);
    return {
      ...material,
      itemName,
      imageCandidates,
      summary: itemName ? `${itemName} (${material.itemId}) x${material.count}` : `${material.itemId} x${material.count}`,
    };
  });
}

function mapSkinDetail(skin, language, repository) {
  const localized = localizedSkinInfo(skin, language);
  const skinId = numberValue(skin.id);
  const extra = repository.skinExtraBySkinId.get(skinId) || null;
  const cutins = repository.cutinBySkinId.get(skinId) || [];
  const exchangeItem = resolveItemDescriptor(
    repository,
    numberValue(skin.exchangeItemId),
    numberValue(skin.exchangeItemNum),
    language,
  );

  return {
    id: skinId,
    type: numberValue(skin.type),
    spineType: numberValue(skin.spineType),
    characterId: numberValue(skin.characterId),
    path: stringValue(skin.path),
    name: localized.name || `#${skinId}`,
    description: localized.description,
    lockTips: localized.lockTips,
    exchangeItemId: exchangeItem.id,
    exchangeItemNum: exchangeItem.count,
    exchangeItemName: exchangeItem.name,
    exchangeSummary: exchangeItem.summary,
    direction: numberValue(skin.direction),
    noReverse: numberValue(skin.noReverse),
    lockReverse: numberValue(skin.lockReverse),
    effectiveTime: stringValue(skin.effectiveTime),
    spotScale: stringValue(skin.spotScale),
    previewBighead: buildSkinAssetCandidates(skin.path, repository.resourceManifest, "bighead.png", language),
    previewSmallhead: buildSkinAssetCandidates(skin.path, repository.resourceManifest, "smallhead.png", language),
    previewHalf: buildSkinAssetCandidates(skin.path, repository.resourceManifest, "half.png", language),
    previewFull: buildSkinAssetCandidates(skin.path, repository.resourceManifest, "full.png", language),
    previewWaitingRoom: buildSkinAssetCandidates(skin.path, repository.resourceManifest, "waitingroom.png", language),
    spineAssetPairs: buildSpineAssetPairs(skin.path, repository.resourceManifest, language),
    extra: extra
      ? {
          effects: Array.isArray(extra.effects) ? extra.effects.filter(Boolean) : [],
          spineLayers: numberValue(extra.spineLayers),
          audioIdle: stringValue(extra.audioIdle),
          audioGreeting: stringValue(extra.audioGreeting),
          audioClick: stringValue(extra.audioClick),
          audioClick2: stringValue(extra.audioClick2),
          audioCelebrate: stringValue(extra.audioCelebrate),
          audioCelebrateIdle: stringValue(extra.audioCelebrateIdle),
          celebrateDelay: numberValue(extra.celebrateDelay),
        }
      : null,
    cutins: cutins.map((cutin) => ({
      skinId: numberValue(cutin.skinid),
      cutinName: stringValue(cutin.cutinName),
      effect: stringValue(cutin.effect),
      atlas: stringValue(cutin.atlas),
      type: numberValue(cutin.type),
      charX: numberValue(cutin.charX),
      charY: numberValue(cutin.charY),
      charWidth: numberValue(cutin.charWidth),
      charHeight: numberValue(cutin.charHeight),
    })),
  };
}

function mapEmojiDetail(emoji, language, repository, emoBasePath) {
  const localized = localizedEmojiInfo(emoji, language);
  const unlockParamRaw = Array.isArray(emoji.unlockParam) ? emoji.unlockParam : [];
  const unlockParam = unlockParamRaw.map((value) => {
    const raw = stringValue(value);
    const numeric = Number.parseInt(raw, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return { raw, itemName: "" };
    }
    return {
      raw,
      itemName: resolveItemName(repository, numeric, language),
    };
  });
  const unlockParamText = unlockParam.map((entry) => (
    entry.itemName ? `${entry.raw} (${entry.itemName})` : entry.raw
  )).join(", ");
  const subId = numberValue(emoji.subId);
  const generatedPaths = candidatePathsForEmoji(emoBasePath, subId, language);
  const manifestPaths = emojiPathsFromManifest(emoBasePath, subId, repository.resourceManifest, language);
  const candidatePaths = Array.from(new Set([...generatedPaths, ...manifestPaths]));
  const imageCandidates = assetCandidatesFromPaths(
    candidatePaths,
    repository.resourceManifest,
  );

  return {
    subId,
    type: numberValue(emoji.type),
    unlockType: numberValue(emoji.unlockType),
    unlockParam: unlockParamRaw,
    unlockParamText,
    unlockDescription: localized.unlockDescription,
    afterUnlockDescription: localized.afterUnlockDescription,
    view: stringValue(emoji.view),
    audio: numberValue(emoji.audio),
    imageCandidates,
  };
}

function mapVoiceDetail(voice, language, repository, soundFolder) {
  const localized = localizedVoiceInfo(voice, language);
  const audioCandidates = assetCandidatesFromPaths(
    candidatePathsForVoiceAudio(voice.path, soundFolder, language),
    repository.resourceManifest,
  );
  return {
    type: stringValue(voice.type),
    category: numberValue(voice.category),
    name: localized.name,
    words: localized.words,
    levelLimit: numberValue(voice.levelLimit),
    bondLimit: numberValue(voice.bondLimit),
    timeLength: numberValue(voice.timeLength),
    path: stringValue(voice.path),
    hide: numberValue(voice.hide),
    dateLimit: stringValue(voice.dateLimit),
    audioCandidates,
  };
}

function mapSpotVoiceDetail(voice, repository, language) {
  const audioCandidates = assetCandidatesFromPaths(
    candidatePathsForVoiceAudio(voice.path, "", language),
    repository.resourceManifest,
  );
  return {
    id: numberValue(voice.id),
    type: numberValue(voice.type),
    typeDescription: stringValue(voice.typeDesc),
    path: stringValue(voice.path),
    audioCandidates,
  };
}

function parseRewardItems(raw) {
  return stringValue(raw)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [itemIdRaw, countRaw] = token.split("-");
      return {
        itemId: numberValue(itemIdRaw),
        count: numberValue(countRaw),
        raw: token,
      };
    })
    .filter((entry) => entry.itemId > 0 && entry.count > 0);
}

function mapStoryRewardDetail(rewardEntry, language, repository) {
  if (!rewardEntry) return null;
  const rewardItems = enrichMaterialsWithItemNames(
    parseRewardItems(rewardEntry.reward),
    repository,
    language,
  );
  return {
    id: numberValue(rewardEntry.id),
    type: numberValue(rewardEntry.type),
    text: localizedFieldValue(rewardEntry, "content", language),
    rawReward: stringValue(rewardEntry.reward),
    rewards: rewardItems,
    rewardSummary: rewardItems.length > 0
      ? rewardItems.map((reward) => reward.summary).join(", ")
      : "-",
  };
}

function mapStoryDetail(story, language, repository) {
  const endingIds = Array.isArray(story.jieju)
    ? story.jieju.map((value) => numberValue(value)).filter((value) => value > 0)
    : [];
  const endings = endingIds
    .map((rewardId) => mapStoryRewardDetail(repository.spotRewardById.get(rewardId), language, repository))
    .filter(Boolean);

  const content = localizedFieldValue(story, "content", language);
  const contentPath = stringValue(story.contentPath).trim();
  return {
    characterId: numberValue(story.id),
    uniqueId: numberValue(story.uniqueId),
    type: numberValue(story.type),
    queue: numberValue(story.queque),
    levelLimit: numberValue(story.levelLimit),
    isMarried: numberValue(story.isMarried),
    name: localizedFieldValue(story, "name", language) || `Story #${numberValue(story.uniqueId)}`,
    lockTips: localizedFieldValue(story, "lockTips", language),
    content,
    contentPath,
    hasInlineContent: content.length > 0,
    hasScenarioContent: contentPath.length > 0,
    endingIds,
    endings,
  };
}

function mergeCharacterLevels(defaultLevels, specificLevels) {
  const byDefaultLevel = new Map((defaultLevels || []).map((entry) => [numberValue(entry.level), entry]));
  const bySpecificLevel = new Map((specificLevels || []).map((entry) => [numberValue(entry.level), entry]));
  const allLevels = Array.from(new Set([
    ...byDefaultLevel.keys(),
    ...bySpecificLevel.keys(),
  ]))
    .filter((level) => level > 0)
    .sort((a, b) => a - b);

  return allLevels.map((level) => bySpecificLevel.get(level) || byDefaultLevel.get(level)).filter(Boolean);
}

function mapLevelDetail(entry, language, repository) {
  const localized = localizedLevelInfo(entry, language);
  const rewards = enrichMaterialsWithItemNames(parseMaterialSegment(entry.reward), repository, language);
  return {
    level: numberValue(entry.level),
    exp: numberValue(entry.exp),
    unlockSays: numberValue(entry.unlockSays),
    unlockDescription: localized.unlockDescription,
    rewardMaterials: rewards,
    rewardSummary: rewards.length > 0 ? rewards.map((reward) => reward.summary).join(", ") : "-",
  };
}

function mapComposeDetail(entry, language, repository) {
  const reward = resolveItemDescriptor(
    repository,
    numberValue(entry.itemId),
    numberValue(entry.itemNum),
    language,
  );
  return {
    id: numberValue(entry.id),
    itemId: reward.id,
    itemName: reward.name,
    itemNum: reward.count,
    summary: reward.summary,
  };
}

function mapSpotSkinDetail(spotSkin, language, repository) {
  const localized = localizedSpotSkinInfo(spotSkin, language);
  const exchangeItem = resolveItemDescriptor(
    repository,
    numberValue(spotSkin.exchangeItemId),
    numberValue(spotSkin.exchangeItemNum),
    language,
  );

  return {
    id: numberValue(spotSkin.id),
    type: numberValue(spotSkin.type),
    characterId: numberValue(spotSkin.characterId),
    path: stringValue(spotSkin.path),
    name: localized.name || `#${numberValue(spotSkin.id)}`,
    description: localized.description,
    lockTips: localized.lockTips,
    exchangeItemId: exchangeItem.id,
    exchangeItemNum: exchangeItem.count,
    exchangeItemName: exchangeItem.name,
    exchangeSummary: exchangeItem.summary,
    direction: numberValue(spotSkin.direction),
    noReverse: numberValue(spotSkin.noReverse),
    lockReverse: numberValue(spotSkin.lockReverse),
    effectiveTime: stringValue(spotSkin.effectiveTime),
    spotScale: stringValue(spotSkin.spotScale),
    audioIdle: stringValue(spotSkin.idle),
    audioGreeting: numberValue(spotSkin.greeting),
    audioCelebrate: numberValue(spotSkin.celebrate),
    audioClick: numberValue(spotSkin.click),
    previewBighead: buildSkinAssetCandidates(spotSkin.path, repository.resourceManifest, "bighead.png", language),
    previewSmallhead: buildSkinAssetCandidates(spotSkin.path, repository.resourceManifest, "smallhead.png", language),
    previewHalf: buildSkinAssetCandidates(spotSkin.path, repository.resourceManifest, "half.png", language),
    previewFull: buildSkinAssetCandidates(spotSkin.path, repository.resourceManifest, "full.png", language),
    previewWaitingRoom: buildSkinAssetCandidates(spotSkin.path, repository.resourceManifest, "waitingroom.png", language),
  };
}

function mapScalarRows(entry) {
  return Object.entries(entry || {})
    .filter(([, value]) => {
      if (value === null || value === undefined) return true;
      const type = typeof value;
      return type === "string" || type === "number" || type === "boolean";
    })
    .map(([key, value]) => ({
      key,
      value: stringValue(value),
    }));
}

const detailCache = new Map();

export async function loadCharacterDetail(characterId, language) {
  const normalizedCharacterId = numberValue(characterId);
  const cacheKey = `${normalizedCharacterId}:${language}`;
  if (detailCache.has(cacheKey)) {
    return detailCache.get(cacheKey);
  }

  const repository = await loadCharactersRepository();
  const character = repository.characterById.get(normalizedCharacterId) ||
    repository.spotCharacterById.get(normalizedCharacterId);

  if (!character) {
    return null;
  }

  const characterSkins = (repository.skinsByCharacterId.get(normalizedCharacterId) || [])
    .slice()
    .sort((a, b) => numberValue(a.id) - numberValue(b.id));
  const skinPathById = new Map(characterSkins.map((skin) => [numberValue(skin.id), stringValue(skin.path)]));

  const initSkinId = numberValue(character.initSkin);
  const initSkinPath = skinPathById.get(initSkinId) ||
    stringValue((repository.skinById.get(initSkinId) || {}).path);
  const bigheadPaths = initSkinPath ? characterBigheadCandidatePaths(initSkinPath, language) : [];
  const bigheadCandidates = assetCandidatesFromPaths(bigheadPaths, repository.resourceManifest);
  const smallheadCandidates = initSkinPath
    ? buildSkinAssetCandidates(initSkinPath, repository.resourceManifest, "smallhead.png", language)
    : [];
  const halfCandidates = initSkinPath
    ? buildSkinAssetCandidates(initSkinPath, repository.resourceManifest, "half.png", language)
    : [];
  const fullCandidates = initSkinPath
    ? buildSkinAssetCandidates(initSkinPath, repository.resourceManifest, "full.png", language)
    : [];
  const waitingRoomCandidates = initSkinPath
    ? buildSkinAssetCandidates(initSkinPath, repository.resourceManifest, "waitingroom.png", language)
    : [];

  const localized = localizedCharacterInfo(character, language);
  const skins = characterSkins.map((skin) => mapSkinDetail(skin, language, repository));
  const emoBasePath = stringValue(character.emo);

  const mappedEmojis = (repository.emojisByCharacterId.get(normalizedCharacterId) || [])
    .map((emoji) => mapEmojiDetail(emoji, language, repository, stringValue(character.emo)))
    .sort((a, b) => a.subId - b.subId);
  const emojiBySubId = new Map(mappedEmojis.map((emoji) => [emoji.subId, emoji]));
  for (const subId of emojiSubIdsFromManifest(emoBasePath, repository.resourceManifest)) {
    if (emojiBySubId.has(subId)) continue;
    const imageCandidates = assetCandidatesFromPaths(
      emojiPathsFromManifest(emoBasePath, subId, repository.resourceManifest, language),
      repository.resourceManifest,
    );
    if (imageCandidates.length === 0) continue;

    emojiBySubId.set(subId, {
      subId,
      type: 1,
      unlockType: 0,
      unlockParam: [],
      unlockParamText: "",
      unlockDescription: "",
      afterUnlockDescription: "",
      view: "",
      audio: 0,
      imageCandidates,
    });
  }
  const emojis = Array.from(emojiBySubId.values()).sort((a, b) => a.subId - b.subId);

  const soundId = numberValue(character.sound);
  const voices = (repository.voiceLinesBySoundId.get(soundId) || [])
    .map((voice) => mapVoiceDetail(voice, language, repository, stringValue(character.soundFolder)))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category;
      return a.type.localeCompare(b.type);
    });

  const spotVoices = (repository.spotVoicesByCharacterId.get(normalizedCharacterId) || [])
    .map((voice) => mapSpotVoiceDetail(voice, repository, language))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type - b.type;
      return a.path.localeCompare(b.path);
    });

  const starMaterials = parseStarMaterials(character.star_5Material).map((stage) => ({
    stage: stage.stage,
    materials: enrichMaterialsWithItemNames(stage.materials, repository, language),
  }));
  const contractItems = enrichMaterialsWithItemNames(
    parseContractItems(character.star_5Material),
    repository,
    language,
  );
  const spotProfile = repository.spotCharacterById.get(normalizedCharacterId) || null;
  const relatedCutins = skins.flatMap((skin) => skin.cutins);
  const relatedSkinExtras = skins.filter((skin) => Boolean(skin.extra));
  const exchangeItem = resolveItemDescriptor(
    repository,
    numberValue(character.exchangeItemId),
    numberValue(character.exchangeItemNum),
    language,
  );

  const levelRows = mergeCharacterLevels(
    repository.characterLevelsByCharacterId.get(0),
    repository.characterLevelsByCharacterId.get(normalizedCharacterId),
  ).map((entry) => mapLevelDetail(entry, language, repository));

  const composeRows = (repository.composeByCharacterId.get(normalizedCharacterId) || [])
    .map((entry) => mapComposeDetail(entry, language, repository))
    .sort((a, b) => a.id - b.id);

  const spotSkins = (repository.spotSkinsByCharacterId.get(normalizedCharacterId) || [])
    .map((entry) => mapSpotSkinDetail(entry, language, repository))
    .sort((a, b) => a.id - b.id);
  const stories = (repository.spotStoriesByCharacterId.get(normalizedCharacterId) || [])
    .map((entry) => mapStoryDetail(entry, language, repository))
    .sort((a, b) => {
      if (a.queue !== b.queue) return a.queue - b.queue;
      return a.uniqueId - b.uniqueId;
    });

  const detail = {
    id: normalizedCharacterId,
    category: characterCategory(character),
    localized,
    names: {
      en: stringValue(character.nameEn),
      jp: stringValue(character.nameJp),
      chs: stringValue(character.nameChs),
      chsT: stringValue(character.nameChsT),
      kr: stringValue(character.nameKr),
      chsAlt: stringValue(character.nameChs2),
      chsTAlt: stringValue(character.nameChsT2),
      jpAlt: stringValue(character.nameJp2),
    },
    profile: {
      skinLib: stringValue(character.skinLib),
      sort: numberValue(character.sort),
      launchTime: stringValue(character.launchTime),
      sex: numberValue(character.sex),
      open: numberValue(character.open),
      canMarry: numberValue(character.canMarry),
      favorite: numberValue(character.favorite),
      limited: numberValue(character.limited),
      collaboration: numberValue(character.collaboration),
      regionLimit: numberValue(character.regionLimit),
      treasureSp: numberValue(character.treasureSp),
      ur: numberValue(character.ur),
      urRon: numberValue(character.urRon),
      urLiqi: numberValue(character.urLiqi),
      urCutin: stringValue(character.urCutin),
      hand: numberValue(character.hand),
      sound: numberValue(character.sound),
      soundVolume: numberValue(character.soundVolume),
      soundFolder: stringValue(character.soundFolder),
      exchangeItemId: exchangeItem.id,
      exchangeItemNum: exchangeItem.count,
      exchangeItemName: exchangeItem.name,
      exchangeSummary: exchangeItem.summary,
      star5Cost: numberValue(character.star_5Cost),
      star5Materials: starMaterials,
      contractItems,
      initSkin: initSkinId,
      fullFetterSkin: numberValue(character.fullFetterSkin),
      emoPath: stringValue(character.emo),
    },
    assets: {
      bighead: bigheadCandidates,
      smallhead: smallheadCandidates,
      half: halfCandidates,
      full: fullCandidates,
      waitingRoom: waitingRoomCandidates,
    },
    skins,
    emojis,
    voices,
    spotVoices,
    cutins: relatedCutins,
    skinExtras: relatedSkinExtras.map((skin) => ({ skinId: skin.id, skinName: skin.name, extra: skin.extra })),
    levels: levelRows,
    compose: composeRows,
    spotSkins,
    stories,
    spotProfile: spotProfile
      ? {
          localized: localizedCharacterInfo(spotProfile, language),
          open: numberValue(spotProfile.open),
          canMarry: numberValue(spotProfile.canMarry),
          limited: numberValue(spotProfile.limited),
          collaboration: numberValue(spotProfile.collaboration),
          initSkin: numberValue(spotProfile.initSkin),
          fullFetterSkin: numberValue(spotProfile.fullFetterSkin),
        }
      : null,
    raw: {
      characterScalars: mapScalarRows(character),
      spotCharacterScalars: spotProfile ? mapScalarRows(spotProfile) : [],
    },
    counts: {
      skins: skins.length,
      emojis: emojis.length,
      voices: voices.length,
      spotVoices: spotVoices.length,
      cutins: relatedCutins.length,
      skinExtras: relatedSkinExtras.length,
      levels: levelRows.length,
      compose: composeRows.length,
      spotSkins: spotSkins.length,
      stories: stories.length,
    },
  };

  detailCache.set(cacheKey, detail);
  return detail;
}
