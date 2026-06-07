import { fetchJson } from "../core/http.js";
import { rowsOf } from "../../utils.js";
import { loadResources } from "./resources.js";
import { numberValue, stringValue } from "./item-utils.js";

const URLS = {
  achievementAchievement: new URL("../../data/achievement/achievement.json", import.meta.url),
  achievementAchievementGroup: new URL("../../data/achievement/achievement_group.json", import.meta.url),
  achievementBadge: new URL("../../data/achievement/badge.json", import.meta.url),
  achievementBadgeGroup: new URL("../../data/achievement/badge_group.json", import.meta.url),
  eventsBaseTask: new URL("../../data/events/base_task.json", import.meta.url),
  strStr: new URL("../../data/str/str.json", import.meta.url),
  itemDefinitionItem: new URL("../../data/item_definition/item.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/item_definition/currency.json", import.meta.url),
  itemDefinitionTitle: new URL("../../data/item_definition/title.json", import.meta.url),
};

let cachedRepositoryPromise = null;

function mapTitleEntries(titleRows) {
  return (titleRows || []).map((row) => ({
    ...row,
    sourceType: "title",
    icon_original: stringValue(row.icon),
    icon_item: stringValue(row.icon_item || row.icon),
    icon: stringValue(row.icon_item || row.icon),
  }));
}

function groupBy(items, keySelector) {
  const grouped = new Map();
  for (const item of items || []) {
    const key = keySelector(item);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(item);
  }
  return grouped;
}

export async function loadAchievementsRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = Promise.all([
    loadResources(),
    fetchJson(URLS.achievementAchievement),
    fetchJson(URLS.achievementAchievementGroup),
    fetchJson(URLS.achievementBadge),
    fetchJson(URLS.achievementBadgeGroup),
    fetchJson(URLS.eventsBaseTask),
    fetchJson(URLS.strStr),
    fetchJson(URLS.itemDefinitionItem),
    fetchJson(URLS.itemDefinitionCurrency),
    fetchJson(URLS.itemDefinitionTitle),
  ]).then(([
    resources,
    achievementAchievement,
    achievementAchievementGroup,
    achievementBadge,
    achievementBadgeGroup,
    eventsBaseTask,
    strStr,
    itemDefinitionItem,
    itemDefinitionCurrency,
    itemDefinitionTitle,
  ]) => {

    const achievements = rowsOf(achievementAchievement);
    const achievementGroups = rowsOf(achievementAchievementGroup);
    const badges = rowsOf(achievementBadge);
    const badgeGroups = rowsOf(achievementBadgeGroup);
    const baseTasks = rowsOf(eventsBaseTask);
    const strings = rowsOf(strStr);
    const items = rowsOf(itemDefinitionItem);
    const currencies = rowsOf(itemDefinitionCurrency);
    const titles = rowsOf(itemDefinitionTitle);
    const titleEntries = mapTitleEntries(titles);
    const itemEntries = [...currencies, ...items, ...titleEntries];

    const achievementById = new Map(achievements.map((entry) => [numberValue(entry.id), entry]));
    const achievementGroupById = new Map(achievementGroups.map((entry) => [numberValue(entry.id), entry]));
    const badgeById = new Map(badges.map((entry) => [numberValue(entry.id), entry]));
    const baseTaskById = new Map(baseTasks.map((entry) => [numberValue(entry.id), entry]));
    const stringById = new Map(strings.map((entry) => [numberValue(entry.id), entry]));
    const itemEntryById = new Map(itemEntries.map((entry) => [numberValue(entry.id), entry]));

    return {
      resources,
      achievements,
      achievementGroups,
      badges,
      badgeGroups,
      baseTasks,
      strings,
      items,
      currencies,
      titles,
      titleEntries,
      itemEntries,
      achievementById,
      achievementGroupById,
      badgeById,
      baseTaskById,
      stringById,
      itemEntryById,
      achievementsByGroupId: groupBy(achievements, (entry) => numberValue(entry.group_id)),
    };
  }).catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
  });

  return cachedRepositoryPromise;
}
