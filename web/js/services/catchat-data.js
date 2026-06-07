import { characterDisplayName, normalizeUiLanguage, rowsOf } from "../../utils.js";
import { fetchJson } from "../core/http.js";
import { itemIconCandidates, localizedNameFromEntry, numberValue, stringValue } from "./item-utils.js";
import { imageCandidates, loadResources } from "./resources.js";

const URLS = {
  snsRows: new URL("../../data/activity/sns_activity.json", import.meta.url),
  activityRows: new URL("../../data/activity/activity.json", import.meta.url),
  strEventRows: new URL("../../data/str/event.json", import.meta.url),
  characters: new URL("../../data/item_definition/character.json", import.meta.url),
  skins: new URL("../../data/item_definition/skin.json", import.meta.url),
  items: new URL("../../data/item_definition/item.json", import.meta.url),
  currencies: new URL("../../data/item_definition/currency.json", import.meta.url),
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
    ? ["jp", "en", "chs_t", "chs", "kr"]
    : normalizedLanguage === "kr"
      ? ["kr", "en", "jp", "chs_t", "chs"]
      : normalizedLanguage === "chs"
        ? ["chs", "chs_t", "en", "jp", "kr"]
        : normalizedLanguage === "chs_t"
          ? ["chs_t", "chs", "en", "jp", "kr"]
          : ["en", "jp", "chs_t", "chs", "kr"];

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

function resolveCharacterAvatarCandidates(repository, characterId, language) {
  const character = repository.characterById.get(numberValue(characterId));
  if (!character) return [];
  const initSkin = repository.skinById.get(numberValue(character.init_skin));
  const skinPath = stringValue(initSkin && initSkin.path).replace(/\/+$/, "");
  if (!skinPath) return [];
  return imageCandidates(repository.resources, `${skinPath}/bighead`, language);
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
  const iconCandidates = itemEntry ? itemIconCandidates(itemEntry, repository.resources, language) : [];

  return { id: normalizedId, count: normalizedCount, name: itemName, iconCandidates };
}

function resolveAuthorDisplay(row, repository, language) {
  const charId = numberValue(row.char_id);
  const charStrId = numberValue(row.char_str_id);
  const choiceId = numberValue(row.choice_id);

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
    return { name: localized || `#${charStrId}`, kind: "named", avatarCandidates: [] };
  }

  if (choiceId > 0) {
    return { name: "Player", kind: "player", avatarCandidates: [] };
  }

  return { name: "System", kind: "system", avatarCandidates: [] };
}

function resolveReplyDisplay(row, repository, language) {
  const replyCharId = numberValue(row.reply_char_id);
  if (replyCharId > 0) {
    const character = repository.characterById.get(replyCharId);
    return character ? characterDisplayName(character, language) : `#${replyCharId}`;
  }

  const replyCharStrId = numberValue(row.reply_char_str_id);
  if (replyCharStrId > 0) {
    const strEntry = repository.strById.get(replyCharStrId);
    return localizedStrValue(strEntry, language) || `#${replyCharStrId}`;
  }

  return "";
}

function entryKind(row) {
  const type = numberValue(row.type);
  const choiceId = numberValue(row.choice_id);
  const parentId = numberValue(row.parent_id);
  if (type === 1) return "system";
  if (choiceId > 0) return "choice";
  if (parentId <= 0) return "post";
  return "comment";
}

function imagePathCandidates(repository, path, language) {
  const normalized = stringValue(path).trim().replace(/^\/+/, "");
  if (!normalized) return [];
  return imageCandidates(repository.resources, normalized, language);
}

function mapRow(row, repository, language) {
  const contentStrId = numberValue(row.content_str_id);
  const contentStr = repository.strById.get(contentStrId);
  const contentText = normalizeCatChatText(localizedStrValue(contentStr, language));
  const author = resolveAuthorDisplay(row, repository, language);
  const replyToName = resolveReplyDisplay(row, repository, language);
  const imagePaths = safeArray(row.content_image)
    .map((path) => stringValue(path).trim().replace(/^\/+/, ""))
    .filter(Boolean);
  const images = imagePaths.map((path) => ({
    path,
    candidates: imagePathCandidates(repository, path, language),
  }));
  const contentHeadPath = stringValue(row.content_head).trim().replace(/^\/+/, "");
  const contentHeadCandidates = contentHeadPath
    ? imagePathCandidates(repository, contentHeadPath, language)
    : [];

  return {
    id: numberValue(row.id),
    activityId: numberValue(row.activity_id),
    parentId: numberValue(row.parent_id),
    choiceId: numberValue(row.choice_id),
    type: numberValue(row.type),
    kind: entryKind(row),
    isPrivate: numberValue(row.pm) > 0,
    isDisabled: numberValue(row.disable) > 0,
    likes: numberValue(row.like),
    unlockTime: stringValue(row.unlock_time).trim(),
    contentStrId,
    text: contentText || "-",
    authorName: author.name,
    authorKind: author.kind,
    authorAvatarCandidates: author.avatarCandidates,
    replyToName,
    images,
    contentHeadPath,
    contentHeadCandidates,
    unlock: resolveItemDescriptor(repository, numberValue(row.unlock_item_id), numberValue(row.unlock_item_count), language),
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
      return { path: firstImage.path, candidates: firstImage.candidates };
    }
    if (entry.contentHeadPath) {
      return { path: entry.contentHeadPath, candidates: entry.contentHeadCandidates };
    }
  }
  return { path: "", candidates: [] };
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
    visibleEntries.map((entry) => numberValue(entry.unlock && entry.unlock.id)).filter((value) => value > 0),
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

  return { id: activityId, summary, cover, threads, entries: visibleEntries };
}

async function loadRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = Promise.all([
    loadResources(),
    fetchJson(URLS.snsRows),
    fetchJson(URLS.activityRows),
    fetchJson(URLS.strEventRows),
    fetchJson(URLS.characters),
    fetchJson(URLS.skins),
    fetchJson(URLS.items),
    fetchJson(URLS.currencies),
  ]).then(([
    resources,
    snsRows,
    activityRows,
    strEventRows,
    characters,
    skins,
    items,
    currencies,
  ]) => {
    const activityById = new Map(rowsOf(activityRows).map((row) => [numberValue(row.id), row]));
    const strById = new Map(rowsOf(strEventRows).map((row) => [numberValue(row.id), row]));
    const characterById = new Map(rowsOf(characters).map((row) => [numberValue(row.id), row]));
    const skinById = new Map(rowsOf(skins).map((row) => [numberValue(row.id), row]));
    const itemEntries = [...rowsOf(currencies), ...rowsOf(items)];
    const itemById = new Map(itemEntries.map((row) => [numberValue(row.id), row]));

    const rowsByActivityId = new Map();
    for (const row of rowsOf(snsRows)) {
      const activityId = numberValue(row.activity_id);
      if (activityId <= 0) continue;
      if (!rowsByActivityId.has(activityId)) {
        rowsByActivityId.set(activityId, []);
      }
      rowsByActivityId.get(activityId).push(row);
    }

    return { resources, activityById, strById, characterById, skinById, itemById, rowsByActivityId };
  }).catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
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
