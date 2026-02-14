import { fetchJson } from "../core/http.js";
import { numberValue, parseItemAmountPairs, stringValue } from "./item-utils.js";

const URLS = {
  resversion: new URL("../../resversion.json", import.meta.url),
  itemDefinitionItem: new URL("../../data/ItemDefinitionItem.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/ItemDefinitionCurrency.json", import.meta.url),
  itemDefinitionTitle: new URL("../../data/ItemDefinitionTitle.json", import.meta.url),
  itemDefinitionLoadingImage: new URL("../../data/ItemDefinitionLoadingImage.json", import.meta.url),
  audioBgm: new URL("../../data/AudioBgm.json", import.meta.url),
  itemDefinitionItemPackage: new URL("../../data/ItemDefinitionItemPackage.json", import.meta.url),
  itemDefinitionSourceLimit: new URL("../../data/ItemDefinitionSourceLimit.json", import.meta.url),
  exchangeExchange: new URL("../../data/ExchangeExchange.json", import.meta.url),
  exchangeSearch: new URL("../../data/ExchangeSearchexchange.json", import.meta.url),
  exchangeFushiquan: new URL("../../data/ExchangeFushiquanexchange.json", import.meta.url),
  shopsGoods: new URL("../../data/ShopsGoods.json", import.meta.url),
  mallGoods: new URL("../../data/MallGoods.json", import.meta.url),
  composeCharaCompose: new URL("../../data/ComposeCharacompose.json", import.meta.url),
  itemDefinitionCharacter: new URL("../../data/ItemDefinitionCharacter.json", import.meta.url),
};

let cachedRepositoryPromise = null;

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

function parseShopPriceEntries(shops) {
  const entries = [];
  for (const shop of shops || []) {
    const prices = parseItemAmountPairs(shop.price);
    for (const price of prices) {
      entries.push({
        shopId: numberValue(shop.id),
        itemId: price.itemId,
        count: price.count,
        raw: stringValue(shop.price),
      });
    }
  }
  return entries;
}

function parseCharacterMaterialEntries(characters) {
  const entries = [];
  for (const character of characters || []) {
    const characterId = numberValue(character.id);
    if (characterId <= 0) continue;

    const rawMaterial = stringValue(character.star_5Material);
    if (!rawMaterial) continue;

    const materials = parseItemAmountPairs(rawMaterial);
    for (const material of materials) {
      entries.push({
        characterId,
        itemId: material.itemId,
        count: material.count,
        raw: rawMaterial,
      });
    }
  }
  return entries;
}

function parseCharacterExchangeEntries(characters) {
  return (characters || [])
    .map((character) => ({
      characterId: numberValue(character.id),
      itemId: numberValue(character.exchangeItemId),
      count: numberValue(character.exchangeItemNum),
    }))
    .filter((entry) => entry.characterId > 0 && entry.itemId > 0 && entry.count > 0);
}

function buildLoadingImageByUnlockItemId(loadingImages) {
  const mapping = new Map();
  for (const row of loadingImages || []) {
    const unlockItems = Array.isArray(row.unlockItems) ? row.unlockItems : [];
    for (const unlockItem of unlockItems) {
      const itemId = numberValue(unlockItem);
      if (itemId <= 0 || mapping.has(itemId)) continue;
      mapping.set(itemId, row);
    }
  }
  return mapping;
}

function mapTitleEntries(titleRows) {
  return (titleRows || []).map((row) => ({
    ...row,
    category: 7,
    type: 0,
    sort: numberValue(row.priority),
    maxStack: 1,
    isUnique: 1,
    canSell: 0,
    func: "",
    access: "",
    accessinfo: 0,
    itemExpire: "",
    regionLimit: 0,
    crossView: numberValue(row.crossView),
    databaseCache: 0,
    sourceType: "title",
    iconOriginal: stringValue(row.icon),
    iconItem: stringValue(row.iconItem || row.icon),
    // Keep title icon field as item-style icon for list rendering compatibility.
    icon: stringValue(row.iconItem || row.icon),
  }));
}

function buildAudioBgmByUnlockItemId(audioBgmRows) {
  const mapping = new Map();
  for (const row of audioBgmRows || []) {
    const itemId = numberValue(row.unlockItem);
    if (itemId <= 0 || mapping.has(itemId)) continue;
    mapping.set(itemId, row);
  }
  return mapping;
}

export async function loadItemsRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = Promise.all([
    fetchJson(URLS.resversion),
    fetchJson(URLS.itemDefinitionItem),
    fetchJson(URLS.itemDefinitionCurrency),
    fetchJson(URLS.itemDefinitionTitle),
    fetchJson(URLS.itemDefinitionLoadingImage),
    fetchJson(URLS.audioBgm),
    fetchJson(URLS.itemDefinitionItemPackage),
    fetchJson(URLS.itemDefinitionSourceLimit),
    fetchJson(URLS.exchangeExchange),
    fetchJson(URLS.exchangeSearch),
    fetchJson(URLS.exchangeFushiquan),
    fetchJson(URLS.shopsGoods),
    fetchJson(URLS.mallGoods),
    fetchJson(URLS.composeCharaCompose),
    fetchJson(URLS.itemDefinitionCharacter),
  ]).then(([
    resversion,
    itemDefinitionItem,
    itemDefinitionCurrency,
    itemDefinitionTitle,
    itemDefinitionLoadingImage,
    audioBgm,
    itemDefinitionItemPackage,
    itemDefinitionSourceLimit,
    exchangeExchange,
    exchangeSearch,
    exchangeFushiquan,
    shopsGoods,
    mallGoods,
    composeCharaCompose,
    itemDefinitionCharacter,
  ]) => {

    const resourceManifest = resversion && resversion.res ? resversion.res : {};

    const items = Array.isArray(itemDefinitionItem) ? itemDefinitionItem : [];
    const currencies = Array.isArray(itemDefinitionCurrency) ? itemDefinitionCurrency : [];
    const titleRows = Array.isArray(itemDefinitionTitle) ? itemDefinitionTitle : [];
    const titleEntries = mapTitleEntries(titleRows);
    const loadingImages = Array.isArray(itemDefinitionLoadingImage) ? itemDefinitionLoadingImage : [];
    const audioBgmRows = Array.isArray(audioBgm) ? audioBgm : [];
    const packageEntries = Array.isArray(itemDefinitionItemPackage) ? itemDefinitionItemPackage : [];
    const sourceLimits = Array.isArray(itemDefinitionSourceLimit) ? itemDefinitionSourceLimit : [];
    const exchangeBase = Array.isArray(exchangeExchange) ? exchangeExchange : [];
    const exchangeSearchRows = Array.isArray(exchangeSearch) ? exchangeSearch : [];
    const exchangeFushiquanRows = Array.isArray(exchangeFushiquan) ? exchangeFushiquan : [];
    const shops = Array.isArray(shopsGoods) ? shopsGoods : [];
    const mallRows = Array.isArray(mallGoods) ? mallGoods : [];
    const composeRows = Array.isArray(composeCharaCompose) ? composeCharaCompose : [];
    const characters = Array.isArray(itemDefinitionCharacter) ? itemDefinitionCharacter : [];
    const itemEntries = [...currencies, ...items, ...titleEntries];

    const exchangeRows = [
      ...exchangeBase.map((entry) => ({ ...entry, exchangeType: "exchange" })),
      ...exchangeSearchRows.map((entry) => ({ ...entry, exchangeType: "search" })),
      ...exchangeFushiquanRows.map((entry) => ({ ...entry, exchangeType: "fushiquan" })),
    ];

    const shopPriceEntries = parseShopPriceEntries(shops);
    const characterMaterialEntries = parseCharacterMaterialEntries(characters);
    const characterExchangeEntries = parseCharacterExchangeEntries(characters);

    const itemById = new Map([...items, ...titleEntries].map((item) => [numberValue(item.id), item]));
    const currencyById = new Map(currencies.map((currency) => [numberValue(currency.id), currency]));
    const entryById = new Map(itemEntries.map((entry) => [numberValue(entry.id), entry]));
    const characterById = new Map(characters.map((character) => [numberValue(character.id), character]));
    const audioBgmById = new Map(audioBgmRows.map((row) => [numberValue(row.id), row]));
    const shopById = new Map(shops.map((shop) => [numberValue(shop.id), shop]));

    return {
      resourceManifest,
      items,
      currencies,
      titleEntries,
      loadingImages,
      audioBgmRows,
      itemEntries,
      packageEntries,
      sourceLimits,
      exchangeRows,
      shops,
      mallRows,
      composeRows,
      characters,
      shopPriceEntries,
      characterMaterialEntries,
      characterExchangeEntries,
      itemById,
      currencyById,
      entryById,
      characterById,
      audioBgmById,
      shopById,
      audioBgmByUnlockItemId: buildAudioBgmByUnlockItemId(audioBgmRows),
      loadingImageByUnlockItemId: buildLoadingImageByUnlockItemId(loadingImages),
      packageByItemId: groupBy(packageEntries, (entry) => numberValue(entry.id)),
      packageByContentItemId: groupBy(packageEntries, (entry) => numberValue(entry.resId)),
      sourceLimitsByItemId: groupBy(sourceLimits, (entry) => numberValue(entry.itemId)),
      exchangeSpendByItemId: groupBy(exchangeRows, (entry) => numberValue(entry.sourceCurrency)),
      exchangeReceiveByItemId: groupBy(exchangeRows, (entry) => numberValue(entry.targetCurrency)),
      shopsByItemId: groupBy(shops, (entry) => numberValue(entry.itemId)),
      shopPriceByItemId: groupBy(shopPriceEntries, (entry) => numberValue(entry.itemId)),
      mallByResourceId: groupBy(mallRows, (entry) => numberValue(entry.resourceId)),
      composeByItemId: groupBy(composeRows, (entry) => numberValue(entry.itemId)),
      characterExchangeByItemId: groupBy(characterExchangeEntries, (entry) => numberValue(entry.itemId)),
      characterMaterialByItemId: groupBy(characterMaterialEntries, (entry) => numberValue(entry.itemId)),
    };
  }).catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
  });

  return cachedRepositoryPromise;
}
