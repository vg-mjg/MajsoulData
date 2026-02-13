import { characterBigheadCandidatePaths, characterDisplayName, normalizeUiLanguage } from "../../utils.js";
import { fetchJson } from "../core/http.js";
import {
  assetCandidatesFromPaths,
  expandLocalizedAssetPaths,
  itemIconCandidates,
  localizedNameFromEntry,
  numberValue,
  stringValue,
} from "./item-utils.js";

const URLS = {
  resversion: new URL("../../resversion.json", import.meta.url),
  snsRows: new URL("../../data/ActivitySnsActivity.json", import.meta.url),
  activityRows: new URL("../../data/ActivityActivity.json", import.meta.url),
  strEventRows: new URL("../../data/StrEvent.json", import.meta.url),
  characters: new URL("../../data/ItemDefinitionCharacter.json", import.meta.url),
  skins: new URL("../../data/ItemDefinitionSkin.json", import.meta.url),
  items: new URL("../../data/ItemDefinitionItem.json", import.meta.url),
  currencies: new URL("../../data/ItemDefinitionCurrency.json", import.meta.url),
};

const dataCacheByLanguage = new Map();
let cachedRepositoryPromise = null;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function truncateText(text, maxLength = 80) {
  const value = stringValue(text).trim();
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function localizedStrValue(strEntry, language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  const order = normalizedLanguage === "jp"
    ? ["jp", "en", "chsT", "chs", "kr"]
    : normalizedLanguage === "kr"
      ? ["kr", "en", "jp", "chsT", "chs"]
      : normalizedLanguage === "chs"
        ? ["chs", "chsT", "en", "jp", "kr"]
        : normalizedLanguage === "chs_t"
          ? ["chsT", "chs", "en", "jp", "kr"]
          : ["en", "jp", "chsT", "chs", "kr"];

  for (const key of order) {
    const value = stringValue(strEntry && strEntry[key]).trim();
    if (value) return value;
  }

  return "";
}

function normalizeCatChatText(rawText) {
  const normalized = stringValue(rawText)
    .replace(/\[\/?tag\]/g, "")
    .replace(/\{\d+\}/g, "Player")
    .replace(/\r\n/g, "\n");
  return normalized.trim();
}

function pathCandidates(rawPath, language) {
  const normalizedPath = stringValue(rawPath).trim().replace(/^\/+/, "");
  if (!normalizedPath) return [];

  const paths = new Set(expandLocalizedAssetPaths(normalizedPath, language));
  if (!normalizedPath.startsWith("lang/")) {
    paths.add(`lang/base/${normalizedPath}`);
    paths.add(`lang/base_q7/${normalizedPath}`);
    paths.add(`lang/chs/${normalizedPath}`);
    paths.add(`lang/chs_q7/${normalizedPath}`);
    paths.add(`lang/chs_t/${normalizedPath}`);
    paths.add(`lang/chs_t_q7/${normalizedPath}`);
  }
  return Array.from(paths);
}

function resolveCharacterAvatarCandidates(repository, characterId, language) {
  const character = repository.characterById.get(numberValue(characterId));
  if (!character) return [];

  const initSkinId = numberValue(character.initSkin);
  const initSkin = repository.skinById.get(initSkinId);
  const skinPath = stringValue(initSkin && initSkin.path);
  if (!skinPath) return [];

  const paths = characterBigheadCandidatePaths(skinPath, language);
  return assetCandidatesFromPaths(paths, repository.resourceManifest);
}

function resolveItemDescriptor(repository, itemId, count, language) {
  const normalizedId = numberValue(itemId);
  const normalizedCount = numberValue(count);
  if (normalizedId <= 0 && normalizedCount <= 0) {
    return null;
  }

  const itemEntry = repository.itemById.get(normalizedId) || null;
  const itemName = itemEntry
    ? localizedNameFromEntry(itemEntry, language, normalizedId)
    : normalizedId > 0
      ? `#${normalizedId}`
      : "";
  const iconCandidates = itemEntry
    ? itemIconCandidates(itemEntry, repository.resourceManifest, language)
    : [];

  return {
    id: normalizedId,
    count: normalizedCount,
    name: itemName,
    iconCandidates,
  };
}

function resolveAuthorDisplay(row, repository, language) {
  const charId = numberValue(row.charId);
  const charStrId = numberValue(row.charStrId);
  const choiceId = numberValue(row.choiceId);

  if (charId > 0) {
    const character = repository.characterById.get(charId);
    return {
      name: character ? characterDisplayName(character, language) : `#${charId}`,
      kind: "character",
      avatarCandidates: resolveCharacterAvatarCandidates(repository, charId, language),
    };
  }

  if (charStrId > 0) {
    const strEntry = repository.strById.get(charStrId);
    const localized = localizedStrValue(strEntry, language);
    return {
      name: localized || `#${charStrId}`,
      kind: "named",
      avatarCandidates: [],
    };
  }

  if (choiceId > 0) {
    return {
      name: "Player",
      kind: "player",
      avatarCandidates: [],
    };
  }

  return {
    name: "System",
    kind: "system",
    avatarCandidates: [],
  };
}

function resolveReplyDisplay(row, repository, language) {
  const replyCharId = numberValue(row.replyCharId);
  if (replyCharId > 0) {
    const character = repository.characterById.get(replyCharId);
    return character ? characterDisplayName(character, language) : `#${replyCharId}`;
  }

  const replyCharStrId = numberValue(row.replyCharStrId);
  if (replyCharStrId > 0) {
    const strEntry = repository.strById.get(replyCharStrId);
    return localizedStrValue(strEntry, language) || `#${replyCharStrId}`;
  }

  return "";
}

function entryKind(row) {
  const type = numberValue(row.type);
  const choiceId = numberValue(row.choiceId);
  const parentId = numberValue(row.parentId);
  if (type === 1) return "system";
  if (choiceId > 0) return "choice";
  if (parentId <= 0) return "post";
  return "comment";
}

function mapRow(row, repository, language) {
  const contentStrId = numberValue(row.contentStrId);
  const contentStr = repository.strById.get(contentStrId);
  const contentText = normalizeCatChatText(localizedStrValue(contentStr, language));
  const author = resolveAuthorDisplay(row, repository, language);
  const replyToName = resolveReplyDisplay(row, repository, language);
  const imagePaths = safeArray(row.contentImage)
    .map((path) => stringValue(path).trim().replace(/^\/+/, ""))
    .filter(Boolean);
  const images = imagePaths.map((path) => ({
    path,
    candidates: assetCandidatesFromPaths(pathCandidates(path, language), repository.resourceManifest),
  }));
  const contentHeadPath = stringValue(row.contentHead).trim().replace(/^\/+/, "");
  const contentHeadCandidates = contentHeadPath
    ? assetCandidatesFromPaths(pathCandidates(contentHeadPath, language), repository.resourceManifest)
    : [];

  return {
    id: numberValue(row.id),
    activityId: numberValue(row.activityId),
    parentId: numberValue(row.parentId),
    choiceId: numberValue(row.choiceId),
    type: numberValue(row.type),
    kind: entryKind(row),
    isPrivate: numberValue(row.pm) > 0,
    isDisabled: numberValue(row.disable) > 0,
    likes: numberValue(row.like),
    unlockTime: stringValue(row.unlockTime).trim(),
    contentStrId,
    text: contentText || "-",
    authorName: author.name,
    authorKind: author.kind,
    authorAvatarCandidates: author.avatarCandidates,
    replyToName,
    images,
    contentHeadPath,
    contentHeadCandidates,
    unlock: resolveItemDescriptor(
      repository,
      numberValue(row.unlockItemId),
      numberValue(row.unlockItemCount),
      language,
    ),
  };
}

function buildEntryTree(entries) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const childrenByParentId = new Map();

  function pushChild(parentId, childId) {
    if (!childrenByParentId.has(parentId)) {
      childrenByParentId.set(parentId, []);
    }
    childrenByParentId.get(parentId).push(childId);
  }

  for (const entry of entries) {
    const parentId = entry.parentId > 0 && byId.has(entry.parentId) ? entry.parentId : 0;
    pushChild(parentId, entry.id);
  }

  for (const childIds of childrenByParentId.values()) {
    childIds.sort((left, right) => left - right);
  }

  function buildNode(entryId, depth = 0) {
    const entry = byId.get(entryId);
    const childIds = childrenByParentId.get(entryId) || [];
    return {
      ...entry,
      depth,
      children: childIds.map((childId) => buildNode(childId, depth + 1)),
    };
  }

  const rootIds = childrenByParentId.get(0) || [];
  return rootIds.map((entryId) => buildNode(entryId, 0));
}

function scenarioCover(entries) {
  for (const entry of entries) {
    const firstImage = entry.images[0];
    if (firstImage) {
      return {
        path: firstImage.path,
        candidates: firstImage.candidates,
      };
    }
    if (entry.contentHeadPath) {
      return {
        path: entry.contentHeadPath,
        candidates: entry.contentHeadCandidates,
      };
    }
  }

  return {
    path: "",
    candidates: [],
  };
}

function summarizeScenario(activityId, visibleEntries, hiddenEntriesCount) {
  const postCount = visibleEntries.filter((entry) => entry.kind === "post").length;
  const commentCount = visibleEntries.filter((entry) => entry.kind === "comment").length;
  const choiceCount = visibleEntries.filter((entry) => entry.kind === "choice").length;
  const systemCount = visibleEntries.filter((entry) => entry.kind === "system").length;
  const privateCount = visibleEntries.filter((entry) => entry.isPrivate).length;
  const imageCount = visibleEntries.reduce((sum, entry) => sum + entry.images.length, 0);
  const firstPost = visibleEntries.find((entry) => entry.kind === "post" && entry.text && entry.text !== "-");
  const preview = firstPost ? truncateText(firstPost.text.replace(/\n+/g, " "), 92) : "";
  const unlockItemIds = Array.from(new Set(
    visibleEntries
      .map((entry) => numberValue(entry.unlock && entry.unlock.id))
      .filter((value) => value > 0),
  )).sort((a, b) => a - b);
  const unlockMaxCount = visibleEntries.reduce((maxCount, entry) => {
    const count = numberValue(entry.unlock && entry.unlock.count);
    return count > maxCount ? count : maxCount;
  }, 0);

  return {
    id: activityId,
    title: `CatChat #${activityId}`,
    preview,
    entries: visibleEntries.length,
    posts: postCount,
    comments: commentCount,
    choices: choiceCount,
    system: systemCount,
    private: privateCount,
    images: imageCount,
    disabled: hiddenEntriesCount,
    unlockItemIds,
    unlockMaxCount,
  };
}

function buildActivityModel(activityId, allRows, repository, language) {
  const mappedRows = allRows
    .map((row) => mapRow(row, repository, language))
    .sort((left, right) => left.id - right.id);
  const visibleEntries = mappedRows.filter((entry) => !entry.isDisabled);
  const hiddenEntriesCount = mappedRows.length - visibleEntries.length;
  const threads = buildEntryTree(visibleEntries);
  const summary = summarizeScenario(activityId, visibleEntries, hiddenEntriesCount);
  const cover = scenarioCover(visibleEntries);

  return {
    id: activityId,
    summary,
    cover,
    threads,
    entries: visibleEntries,
  };
}

async function loadRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = Promise.all([
    fetchJson(URLS.resversion),
    fetchJson(URLS.snsRows),
    fetchJson(URLS.activityRows),
    fetchJson(URLS.strEventRows),
    fetchJson(URLS.characters),
    fetchJson(URLS.skins),
    fetchJson(URLS.items),
    fetchJson(URLS.currencies),
  ]).then(([
    resversion,
    snsRows,
    activityRows,
    strEventRows,
    characters,
    skins,
    items,
    currencies,
  ]) => {
    const resourceManifest = resversion && resversion.res ? resversion.res : {};
    const activityById = new Map(safeArray(activityRows).map((row) => [numberValue(row.id), row]));
    const strById = new Map(safeArray(strEventRows).map((row) => [numberValue(row.id), row]));
    const characterById = new Map(safeArray(characters).map((row) => [numberValue(row.id), row]));
    const skinById = new Map(safeArray(skins).map((row) => [numberValue(row.id), row]));
    const itemEntries = [...safeArray(currencies), ...safeArray(items)];
    const itemById = new Map(itemEntries.map((row) => [numberValue(row.id), row]));

    const rowsByActivityId = new Map();
    for (const row of safeArray(snsRows)) {
      const activityId = numberValue(row.activityId);
      if (activityId <= 0) continue;
      if (!rowsByActivityId.has(activityId)) {
        rowsByActivityId.set(activityId, []);
      }
      rowsByActivityId.get(activityId).push(row);
    }

    return {
      resourceManifest,
      activityById,
      strById,
      characterById,
      skinById,
      itemById,
      rowsByActivityId,
    };
  });

  return cachedRepositoryPromise;
}

async function buildCatChatData(language) {
  const repository = await loadRepository();
  const activityIds = Array.from(repository.rowsByActivityId.keys()).sort((left, right) => right - left);
  const activities = activityIds.map((activityId) => (
    buildActivityModel(activityId, repository.rowsByActivityId.get(activityId) || [], repository, language)
  ));
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const totalEntries = activities.reduce((sum, activity) => sum + numberValue(activity.summary.entries), 0);
  const totalHidden = activities.reduce((sum, activity) => sum + numberValue(activity.summary.disabled), 0);

  return {
    activities,
    activityById,
    summary: {
      activities: activities.length,
      entries: totalEntries,
      hiddenEntries: totalHidden,
    },
  };
}

export async function loadCatChatData(language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  if (dataCacheByLanguage.has(normalizedLanguage)) {
    return dataCacheByLanguage.get(normalizedLanguage);
  }

  const promise = buildCatChatData(normalizedLanguage);
  dataCacheByLanguage.set(normalizedLanguage, promise);
  return promise;
}
