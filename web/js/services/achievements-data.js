import { localizedFieldValue, normalizeUiLanguage } from "../../utils.js";
import {
  assetCandidatesFromPaths,
  expandLocalizedAssetPaths,
  itemIconCandidates,
  localizedNameFromEntry,
  numberValue,
  parseItemAmountPairs,
  stringValue,
} from "./item-utils.js";
import { loadAchievementsRepository } from "./achievements-repository.js";

const detailCache = new Map();

function stringFieldOrder(language) {
  const normalized = normalizeUiLanguage(language);
  if (normalized === "jp") return ["jp", "en", "chsT", "chs", "kr"];
  if (normalized === "kr") return ["kr", "en", "jp", "chsT", "chs"];
  if (normalized === "chs") return ["chs", "chsT", "en", "jp", "kr"];
  if (normalized === "chs_t") return ["chsT", "chs", "en", "jp", "kr"];
  return ["en", "jp", "chsT", "chs", "kr"];
}

function localizedStrValue(strEntry, language) {
  if (!strEntry || typeof strEntry !== "object") return "";
  for (const key of stringFieldOrder(language)) {
    const value = stringValue(strEntry[key]).trim();
    if (value.length > 0) {
      return value;
    }
  }
  return "";
}

function compactTaskParams(rawParam) {
  if (!Array.isArray(rawParam)) return [];
  const compact = rawParam
    .map((value) => stringValue(value).trim())
    .filter((value) => value.length > 0 && value !== "0");
  return compact.slice(0, 6);
}

function mapTask(baseTaskId, repository, language) {
  const normalizedTaskId = numberValue(baseTaskId);
  if (normalizedTaskId <= 0) {
    return {
      id: 0,
      exists: false,
      description: "",
      type: 0,
      target: 0,
      params: [],
      paramsSummary: "",
    };
  }

  const task = repository.baseTaskById.get(normalizedTaskId);
  if (!task) {
    return {
      id: normalizedTaskId,
      exists: false,
      description: `Task #${normalizedTaskId}`,
      type: 0,
      target: 0,
      params: [],
      paramsSummary: "",
    };
  }

  const params = compactTaskParams(task.param);
  const description = localizedFieldValue(task, "desc", language) || `Task #${normalizedTaskId}`;

  return {
    id: normalizedTaskId,
    exists: true,
    description,
    type: numberValue(task.type),
    target: numberValue(task.target),
    params,
    paramsSummary: params.join(", "),
  };
}

function resolveRewardItem(repository, itemId, count, language) {
  const normalizedItemId = numberValue(itemId);
  const normalizedCount = numberValue(count);
  const entry = repository.itemEntryById.get(normalizedItemId) || null;
  const name = entry
    ? localizedNameFromEntry(entry, language, normalizedItemId)
    : `#${normalizedItemId}`;
  const imageCandidates = entry
    ? itemIconCandidates(entry, repository.resourceManifest, language)
    : [];

  return {
    id: normalizedItemId,
    count: normalizedCount,
    name,
    imageCandidates,
    summary: `${name} x${normalizedCount}`,
  };
}

function mapRewards(rawReward, repository, language) {
  const rewards = parseItemAmountPairs(rawReward)
    .map((pair) => resolveRewardItem(repository, pair.itemId, pair.count, language));
  return {
    raw: stringValue(rawReward).trim(),
    items: rewards,
    summary: rewards.length > 0 ? rewards.map((entry) => entry.summary).join(", ") : "",
  };
}

function badgeImageCandidates(imgFile, repository, language) {
  const imageName = stringValue(imgFile).trim();
  if (!imageName) return [];

  const paths = [
    ...expandLocalizedAssetPaths(`myres2/badge/${imageName}`, language),
    `lang/base/myres2/badge/${imageName}`,
    `lang/base_q7/myres2/badge/${imageName}`,
  ];

  return assetCandidatesFromPaths(paths, repository.resourceManifest);
}

function mapAchievement(entry, repository, language) {
  const id = numberValue(entry.id);
  const groupId = numberValue(entry.groupId);
  const group = repository.achievementGroupById.get(groupId) || null;
  const localizedName = localizedFieldValue(entry, "name", language) || `#${id}`;
  const localizedDescription = localizedFieldValue(entry, "desc", language);
  const task = mapTask(entry.baseTask, repository, language);
  const reward = mapRewards(entry.reward, repository, language);

  return {
    id,
    groupId,
    groupName: group ? localizedFieldValue(group, "name", language) || `Group #${groupId}` : `Group #${groupId}`,
    name: localizedName,
    description: localizedDescription,
    rare: numberValue(entry.rare),
    locked: numberValue(entry.locked),
    hidden: numberValue(entry.hidden),
    deprecated: numberValue(entry.deprecated),
    sort: numberValue(entry.sort),
    segmentId: numberValue(entry.segmentId),
    baseTaskId: numberValue(entry.baseTask),
    task,
    rewardRaw: stringValue(entry.reward),
    rewards: reward.items,
    rewardSummary: reward.summary,
  };
}

function mapAchievementGroup(entry, repository, language, achievementsByGroupId) {
  const groupId = numberValue(entry.id);
  const localizedName = localizedFieldValue(entry, "name", language) || `Group #${groupId}`;
  const reward = mapRewards(entry.reward, repository, language);
  const groupAchievements = achievementsByGroupId.get(groupId) || [];

  return {
    id: groupId,
    name: localizedName,
    sort: numberValue(entry.sort),
    deprecated: numberValue(entry.deprecated),
    percentage: numberValue(entry.percentage),
    rewardRaw: stringValue(entry.reward),
    rewardItems: reward.items,
    rewardSummary: reward.summary,
    imageCandidates: reward.items.length > 0 ? reward.items[0].imageCandidates : [],
    counts: {
      all: groupAchievements.length,
      active: groupAchievements.filter((achievement) => achievement.deprecated === 0).length,
      hidden: groupAchievements.filter((achievement) => achievement.hidden > 0).length,
      locked: groupAchievements.filter((achievement) => achievement.locked > 0).length,
      deprecated: groupAchievements.filter((achievement) => achievement.deprecated > 0).length,
    },
  };
}

function mapBadgeGroup(entry, repository, language) {
  const badgeIds = Array.isArray(entry.badgeId)
    ? entry.badgeId.map((value) => numberValue(value)).filter((value) => value > 0)
    : [];
  const nameStr = repository.stringById.get(numberValue(entry.name));
  const descStr = repository.stringById.get(numberValue(entry.desc));
  const badges = badgeIds.map((badgeId) => {
    const badge = repository.badgeById.get(badgeId) || null;
    const task = badge ? mapTask(badge.baseTask, repository, language) : mapTask(0, repository, language);
    return {
      id: badgeId,
      baseTaskId: badge ? numberValue(badge.baseTask) : 0,
      task,
    };
  });

  return {
    id: numberValue(entry.id),
    type: numberValue(entry.type),
    img: stringValue(entry.img),
    nameStrId: numberValue(entry.name),
    descStrId: numberValue(entry.desc),
    name: localizedStrValue(nameStr, language) || `Badge Group #${numberValue(entry.id)}`,
    description: localizedStrValue(descStr, language),
    badgeIds,
    badges,
    imageCandidates: badgeImageCandidates(entry.img, repository, language),
  };
}

function achievementSort(left, right) {
  if (left.groupId !== right.groupId) return left.groupId - right.groupId;
  if (left.sort !== right.sort) return left.sort - right.sort;
  return left.id - right.id;
}

function groupSort(left, right) {
  if (left.sort !== right.sort) return left.sort - right.sort;
  return left.id - right.id;
}

function badgeGroupSort(left, right) {
  if (left.type !== right.type) return left.type - right.type;
  return left.id - right.id;
}

export async function loadAchievementsData(language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  if (detailCache.has(normalizedLanguage)) {
    return detailCache.get(normalizedLanguage);
  }

  const repository = await loadAchievementsRepository();

  const achievements = repository.achievements
    .map((entry) => mapAchievement(entry, repository, normalizedLanguage))
    .sort(achievementSort);
  const achievementsByGroupId = new Map();
  for (const achievement of achievements) {
    if (!achievementsByGroupId.has(achievement.groupId)) {
      achievementsByGroupId.set(achievement.groupId, []);
    }
    achievementsByGroupId.get(achievement.groupId).push(achievement);
  }

  const groups = repository.achievementGroups
    .map((entry) => mapAchievementGroup(entry, repository, normalizedLanguage, achievementsByGroupId))
    .sort(groupSort);
  const badgeGroups = repository.badgeGroups
    .map((entry) => mapBadgeGroup(entry, repository, normalizedLanguage))
    .sort(badgeGroupSort);

  const missingTaskRefs = achievements.filter((entry) => entry.baseTaskId > 0 && !entry.task.exists).length;
  const missingGroupRefs = achievements.filter((entry) => !repository.achievementGroupById.has(entry.groupId)).length;
  const missingBadgeTaskRefs = badgeGroups
    .flatMap((group) => group.badges)
    .filter((badge) => badge.baseTaskId > 0 && !badge.task.exists).length;
  const missingBadgeStrings = badgeGroups
    .filter((group) => group.name.length === 0 || group.description.length === 0).length;

  const result = {
    achievements,
    groups,
    badgeGroups,
    summary: {
      achievements: achievements.length,
      groups: groups.length,
      badgeGroups: badgeGroups.length,
      hidden: achievements.filter((entry) => entry.hidden > 0).length,
      locked: achievements.filter((entry) => entry.locked > 0).length,
      deprecated: achievements.filter((entry) => entry.deprecated > 0).length,
      rare3: achievements.filter((entry) => entry.rare >= 3).length,
    },
    diagnostics: {
      missingTaskRefs,
      missingGroupRefs,
      missingBadgeTaskRefs,
      missingBadgeStrings,
    },
  };

  detailCache.set(normalizedLanguage, result);
  return result;
}
