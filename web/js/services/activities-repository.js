import { fetchJson } from "../core/http.js";
import { rowsOf } from "../../utils.js";
import { loadResources } from "./resources.js";
import { numberValue, stringValue } from "./item-utils.js";

const CORE_URLS = {
  index: new URL("../../data/index.json", import.meta.url),
  itemDefinitionItem: new URL("../../data/item_definition/item.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/item_definition/currency.json", import.meta.url),
  itemDefinitionTitle: new URL("../../data/item_definition/title.json", import.meta.url),
};

let cachedRepositoryPromise = null;

// "activity_banner" -> "ActivityActivityBanner" (the logical name used internally)
function sheetToTableName(sheet) {
  const pascal = String(sheet)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `Activity${pascal}`;
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
    icon_original: stringValue(row.icon),
    icon_item: stringValue(row.icon_item || row.icon),
    icon: stringValue(row.icon_item || row.icon),
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
  return { rowCount: (rows || []).length, keyCount: sampleKeys.length, sampleKeys: sampleKeys.slice(0, 24) };
}

export async function loadActivitiesRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = (async () => {
    const [resources, index, itemDefinitionItem, itemDefinitionCurrency, itemDefinitionTitle] = await Promise.all([
      loadResources(),
      fetchJson(CORE_URLS.index),
      fetchJson(CORE_URLS.itemDefinitionItem),
      fetchJson(CORE_URLS.itemDefinitionCurrency),
      fetchJson(CORE_URLS.itemDefinitionTitle),
    ]);

    const activitySheets = (Array.isArray(index) ? index : [])
      .filter((entry) => entry && entry.TableName === "activity" && entry.SheetName)
      .map((entry) => entry.SheetName);
    const activityTables = await Promise.all(activitySheets.map(async (sheet) => {
      const tableUrl = new URL(`../../data/activity/${sheet}.json`, import.meta.url);
      try {
        return [sheetToTableName(sheet), rowsOf(await fetchJson(tableUrl))];
      } catch {
        return [sheetToTableName(sheet), []];
      }
    }));

    const items = rowsOf(itemDefinitionItem);
    const currencies = rowsOf(itemDefinitionCurrency);
    const titleRows = rowsOf(itemDefinitionTitle);
    const titleEntries = mapTitleEntries(titleRows);
    const itemEntries = [...currencies, ...items, ...titleEntries];
    const itemEntryById = mapByNumericField(itemEntries, "id");

    const tablesByName = new Map(activityTables.map(([name, rows]) => [name, rowsOf(rows)]));
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

      const grouped = groupRowsByNumericField(rows, "activity_id");
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
      arenaRewardByGroupId: groupRowsByNumericField(tablesByName.get("ActivityArenaReward"), "group_id"),
      arenaRewardDisplayByGroupId: groupRowsByNumericField(tablesByName.get("ActivityArenaRewardDisplay"), "group_id"),
      mineRewardByGroupId: groupRowsByNumericField(tablesByName.get("ActivityMineReward"), "group_id"),
      rankRewardById: mapByNumericField(tablesByName.get("ActivityRankReward"), "id"),
      richmanMapByMapId: groupRowsByNumericField(tablesByName.get("ActivityRichmanMap"), "map_id"),
      richmanRewardSeqById: groupRowsByNumericField(tablesByName.get("ActivityRichmanRewardSeq"), "id"),
      randomTaskPoolByPoolId: groupRowsByNumericField(tablesByName.get("ActivityRandomTaskPool"), "pool_id"),
      storyEndingByStoryId: groupRowsByNumericField(tablesByName.get("ActivityStoryEnding"), "story_id"),
      gachaPoolByPoolId: groupRowsByNumericField(tablesByName.get("ActivityGachaPool"), "pool_id"),
      gachaControlById: mapByNumericField(tablesByName.get("ActivityGachaControl"), "id"),
      upgradeActivityRewardById: groupRowsByNumericField(tablesByName.get("ActivityUpgradeActivityReward"), "id"),
      chooseGroupByChestId: groupRowsByNumericField(tablesByName.get("ActivityChooseGroup"), "chest_id"),
      chestUpByChestId: groupRowsByNumericField(tablesByName.get("ActivityChestUp"), "chest_id"),
      summerStoryByStoryId: groupRowsByNumericField(tablesByName.get("ActivitySummerStory"), "story_id"),
      bingoCardByCardId: groupRowsByNumericField(tablesByName.get("ActivityBingoCard"), "card_id"),
      bingoRewardByCardId: groupRowsByNumericField(tablesByName.get("ActivityBingoReward"), "card_id"),
    };

    return {
      resources,
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
  })().catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
  });

  return cachedRepositoryPromise;
}
