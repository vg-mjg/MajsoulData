// CatChat domain transformer. Pure seam: raw sns/activity/string rows plus the
// already-denormalized character/item collections and asset/legacy indexes in,
// a language-agnostic collection out. Threads are grouped by activity, every
// speaker/text/unlock name is resolved inline, and post/head image refs carry
// baked per-locale URL maps with unity_raw first and legacy raw-assets fallback.

import { localizeText, rowsOf, textMap } from "../lib/localization.js";
import {
  normalizeRef,
  resolveLocaleValueWithinDir,
} from "./assets.js";
import {
  legacyCatChatRefUrls,
  mergeAndCompressLocaleUrls,
} from "./legacy.js";

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function str(value) {
  return value === null || value === undefined ? "" : String(value);
}

function directTextMap(row) {
  const out = {};
  for (const key of ["en", "jp", "chs", "chs_t", "kr"]) out[key] = str(row && row[key]);
  return out;
}

function constantTextMap(value) {
  return { en: value, jp: value, chs: value, chs_t: value, kr: value };
}

function normalizeCatChatText(rawText) {
  return str(rawText)
    .replace(/\[\/?tag\]/g, "")
    .replace(/\{\d+\}/g, "Player")
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizeTextMap(map) {
  const out = {};
  for (const key of ["en", "jp", "chs", "chs_t", "kr"]) {
    out[key] = normalizeCatChatText(map && map[key]);
  }
  return out;
}

function groupBy(rows, keyOf) {
  const out = new Map();
  for (const row of rows || []) {
    const key = keyOf(row);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(row);
  }
  return out;
}

function mapById(rows) {
  const out = new Map();
  for (const row of rows || []) {
    const id = num(row && row.id);
    if (id > 0 && !out.has(id)) out.set(id, row);
  }
  return out;
}

function safeImageRefs(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeRef).filter(Boolean);
}

function entryKind(row) {
  if (num(row.type) === 1) return "system";
  if (num(row.choice_id) > 0) return "choice";
  if (num(row.parent_id) > 0) return "comment";
  return "post";
}

function itemIcon(item) {
  return item && item.assets
    ? item.assets.icon || item.assets.loadingImage || item.assets.titleArt || ""
    : "";
}

function resolveUnlock(row, itemById) {
  const itemId = num(row.unlock_item_id);
  const count = num(row.unlock_item_count);
  if (itemId <= 0 && count <= 0) return null;
  const item = itemById.get(itemId);
  return {
    itemId,
    count,
    name: item && item.text ? item.text.name : constantTextMap(itemId > 0 ? `#${itemId}` : ""),
    icon: itemIcon(item),
  };
}

function resolveCatchatImage(
  activityId,
  ref,
  assetIndex,
  legacyVersionsByFile,
  legacyVersionsByActivity,
) {
  const normalized = normalizeRef(ref);
  if (!normalized) return "";
  const value = resolveLocaleValueWithinDir(assetIndex, normalized);
  const legacy = legacyCatChatRefUrls(
    activityId,
    normalized,
    legacyVersionsByFile,
    legacyVersionsByActivity,
  );
  return mergeAndCompressLocaleUrls(value, legacy);
}

function resolvedImage(activityId, ref, assetIndex, legacyVersionsByFile, legacyVersionsByActivity) {
  const normalized = normalizeRef(ref);
  return {
    ref: normalized,
    image: resolveCatchatImage(
      activityId,
      normalized,
      assetIndex,
      legacyVersionsByFile,
      legacyVersionsByActivity,
    ),
  };
}

function resolveAuthor(row, characterById, strById) {
  const characterId = num(row.char_id);
  if (characterId > 0) {
    const character = characterById.get(characterId);
    return {
      id: characterId,
      kind: "character",
      name:
        character && character.text && character.text.name
          ? character.text.name
          : constantTextMap(`#${characterId}`),
      avatar: character && character.assets ? character.assets.bighead || "" : "",
    };
  }

  const strId = num(row.char_str_id);
  if (strId > 0) {
    const entry = strById.get(strId);
    return {
      id: strId,
      kind: "named",
      name: entry ? directTextMap(entry) : constantTextMap(`#${strId}`),
      avatar: "",
    };
  }

  if (num(row.choice_id) > 0) {
    return { id: num(row.choice_id), kind: "player", name: constantTextMap("Player"), avatar: "" };
  }

  return { id: 0, kind: "system", name: constantTextMap("System"), avatar: "" };
}

function resolveReply(row, characterById, strById) {
  const characterId = num(row.reply_char_id);
  if (characterId > 0) {
    const character = characterById.get(characterId);
    return {
      id: characterId,
      kind: "character",
      name:
        character && character.text && character.text.name
          ? character.text.name
          : constantTextMap(`#${characterId}`),
    };
  }

  const strId = num(row.reply_char_str_id);
  if (strId > 0) {
    const entry = strById.get(strId);
    return {
      id: strId,
      kind: "named",
      name: entry ? directTextMap(entry) : constantTextMap(`#${strId}`),
    };
  }

  return null;
}

function buildEntryTree(entries) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const childrenByParentId = new Map();

  const pushChild = (parentId, child) => {
    if (!childrenByParentId.has(parentId)) childrenByParentId.set(parentId, []);
    childrenByParentId.get(parentId).push(child);
  };

  for (const entry of entries) {
    const parentId = entry.parentId > 0 && byId.has(entry.parentId) ? entry.parentId : 0;
    pushChild(parentId, entry);
  }

  for (const children of childrenByParentId.values()) {
    children.sort((a, b) => a.id - b.id);
  }

  function node(entry, depth = 0) {
    return {
      ...entry,
      depth,
      children: (childrenByParentId.get(entry.id) || []).map((child) => node(child, depth + 1)),
    };
  }

  return (childrenByParentId.get(0) || []).map((entry) => node(entry, 0));
}

function withReflowedChoiceCounters(entries) {
  const choicesByParentId = new Map();
  for (const entry of entries) {
    if (entry.choiceId <= 0) continue;
    if (!choicesByParentId.has(entry.parentId)) choicesByParentId.set(entry.parentId, []);
    choicesByParentId.get(entry.parentId).push(entry);
  }

  const displayChoiceIdByEntryId = new Map();
  for (const choices of choicesByParentId.values()) {
    choices.sort((a, b) => a.id - b.id);
    choices.forEach((entry, index) => displayChoiceIdByEntryId.set(entry.id, index + 1));
  }

  return entries.map((entry) => {
    const displayChoiceId = displayChoiceIdByEntryId.get(entry.id);
    if (!displayChoiceId) return entry;
    return {
      ...entry,
      sourceChoiceId: entry.choiceId,
      choiceId: displayChoiceId,
    };
  });
}

function summarize(activityId, entries, hiddenEntriesCount) {
  const postCount = entries.filter((entry) => entry.kind === "post").length;
  const commentCount = entries.filter((entry) => entry.kind === "comment").length;
  const choiceCount = entries.filter((entry) => entry.kind === "choice").length;
  const systemCount = entries.filter((entry) => entry.kind === "system").length;
  const privateCount = entries.filter((entry) => entry.isPrivate).length;
  const imageCount = entries.reduce((sum, entry) => sum + entry.images.length, 0);
  const firstPost = entries.find(
    (entry) => entry.kind === "post" && localizeText(entry.text.content),
  );
  const preview = firstPost ? localizeText(firstPost.text.content).replace(/\n+/g, " ") : "";
  return {
    id: activityId,
    entries: entries.length,
    posts: postCount,
    comments: commentCount,
    choices: choiceCount,
    system: systemCount,
    private: privateCount,
    images: imageCount,
    disabled: hiddenEntriesCount,
    preview: preview.length > 92 ? `${preview.slice(0, 91)}…` : preview,
  };
}

function buildEntry(row, context) {
  const activityId = num(row.activity_id);
  const contentStr = context.strById.get(num(row.content_str_id));
  const headRef = normalizeRef(row.content_head);
  return {
    id: num(row.id),
    activityId,
    parentId: num(row.parent_id),
    choiceId: num(row.choice_id),
    type: num(row.type),
    kind: entryKind(row),
    isPrivate: num(row.pm) > 0,
    isDisabled: num(row.disable) > 0,
    likes: num(row.like),
    unlockTime: str(row.unlock_time).trim(),
    text: {
      content: normalizeTextMap(contentStr ? directTextMap(contentStr) : constantTextMap("")),
    },
    author: resolveAuthor(row, context.characterById, context.strById),
    replyTo: resolveReply(row, context.characterById, context.strById),
    images: safeImageRefs(row.content_image).map((ref) =>
      resolvedImage(
        activityId,
        ref,
        context.assetIndex,
        context.legacyVersionsByFile,
        context.legacyVersionsByActivity,
      ),
    ),
    contentHead: headRef
      ? resolvedImage(
          activityId,
          headRef,
          context.assetIndex,
          context.legacyVersionsByFile,
          context.legacyVersionsByActivity,
        )
      : null,
    unlock: resolveUnlock(row, context.itemById),
  };
}

function coverImage(entries) {
  for (const entry of entries) {
    const image = entry.images.find((candidate) => candidate.image);
    if (image) return image;
    if (entry.contentHead && entry.contentHead.image) return entry.contentHead;
  }
  return null;
}

export function transformCatChat(
  tables,
  assetIndex,
  legacyVersionsByFile,
  legacyVersionsByActivity,
  characters,
  items,
) {
  const strById = mapById(rowsOf(tables.strEvent));
  const activityById = mapById(rowsOf(tables.activity));
  const characterById = mapById(characters || []);
  const itemById = mapById(items || []);
  const rowsByActivityId = groupBy(rowsOf(tables.snsActivity), (row) => num(row.activity_id));
  const context = {
    assetIndex,
    legacyVersionsByFile,
    legacyVersionsByActivity,
    strById,
    characterById,
    itemById,
  };

  const activities = [];
  for (const [activityId, rawRows] of rowsByActivityId) {
    if (activityId <= 0) continue;
    const mapped = rawRows.map((row) => buildEntry(row, context)).sort((a, b) => a.id - b.id);
    const entries = withReflowedChoiceCounters(mapped.filter((entry) => !entry.isDisabled));
    const hiddenEntriesCount = mapped.length - entries.length;
    const activity = activityById.get(activityId);
    const activityName = activity ? textMap(activity, "name") : constantTextMap("");
    const fallbackTitle = localizeText(activityName) || `CatChat #${activityId}`;
    const cover = coverImage(entries);

    activities.push({
      id: activityId,
      text: { name: activityName },
      fallbackTitle,
      summary: summarize(activityId, entries, hiddenEntriesCount),
      cover,
      threads: buildEntryTree(entries),
      entries,
    });
  }

  return activities.sort((a, b) => b.id - a.id);
}
