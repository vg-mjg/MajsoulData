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
import { loadActivitiesRepository } from "./activities-repository.js";

const overviewCacheByLanguage = new Map();
const detailCacheByLanguageAndId = new Map();

const STRING_PAIR_ITEM_FIELDS = [
  { field: "reward", kind: "reward" },
  { field: "consume", kind: "cost" },
  { field: "itemList", kind: "reward" },
  { field: "spRewards", kind: "reward" },
  { field: "unlockSpotItem", kind: "unlock" },
  { field: "unlockItem", kind: "unlock" },
  { field: "unlockConsume", kind: "cost" },
  { field: "finishReward", kind: "reward" },
  { field: "allFinishReward", kind: "reward" },
  { field: "costItem", kind: "cost" },
  { field: "hiddenReward", kind: "reward" },
  { field: "consumeItem", kind: "cost" },
  { field: "tripReward", kind: "reward" },
  { field: "roundConsume", kind: "cost" },
  { field: "produceItem", kind: "reward" },
  { field: "upgradeItem", kind: "cost" },
  { field: "upgradeReward", kind: "reward" },
];

const ITEM_ID_COUNT_FIELDS = [
  { idField: "rewardId", countField: "rewardCount", kind: "reward" },
  { idField: "consumeId", countField: "consumeCount", kind: "cost" },
  { idField: "itemLimitId", countField: "itemLimitCount", kind: "unlock" },
  { idField: "pointItemId", countField: "pointItemCount", kind: "reward" },
  { idField: "unlockItemId", countField: "unlockItemCount", kind: "unlock" },
  { idField: "ticketItemId", countField: "ticketPrice", kind: "cost" },
];

const SINGLE_ITEM_ID_FIELDS = [
  { field: "keyItemId", kind: "unlock" },
  { field: "staminaItemId", kind: "cost" },
  { field: "specialItemId", kind: "unlock" },
  { field: "consumeItemId", kind: "cost" },
  { field: "workerItemId", kind: "unlock" },
  { field: "pointItem", kind: "reward" },
  { field: "voteItem", kind: "reward" },
];

const ITEM_ID_LIST_FIELDS = [
  { field: "foodItemId", kind: "cost" },
  { field: "giftItemId", kind: "reward" },
  { field: "upItems", kind: "reward" },
];

function safeArray(data) {
  return Array.isArray(data) ? data : [];
}

function tableNameLabel(tableName) {
  return String(tableName || "").replace(/^Activity/, "Activity ");
}

function bannerPathCandidates(rawPath, language) {
  const normalizedPath = stringValue(rawPath).trim().replace(/^\/+/, "");
  if (!normalizedPath) return [];

  const paths = new Set();
  for (const path of expandLocalizedAssetPaths(normalizedPath, language)) {
    paths.add(path);
  }
  paths.add(normalizedPath);

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

function bannerPathLabel(rawPath) {
  const path = stringValue(rawPath).trim();
  if (!path) return "";
  const filename = path.split("/").pop() || path;
  const stem = filename.replace(/\.[^.]+$/, "");
  return stem.replace(/[_-]+/g, " ").trim();
}

function activityDisplayName(activity, banner, language) {
  const localized = localizedFieldValue(activity, "name", language);
  if (localized) return localized;

  const fallbackFromBanner = [
    bannerPathLabel(banner && banner.enterIcon),
    bannerPathLabel(banner && banner.bannerBig),
    bannerPathLabel(banner && banner.bannerLeft),
    bannerPathLabel(banner && banner.bannerLeftIcon),
  ].find((value) => value.length > 0);
  if (fallbackFromBanner) return fallbackFromBanner;

  return `Activity #${numberValue(activity && activity.id)}`;
}

function activityBannerCandidates(activity, banner, repository, language) {
  const bannerEntry = banner || repository.bannerByActivityId.get(numberValue(activity && activity.id)) || null;
  if (!bannerEntry) return [];

  const rawPaths = [
    bannerEntry.bannerBig,
    bannerEntry.bannerLeft,
    bannerEntry.enterIcon,
    bannerEntry.bannerLeftIcon,
  ]
    .map((value) => stringValue(value).trim())
    .filter(Boolean);

  const candidatePaths = [];
  const seen = new Set();
  for (const rawPath of rawPaths) {
    for (const path of bannerPathCandidates(rawPath, language)) {
      if (seen.has(path)) continue;
      seen.add(path);
      candidatePaths.push(path);
    }
  }

  return assetCandidatesFromPaths(candidatePaths, repository.resourceManifest);
}

function collectDirectTableLinks(repository, activityId) {
  const links = [];
  for (const [tableName, groupedRows] of repository.activityRowsByTable) {
    const rows = groupedRows.get(activityId);
    if (!rows || rows.length === 0) continue;
    links.push({
      tableName,
      scope: "direct",
      relation: "activityId",
      rows,
    });
  }
  return links;
}

function collectDerivedTableLinks(repository, directLinks) {
  const directRowsByTable = new Map(directLinks.map((link) => [link.tableName, link.rows]));
  const derivedByKey = new Map();

  function addDerived(tableName, relation, rows) {
    const safeRows = safeArray(rows);
    if (safeRows.length === 0) return;

    const key = `${tableName}|${relation}`;
    if (!derivedByKey.has(key)) {
      derivedByKey.set(key, {
        tableName,
        scope: "derived",
        relation,
        rows: [],
      });
    }

    const bucket = derivedByKey.get(key);
    const seen = new Set(bucket.rows);
    for (const row of safeRows) {
      if (seen.has(row)) continue;
      seen.add(row);
      bucket.rows.push(row);
    }
  }

  for (const row of directRowsByTable.get("ActivityArenaActivity") || []) {
    const rewardGroup = numberValue(row.rewardGroup);
    if (rewardGroup > 0) {
      addDerived("ActivityArenaReward", `groupId=${rewardGroup}`, repository.indexes.arenaRewardByGroupId.get(rewardGroup));
    }
    const displayGroup = numberValue(row.arenaRewardDisplayGroup);
    if (displayGroup > 0) {
      addDerived(
        "ActivityArenaRewardDisplay",
        `groupId=${displayGroup}`,
        repository.indexes.arenaRewardDisplayByGroupId.get(displayGroup),
      );
    }
  }

  for (const row of directRowsByTable.get("ActivityMineActivity") || []) {
    const rewardGroup = numberValue(row.rewardGroup);
    if (rewardGroup > 0) {
      addDerived("ActivityMineReward", `groupId=${rewardGroup}`, repository.indexes.mineRewardByGroupId.get(rewardGroup));
    }
  }

  for (const row of directRowsByTable.get("ActivityRank") || []) {
    const rewardId = numberValue(row.rankRewardId);
    const rewardRow = repository.indexes.rankRewardById.get(rewardId);
    if (rewardRow) {
      addDerived("ActivityRankReward", `id=${rewardId}`, [rewardRow]);
    }
  }

  for (const row of directRowsByTable.get("ActivityRandomTaskInfo") || []) {
    const poolId = numberValue(row.poolId);
    if (poolId > 0) {
      addDerived("ActivityRandomTaskPool", `poolId=${poolId}`, repository.indexes.randomTaskPoolByPoolId.get(poolId));
    }
  }

  for (const row of directRowsByTable.get("ActivityRichmanInfo") || []) {
    const mapId = numberValue(row.mapId);
    if (mapId > 0) {
      addDerived("ActivityRichmanMap", `mapId=${mapId}`, repository.indexes.richmanMapByMapId.get(mapId));
    }

    const rewardSeqId = numberValue(row.finishRewardSeq);
    if (rewardSeqId > 0) {
      addDerived(
        "ActivityRichmanRewardSeq",
        `id=${rewardSeqId}`,
        repository.indexes.richmanRewardSeqById.get(rewardSeqId),
      );
    }
  }

  for (const row of directRowsByTable.get("ActivityGachaActivityInfo") || []) {
    const poolId = numberValue(row.gachaPool);
    if (poolId > 0) {
      addDerived("ActivityGachaPool", `poolId=${poolId}`, repository.indexes.gachaPoolByPoolId.get(poolId));
    }

    const controlId = numberValue(row.gachaControl);
    const controlRow = repository.indexes.gachaControlById.get(controlId);
    if (controlRow) {
      addDerived("ActivityGachaControl", `id=${controlId}`, [controlRow]);
    }
  }

  for (const row of directRowsByTable.get("ActivityStoryActivity") || []) {
    const storyId = numberValue(row.storyId);
    if (storyId > 0) {
      addDerived("ActivityStoryEnding", `storyId=${storyId}`, repository.indexes.storyEndingByStoryId.get(storyId));
      addDerived("ActivitySummerStory", `storyId=${storyId}`, repository.indexes.summerStoryByStoryId.get(storyId));
    }
  }

  for (const row of directRowsByTable.get("ActivityUpgradeActivity") || []) {
    const rewardIds = safeArray(row.rewardId).map((value) => numberValue(value)).filter((value) => value > 0);
    for (const rewardId of rewardIds) {
      addDerived(
        "ActivityUpgradeActivityReward",
        `id=${rewardId}`,
        repository.indexes.upgradeActivityRewardById.get(rewardId),
      );
    }
  }

  for (const tableName of ["ActivityChooseUpActivity", "ActivityChooseGroupUpActivity"]) {
    for (const row of directRowsByTable.get(tableName) || []) {
      const chestId = numberValue(row.baseChestId);
      if (chestId <= 0) continue;
      addDerived("ActivityChooseGroup", `chestId=${chestId}`, repository.indexes.chooseGroupByChestId.get(chestId));
      addDerived("ActivityChestUp", `chestId=${chestId}`, repository.indexes.chestUpByChestId.get(chestId));
    }
  }

  for (const row of directRowsByTable.get("ActivityBingoInfo") || []) {
    const cardId = numberValue(row.cardId);
    if (cardId <= 0) continue;
    addDerived("ActivityBingoCard", `cardId=${cardId}`, repository.indexes.bingoCardByCardId.get(cardId));
    addDerived("ActivityBingoReward", `cardId=${cardId}`, repository.indexes.bingoRewardByCardId.get(cardId));
  }

  return Array.from(derivedByKey.values());
}

function compactValue(value) {
  if (Array.isArray(value)) {
    if (value.length <= 8) return value;
    return [...value.slice(0, 8), "..."];
  }
  if (value && typeof value === "object") {
    return "[Object]";
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  }
  return value;
}

function compactRowPreview(row) {
  const output = {};
  if (!row || typeof row !== "object") return output;
  const keys = Object.keys(row).slice(0, 14);
  for (const key of keys) {
    output[key] = compactValue(row[key]);
  }
  return output;
}

function tableSampleKeys(rows) {
  const keySet = new Set();
  for (const row of (rows || []).slice(0, 6)) {
    if (!row || typeof row !== "object") continue;
    for (const key of Object.keys(row)) {
      keySet.add(key);
      if (keySet.size >= 16) {
        return Array.from(keySet);
      }
    }
  }
  return Array.from(keySet);
}

function parseNumericIds(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => numberValue(entry))
      .filter((entry) => entry > 0);
  }
  const numeric = numberValue(value);
  return numeric > 0 ? [numeric] : [];
}

function resolveItemRecord(repository, language, itemId) {
  const normalizedItemId = numberValue(itemId);
  const entry = repository.itemEntryById.get(normalizedItemId) || null;
  const name = entry
    ? localizedNameFromEntry(entry, language, normalizedItemId)
    : `#${normalizedItemId}`;
  const imageCandidates = entry
    ? itemIconCandidates(entry, repository.resourceManifest, language)
    : [];

  return {
    id: normalizedItemId,
    name,
    imageCandidates,
  };
}

function addItemReference(bucket, repository, language, kind, itemId, count, sourceField) {
  const normalizedKind = bucket[kind] ? kind : "other";
  const normalizedItemId = numberValue(itemId);
  if (normalizedItemId <= 0) return;

  const amount = numberValue(count);
  const resolvedCount = amount > 0 ? amount : 1;
  if (!bucket[normalizedKind].has(normalizedItemId)) {
    const resolved = resolveItemRecord(repository, language, normalizedItemId);
    bucket[normalizedKind].set(normalizedItemId, {
      id: resolved.id,
      name: resolved.name,
      imageCandidates: resolved.imageCandidates,
      count: 0,
      sources: new Set(),
    });
  }

  const entry = bucket[normalizedKind].get(normalizedItemId);
  entry.count += resolvedCount;
  if (sourceField) {
    entry.sources.add(sourceField);
  }
}

function collectItemReferencesFromRows(rows, repository, language) {
  const bucket = {
    reward: new Map(),
    cost: new Map(),
    unlock: new Map(),
    other: new Map(),
  };

  for (const row of rows || []) {
    if (!row || typeof row !== "object") continue;

    for (const rule of ITEM_ID_COUNT_FIELDS) {
      if (!(rule.idField in row)) continue;
      if (!(rule.countField in row)) continue;
      const ids = parseNumericIds(row[rule.idField]);
      if (ids.length === 0) continue;

      const counts = parseNumericIds(row[rule.countField]);
      for (let index = 0; index < ids.length; index += 1) {
        addItemReference(
          bucket,
          repository,
          language,
          rule.kind,
          ids[index],
          counts[index] || counts[0] || 1,
          rule.idField,
        );
      }
    }

    for (const rule of SINGLE_ITEM_ID_FIELDS) {
      if (!(rule.field in row)) continue;
      for (const itemId of parseNumericIds(row[rule.field])) {
        addItemReference(bucket, repository, language, rule.kind, itemId, 1, rule.field);
      }
    }

    for (const rule of ITEM_ID_LIST_FIELDS) {
      if (!(rule.field in row)) continue;
      for (const itemId of parseNumericIds(row[rule.field])) {
        addItemReference(bucket, repository, language, rule.kind, itemId, 1, rule.field);
      }
    }

    for (const rule of STRING_PAIR_ITEM_FIELDS) {
      if (!(rule.field in row)) continue;

      const value = row[rule.field];
      const values = Array.isArray(value) ? value : [value];
      for (const entry of values) {
        const text = stringValue(entry).trim();
        if (!text) continue;

        const pairs = parseItemAmountPairs(text);
        if (pairs.length > 0) {
          for (const pair of pairs) {
            addItemReference(
              bucket,
              repository,
              language,
              rule.kind,
              pair.itemId,
              pair.count,
              rule.field,
            );
          }
          continue;
        }

        const itemId = numberValue(text);
        if (itemId > 0) {
          addItemReference(bucket, repository, language, rule.kind, itemId, 1, rule.field);
        }
      }
    }
  }

  const finalized = {};
  for (const [kind, values] of Object.entries(bucket)) {
    finalized[kind] = Array.from(values.values())
      .map((entry) => ({
        ...entry,
        sources: Array.from(entry.sources).sort(),
      }))
      .sort((left, right) => {
        if (left.count !== right.count) return right.count - left.count;
        return left.id - right.id;
      });
  }

  return finalized;
}

function activityOverviewModel(activity, repository, language) {
  const activityId = numberValue(activity && activity.id);
  const type = stringValue(activity && activity.type).trim() || "unknown";
  const banner = repository.bannerByActivityId.get(activityId) || null;
  const directLinks = collectDirectTableLinks(repository, activityId);
  const linkedRowCount = directLinks.reduce((sum, link) => sum + link.rows.length, 0);
  const hasLocalizedName = localizedFieldValue(activity, "name", language).length > 0;
  const primaryBannerPath = [
    stringValue(banner && banner.bannerBig).trim(),
    stringValue(banner && banner.bannerLeft).trim(),
    stringValue(banner && banner.enterIcon).trim(),
    stringValue(banner && banner.bannerLeftIcon).trim(),
  ].find(Boolean) || "";
  const bannerCandidates = activityBannerCandidates(activity, banner, repository, language);
  const hasBannerVisual = primaryBannerPath.length > 0;
  const isMeaningful = hasLocalizedName || hasBannerVisual;

  return {
    id: activityId,
    type,
    needPopout: numberValue(activity && activity.needPopout),
    name: activityDisplayName(activity, banner, language),
    hasLocalizedName,
    hasBannerVisual,
    isMeaningful,
    bannerPath: primaryBannerPath,
    bannerType: numberValue(banner && banner.bannerType),
    bannerSort: numberValue(banner && banner.sort),
    timeRemind: numberValue(banner && banner.timeRemind),
    bannerCandidates,
    linkedTableCount: directLinks.length,
    linkedRowCount,
    topTables: directLinks
      .map((link) => ({ tableName: link.tableName, rowCount: link.rows.length }))
      .sort((left, right) => right.rowCount - left.rowCount)
      .slice(0, 3),
  };
}

function activityDetailModel(activityId, repository, language) {
  const activity = repository.activityById.get(activityId) || null;
  if (!activity) return null;

  const banner = repository.bannerByActivityId.get(activityId) || null;
  const directLinks = collectDirectTableLinks(repository, activityId);
  const derivedLinks = collectDerivedTableLinks(repository, directLinks);
  const allLinks = [...directLinks, ...derivedLinks];

  const uniqueRows = new Set();
  for (const link of allLinks) {
    for (const row of link.rows) {
      uniqueRows.add(row);
    }
  }

  const itemReferences = collectItemReferencesFromRows(Array.from(uniqueRows), repository, language);
  const tableSummaries = allLinks
    .map((link) => ({
      tableName: link.tableName,
      tableLabel: tableNameLabel(link.tableName),
      scope: link.scope,
      relation: link.relation,
      rowCount: link.rows.length,
      sampleKeys: tableSampleKeys(link.rows),
      previewRows: link.rows.slice(0, 2).map((row) => compactRowPreview(row)),
    }))
    .sort((left, right) => {
      if (left.scope !== right.scope) {
        return left.scope === "direct" ? -1 : 1;
      }
      if (left.rowCount !== right.rowCount) {
        return right.rowCount - left.rowCount;
      }
      return left.tableName.localeCompare(right.tableName);
    });

  const directTableCount = directLinks.length;
  const derivedTableCount = derivedLinks.length;
  const directRowCount = directLinks.reduce((sum, link) => sum + link.rows.length, 0);
  const derivedRowCount = derivedLinks.reduce((sum, link) => sum + link.rows.length, 0);

  return {
    id: activityId,
    type: stringValue(activity.type).trim() || "unknown",
    needPopout: numberValue(activity.needPopout),
    name: activityDisplayName(activity, banner, language),
    banner: banner
      ? {
          id: numberValue(banner.id),
          sort: numberValue(banner.sort),
          bannerType: numberValue(banner.bannerType),
          timeRemind: numberValue(banner.timeRemind),
          enterIcon: stringValue(banner.enterIcon),
          bannerBig: stringValue(banner.bannerBig),
          bannerLeft: stringValue(banner.bannerLeft),
          bannerLeftSelected: stringValue(banner.bannerLeftSelected),
          bannerLeftIcon: stringValue(banner.bannerLeftIcon),
          candidates: activityBannerCandidates(activity, banner, repository, language),
        }
      : null,
    stats: {
      directTableCount,
      derivedTableCount,
      directRowCount,
      derivedRowCount,
      totalTableCount: tableSummaries.length,
      totalRowCount: directRowCount + derivedRowCount,
      uniqueRowCount: uniqueRows.size,
    },
    itemReferences,
    tables: tableSummaries,
  };
}

export async function loadActivitiesData(language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  if (overviewCacheByLanguage.has(normalizedLanguage)) {
    return overviewCacheByLanguage.get(normalizedLanguage);
  }

  const promise = loadActivitiesRepository()
    .then((repository) => {
      const allActivities = repository.activities
        .map((activity) => activityOverviewModel(activity, repository, normalizedLanguage))
        .sort((left, right) => right.id - left.id);
      const meaningfulActivities = allActivities.filter((activity) => activity.isMeaningful);
      const activities = meaningfulActivities.length > 0 ? meaningfulActivities : allActivities;

      const typeCounts = new Map();
      for (const activity of activities) {
        typeCounts.set(activity.type, numberValue(typeCounts.get(activity.type)) + 1);
      }

      return {
        activities,
        typeCounts: Array.from(typeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((left, right) => {
            if (left.count !== right.count) return right.count - left.count;
            return left.type.localeCompare(right.type);
          }),
        summary: {
          totalActivities: allActivities.length,
          shownActivities: activities.length,
          hiddenActivities: allActivities.length - activities.length,
          types: typeCounts.size,
          withName: activities.filter((activity) => activity.hasLocalizedName).length,
          withBanner: activities.filter((activity) => activity.hasBannerVisual).length,
        },
      };
    })
    .catch((error) => {
      if (overviewCacheByLanguage.get(normalizedLanguage) === promise) {
        overviewCacheByLanguage.delete(normalizedLanguage);
      }
      throw error;
    });

  overviewCacheByLanguage.set(normalizedLanguage, promise);
  return promise;
}

export async function loadActivityDetail(activityId, language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  const normalizedActivityId = numberValue(activityId);
  if (normalizedActivityId <= 0) return null;

  const cacheKey = `${normalizedLanguage}:${normalizedActivityId}`;
  if (detailCacheByLanguageAndId.has(cacheKey)) {
    return detailCacheByLanguageAndId.get(cacheKey);
  }

  const promise = loadActivitiesRepository()
    .then((repository) => activityDetailModel(normalizedActivityId, repository, normalizedLanguage))
    .catch((error) => {
      if (detailCacheByLanguageAndId.get(cacheKey) === promise) {
        detailCacheByLanguageAndId.delete(cacheKey);
      }
      throw error;
    });
  detailCacheByLanguageAndId.set(cacheKey, promise);
  return promise;
}
