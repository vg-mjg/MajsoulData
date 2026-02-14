import { fetchJson } from "../core/http.js";
import { numberValue, stringValue } from "./item-utils.js";

const CORE_URLS = {
  resversion: new URL("../../resversion.json", import.meta.url),
  itemDefinitionItem: new URL("../../data/ItemDefinitionItem.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/ItemDefinitionCurrency.json", import.meta.url),
  itemDefinitionTitle: new URL("../../data/ItemDefinitionTitle.json", import.meta.url),
};

const ACTIVITY_TABLE_FILES = [
  "ActivityActivity.json",
  "ActivityActivityBanner.json",
  "ActivityActivityBuff.json",
  "ActivityActivityDesktop.json",
  "ActivityActivityGuide.json",
  "ActivityActivityItem.json",
  "ActivityActivityRoom.json",
  "ActivityArenaActivity.json",
  "ActivityArenaReward.json",
  "ActivityArenaRewardDisplay.json",
  "ActivityBingoCard.json",
  "ActivityBingoInfo.json",
  "ActivityBingoReward.json",
  "ActivityBuffCondition.json",
  "ActivityChestReplaceUp.json",
  "ActivityChestUp.json",
  "ActivityChooseGroup.json",
  "ActivityChooseGroupUpActivity.json",
  "ActivityChooseUpActivity.json",
  "ActivityChooseUpReplace.json",
  "ActivityCombiningActivityInfo.json",
  "ActivityCombiningCraft.json",
  "ActivityCombiningCraftPool.json",
  "ActivityCombiningCustomer.json",
  "ActivityCombiningMap.json",
  "ActivityCombiningOrder.json",
  "ActivityDailySign.json",
  "ActivityExchange.json",
  "ActivityFeedActivityInfo.json",
  "ActivityFeedActivityReward.json",
  "ActivityFestivalActivity.json",
  "ActivityFestivalEnding.json",
  "ActivityFestivalEvent.json",
  "ActivityFestivalLevel.json",
  "ActivityFestivalProposal.json",
  "ActivityFlipInfo.json",
  "ActivityFlipTask.json",
  "ActivityFriendGiftActivity.json",
  "ActivityGachaActivityInfo.json",
  "ActivityGachaControl.json",
  "ActivityGachaPool.json",
  "ActivityGamePoint.json",
  "ActivityGamePointFilter.json",
  "ActivityGamePointInfo.json",
  "ActivityGamePointRank.json",
  "ActivityGameTask.json",
  "ActivityIslandActivity.json",
  "ActivityIslandBag.json",
  "ActivityIslandGoods.json",
  "ActivityIslandMap.json",
  "ActivityIslandNews.json",
  "ActivityIslandShop.json",
  "ActivityLiverEventInfo.json",
  "ActivityLiverTextInfo.json",
  "ActivityMineActivity.json",
  "ActivityMineReward.json",
  "ActivityPeriodTask.json",
  "ActivityProgressReward.json",
  "ActivityRandomTaskInfo.json",
  "ActivityRandomTaskPool.json",
  "ActivityRank.json",
  "ActivityRankReward.json",
  "ActivityRewardMail.json",
  "ActivityRichmanEvent.json",
  "ActivityRichmanInfo.json",
  "ActivityRichmanLevel.json",
  "ActivityRichmanMap.json",
  "ActivityRichmanRewardSeq.json",
  "ActivityRpgActivity.json",
  "ActivityRpgMonsterGroup.json",
  "ActivityRpgV2Activity.json",
  "ActivitySegmentTask.json",
  "ActivitySimulationActivityInfo.json",
  "ActivitySnsActivity.json",
  "ActivitySpotActivity.json",
  "ActivityStoryActivity.json",
  "ActivityStoryEnding.json",
  "ActivitySummerStory.json",
  "ActivitySummerStoryReward.json",
  "ActivityTask.json",
  "ActivityTaskDisplay.json",
  "ActivityUpgradeActivity.json",
  "ActivityUpgradeActivityDisplay.json",
  "ActivityUpgradeActivityReward.json",
  "ActivityVillageActivityInfo.json",
  "ActivityVillageBuilding.json",
  "ActivityVillageTask.json",
  "ActivityVoteActivity.json",
];

let cachedRepositoryPromise = null;

function tableNameFromFile(fileName) {
  return String(fileName || "").replace(/\.json$/i, "");
}

function normalizeRows(data) {
  return Array.isArray(data) ? data : [];
}

function groupRowsByNumericField(rows, fieldName) {
  const grouped = new Map();
  for (const row of rows || []) {
    const key = numberValue(row && row[fieldName]);
    if (key <= 0) continue;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }
  return grouped;
}

function mapTitleEntries(rows) {
  return (rows || []).map((row) => ({
    ...row,
    sourceType: "title",
    iconOriginal: stringValue(row.icon),
    iconItem: stringValue(row.iconItem || row.icon),
    icon: stringValue(row.iconItem || row.icon),
  }));
}

function mapByNumericField(rows, fieldName) {
  const mapped = new Map();
  for (const row of rows || []) {
    const key = numberValue(row && row[fieldName]);
    if (key <= 0) continue;
    mapped.set(key, row);
  }
  return mapped;
}

function tableStats(rows) {
  const sampleRow = (rows || []).find((row) => row && typeof row === "object") || {};
  const sampleKeys = Object.keys(sampleRow);
  return {
    rowCount: (rows || []).length,
    keyCount: sampleKeys.length,
    sampleKeys: sampleKeys.slice(0, 24),
  };
}

export async function loadActivitiesRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = Promise.all([
    fetchJson(CORE_URLS.resversion),
    fetchJson(CORE_URLS.itemDefinitionItem),
    fetchJson(CORE_URLS.itemDefinitionCurrency),
    fetchJson(CORE_URLS.itemDefinitionTitle),
    ...ACTIVITY_TABLE_FILES.map(async (fileName) => {
      const tableName = tableNameFromFile(fileName);
      const tableUrl = new URL(`../../data/${fileName}`, import.meta.url);
      try {
        return [tableName, normalizeRows(await fetchJson(tableUrl))];
      } catch (error) {
        console.error(error);
        return [tableName, []];
      }
    }),
  ]).then(([resversion, itemDefinitionItem, itemDefinitionCurrency, itemDefinitionTitle, ...activityTables]) => {

    const resourceManifest = resversion && resversion.res ? resversion.res : {};
    const items = normalizeRows(itemDefinitionItem);
    const currencies = normalizeRows(itemDefinitionCurrency);
    const titleRows = normalizeRows(itemDefinitionTitle);
    const titleEntries = mapTitleEntries(titleRows);
    const itemEntries = [...currencies, ...items, ...titleEntries];
    const itemEntryById = mapByNumericField(itemEntries, "id");

    const tablesByName = new Map(activityTables.map(([name, rows]) => [name, normalizeRows(rows)]));
    const activities = tablesByName.get("ActivityActivity") || [];
    const activityById = mapByNumericField(activities, "id");
    const banners = tablesByName.get("ActivityActivityBanner") || [];
    const bannerByActivityId = mapByNumericField(banners, "id");

    const activityRowsByTable = new Map();
    for (const [tableName, rows] of tablesByName) {
      if (tableName === "ActivityActivity") continue;

      if (tableName === "ActivityActivityBanner") {
        const grouped = new Map();
        for (const row of rows) {
          const activityId = numberValue(row && row.id);
          if (activityId <= 0) continue;
          grouped.set(activityId, [row]);
        }
        if (grouped.size > 0) {
          activityRowsByTable.set(tableName, grouped);
        }
        continue;
      }

      const grouped = groupRowsByNumericField(rows, "activityId");
      if (grouped.size > 0) {
        activityRowsByTable.set(tableName, grouped);
      }
    }

    const tableStatsByName = new Map();
    for (const [tableName, rows] of tablesByName) {
      tableStatsByName.set(tableName, tableStats(rows));
    }

    const activityTypeCounts = new Map();
    for (const row of activities) {
      const type = stringValue(row && row.type).trim() || "unknown";
      activityTypeCounts.set(type, numberValue(activityTypeCounts.get(type)) + 1);
    }

    const indexes = {
      arenaRewardByGroupId: groupRowsByNumericField(tablesByName.get("ActivityArenaReward"), "groupId"),
      arenaRewardDisplayByGroupId: groupRowsByNumericField(tablesByName.get("ActivityArenaRewardDisplay"), "groupId"),
      mineRewardByGroupId: groupRowsByNumericField(tablesByName.get("ActivityMineReward"), "groupId"),
      rankRewardById: mapByNumericField(tablesByName.get("ActivityRankReward"), "id"),
      richmanMapByMapId: groupRowsByNumericField(tablesByName.get("ActivityRichmanMap"), "mapId"),
      richmanRewardSeqById: groupRowsByNumericField(tablesByName.get("ActivityRichmanRewardSeq"), "id"),
      randomTaskPoolByPoolId: groupRowsByNumericField(tablesByName.get("ActivityRandomTaskPool"), "poolId"),
      storyEndingByStoryId: groupRowsByNumericField(tablesByName.get("ActivityStoryEnding"), "storyId"),
      gachaPoolByPoolId: groupRowsByNumericField(tablesByName.get("ActivityGachaPool"), "poolId"),
      gachaControlById: mapByNumericField(tablesByName.get("ActivityGachaControl"), "id"),
      upgradeActivityRewardById: groupRowsByNumericField(tablesByName.get("ActivityUpgradeActivityReward"), "id"),
      chooseGroupByChestId: groupRowsByNumericField(tablesByName.get("ActivityChooseGroup"), "chestId"),
      chestUpByChestId: groupRowsByNumericField(tablesByName.get("ActivityChestUp"), "chestId"),
      summerStoryByStoryId: groupRowsByNumericField(tablesByName.get("ActivitySummerStory"), "storyId"),
      bingoCardByCardId: groupRowsByNumericField(tablesByName.get("ActivityBingoCard"), "cardId"),
      bingoRewardByCardId: groupRowsByNumericField(tablesByName.get("ActivityBingoReward"), "cardId"),
    };

    return {
      resourceManifest,
      activities,
      activityById,
      banners,
      bannerByActivityId,
      tablesByName,
      activityRowsByTable,
      tableStatsByName,
      activityTypeCounts,
      itemEntries,
      itemEntryById,
      indexes,
    };
  }).catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
  });

  return cachedRepositoryPromise;
}
