import { itemIconCandidates, numberValue } from "./item-utils.js";
import { loadItemsRepository } from "./items-repository.js";
import { normalizeUiLanguage } from "../../utils.js";

const itemsCacheByLanguage = new Map();

const EMPTY_USAGE_COUNTS = {
  packageContents: 0,
  packageContainers: 0,
  exchangeSpend: 0,
  exchangeReceive: 0,
  shopListings: 0,
  shopPricing: 0,
  mallResources: 0,
  sourceLimits: 0,
  composeUsage: 0,
  characterExchangeUsage: 0,
  characterMaterialUsage: 0,
};

function makeUsageCounts(repository, itemId) {
  return {
    packageContents: (repository.packageByItemId.get(itemId) || []).length,
    packageContainers: (repository.packageByContentItemId.get(itemId) || []).length,
    exchangeSpend: (repository.exchangeSpendByItemId.get(itemId) || []).length,
    exchangeReceive: (repository.exchangeReceiveByItemId.get(itemId) || []).length,
    shopListings: (repository.shopsByItemId.get(itemId) || []).length,
    shopPricing: (repository.shopPriceByItemId.get(itemId) || []).length,
    mallResources: (repository.mallByResourceId.get(itemId) || []).length,
    sourceLimits: (repository.sourceLimitsByItemId.get(itemId) || []).length,
    composeUsage: (repository.composeByItemId.get(itemId) || []).length,
    characterExchangeUsage: (repository.characterExchangeByItemId.get(itemId) || []).length,
    characterMaterialUsage: (repository.characterMaterialByItemId.get(itemId) || []).length,
  };
}

function makeItemModel(entry, kind, repository, language) {
  const itemId = numberValue(entry.id);
  const sourceType = String(entry.sourceType || "").trim().toLowerCase();
  return {
    id: itemId,
    kind,
    sort: numberValue(entry.sort),
    category: numberValue(entry.category),
    type: numberValue(entry.type),
    func: String(entry.func || "").trim(),
    canSell: numberValue(entry.can_sell),
    isUnique: numberValue(entry.is_unique),
    maxStack: numberValue(entry.max_stack),
    name_en: String(entry.name_en || ""),
    name_jp: String(entry.name_jp || ""),
    name_chs: String(entry.name_chs || ""),
    name_chs_t: String(entry.name_chs_t || ""),
    name_kr: String(entry.name_kr || ""),
    isTitleDefinition: sourceType === "title",
    imageCandidates: itemIconCandidates(entry, repository.resources, language),
    usageCounts: makeUsageCounts(repository, itemId),
  };
}

function compareItems(a, b) {
  if (a.kind !== b.kind) {
    if (a.kind === "currency") return -1;
    if (b.kind === "currency") return 1;
  }
  if (a.sort !== b.sort) return a.sort - b.sort;
  return a.id - b.id;
}

export async function loadItems(language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  if (itemsCacheByLanguage.has(normalizedLanguage)) {
    return itemsCacheByLanguage.get(normalizedLanguage);
  }

  const promise = loadItemsRepository()
    .then((repository) => {
      const currencyModels = (repository.currencies || [])
        .map((entry) => makeItemModel(entry, "currency", repository, normalizedLanguage));
      const itemModels = (repository.items || [])
        .map((entry) => makeItemModel(entry, "item", repository, normalizedLanguage));
      const titleModels = (repository.titleEntries || [])
        .map((entry) => makeItemModel(entry, "item", repository, normalizedLanguage));

      return [...currencyModels, ...itemModels, ...titleModels].sort(compareItems);
    })
    .catch((error) => {
      if (itemsCacheByLanguage.get(normalizedLanguage) === promise) {
        itemsCacheByLanguage.delete(normalizedLanguage);
      }
      throw error;
    });

  itemsCacheByLanguage.set(normalizedLanguage, promise);
  return promise;
}
