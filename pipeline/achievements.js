// Achievements domain transformer. Pure seam: achievement tables plus the baked
// items collection in, grouped language-agnostic achievements out. Reward item
// references are resolved to item ids, localized item names, and baked icons so
// Eleventy can render links without runtime joins.

import { rowsOf, textMap } from "../lib/localization.js";

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function str(value) {
  return value === null || value === undefined ? "" : String(value);
}

function parseItemAmountPairs(raw) {
  const text = str(raw);
  const pairs = [];
  const pattern = /(\d+)\s*-\s*(\d+)/g;
  let match = pattern.exec(text);
  while (match) {
    const itemId = num(match[1]);
    const count = num(match[2]);
    if (itemId > 0 && count > 0) pairs.push({ itemId, count });
    match = pattern.exec(text);
  }
  return pairs;
}

function fallbackName(itemId) {
  return { en: `#${itemId}`, jp: "", chs: "", chs_t: "", kr: "" };
}

function itemIcon(item) {
  if (!item || !item.assets) return "";
  return item.assets.icon || item.assets.loadingImage || item.assets.titleArt || "";
}

function resolveRewards(rawReward, itemById) {
  return parseItemAmountPairs(rawReward).map((pair) => {
    const item = itemById.get(pair.itemId);
    return {
      itemId: pair.itemId,
      count: pair.count,
      text: { name: item ? item.text.name : fallbackName(pair.itemId) },
      icon: itemIcon(item),
    };
  });
}

function achievementText(row) {
  return {
    name: textMap(row, "name"),
    description: textMap(row, "desc"),
  };
}

function buildAchievement(row, itemById) {
  return {
    id: num(row.id),
    groupId: num(row.group_id),
    sort: num(row.sort),
    rare: num(row.rare),
    locked: num(row.locked),
    hidden: num(row.hidden),
    deprecated: num(row.deprecated),
    segmentId: num(row.segment_id),
    baseTaskId: num(row.base_task),
    text: achievementText(row),
    rewards: resolveRewards(row.reward, itemById),
  };
}

function buildGroup(row, achievements, itemById) {
  const id = num(row.id);
  const groupAchievements = achievements
    .filter((achievement) => achievement.groupId === id)
    .sort((a, b) => a.sort - b.sort || a.id - b.id);
  return {
    id,
    sort: num(row.sort),
    deprecated: num(row.deprecated),
    percentage: num(row.percentage),
    text: { name: textMap(row, "name") },
    image: str(row.img),
    rewards: resolveRewards(row.reward, itemById),
    counts: {
      achievements: groupAchievements.length,
      hidden: groupAchievements.filter((achievement) => achievement.hidden > 0).length,
      locked: groupAchievements.filter((achievement) => achievement.locked > 0).length,
      deprecated: groupAchievements.filter((achievement) => achievement.deprecated > 0).length,
    },
    achievements: groupAchievements,
  };
}

export function transformAchievements(tables, items) {
  const itemById = new Map((items || []).map((item) => [num(item.id), item]));
  const achievements = rowsOf(tables.achievement).map((row) => buildAchievement(row, itemById));
  return rowsOf(tables.achievementGroup)
    .map((row) => buildGroup(row, achievements, itemById))
    .filter((group) => group.achievements.length > 0)
    .sort((a, b) => a.sort - b.sort || a.id - b.id);
}
