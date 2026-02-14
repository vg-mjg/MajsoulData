import { fetchJson } from "../core/http.js";
import { numberValue, stringValue } from "./item-utils.js";

const URLS = {
  resversion: new URL("../../resversion.json", import.meta.url),
  achievementAchievement: new URL("../../data/AchievementAchievement.json", import.meta.url),
  achievementAchievementGroup: new URL("../../data/AchievementAchievementGroup.json", import.meta.url),
  achievementBadge: new URL("../../data/AchievementBadge.json", import.meta.url),
  achievementBadgeGroup: new URL("../../data/AchievementBadgeGroup.json", import.meta.url),
  eventsBaseTask: new URL("../../data/EventsBaseTask.json", import.meta.url),
  strStr: new URL("../../data/StrStr.json", import.meta.url),
  itemDefinitionItem: new URL("../../data/ItemDefinitionItem.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/ItemDefinitionCurrency.json", import.meta.url),
  itemDefinitionTitle: new URL("../../data/ItemDefinitionTitle.json", import.meta.url),
};

let cachedRepositoryPromise = null;

function mapTitleEntries(titleRows) {
  return (titleRows || []).map((row) => ({
    ...row,
    sourceType: "title",
    iconOriginal: stringValue(row.icon),
    iconItem: stringValue(row.iconItem || row.icon),
    icon: stringValue(row.iconItem || row.icon),
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
    fetchJson(URLS.resversion),
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
    resversion,
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

    const resourceManifest = resversion && resversion.res ? resversion.res : {};
    const achievements = Array.isArray(achievementAchievement) ? achievementAchievement : [];
    const achievementGroups = Array.isArray(achievementAchievementGroup) ? achievementAchievementGroup : [];
    const badges = Array.isArray(achievementBadge) ? achievementBadge : [];
    const badgeGroups = Array.isArray(achievementBadgeGroup) ? achievementBadgeGroup : [];
    const baseTasks = Array.isArray(eventsBaseTask) ? eventsBaseTask : [];
    const strings = Array.isArray(strStr) ? strStr : [];
    const items = Array.isArray(itemDefinitionItem) ? itemDefinitionItem : [];
    const currencies = Array.isArray(itemDefinitionCurrency) ? itemDefinitionCurrency : [];
    const titles = Array.isArray(itemDefinitionTitle) ? itemDefinitionTitle : [];
    const titleEntries = mapTitleEntries(titles);
    const itemEntries = [...currencies, ...items, ...titleEntries];

    const achievementById = new Map(achievements.map((entry) => [numberValue(entry.id), entry]));
    const achievementGroupById = new Map(achievementGroups.map((entry) => [numberValue(entry.id), entry]));
    const badgeById = new Map(badges.map((entry) => [numberValue(entry.id), entry]));
    const baseTaskById = new Map(baseTasks.map((entry) => [numberValue(entry.id), entry]));
    const stringById = new Map(strings.map((entry) => [numberValue(entry.id), entry]));
    const itemEntryById = new Map(itemEntries.map((entry) => [numberValue(entry.id), entry]));

    return {
      resourceManifest,
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
      achievementsByGroupId: groupBy(achievements, (entry) => numberValue(entry.groupId)),
    };
  }).catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
  });

  return cachedRepositoryPromise;
}
