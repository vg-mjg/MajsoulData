import { itemIconCandidates, loadingSpriteDisplayName, numberValue, stringValue } from "./item-utils.js";
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

function makeLoadingSpriteModel(sprite, index) {
  const id = -(index + 1);
  const name = loadingSpriteDisplayName(sprite.filename);
  return {
    id,
    kind: "loading_sprite",
    sort: sprite.sort,
    category: 9,
    type: sprite.type,
    func: "",
    canSell: 0,
    isUnique: 0,
    maxStack: 0,
    nameEn: name,
    nameJp: name,
    nameChs: name,
    nameChsT: name,
    nameKr: name,
    isTitleDefinition: false,
    imageCandidates: [{ path: sprite.path, prefix: stringValue(sprite.prefix) }],
    usageCounts: EMPTY_USAGE_COUNTS,
  };
}

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
    canSell: numberValue(entry.canSell),
    isUnique: numberValue(entry.isUnique),
    maxStack: numberValue(entry.maxStack),
    nameEn: String(entry.nameEn || ""),
    nameJp: String(entry.nameJp || ""),
    nameChs: String(entry.nameChs || ""),
    nameChsT: String(entry.nameChsT || ""),
    nameKr: String(entry.nameKr || ""),
    isTitleDefinition: sourceType === "title",
    imageCandidates: itemIconCandidates(entry, repository.resourceManifest, language),
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
      const loadingSpriteModels = (repository.loadingSprites || [])
        .map((sprite, index) => makeLoadingSpriteModel(sprite, index));

      return [...currencyModels, ...itemModels, ...titleModels, ...loadingSpriteModels].sort(compareItems);
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
