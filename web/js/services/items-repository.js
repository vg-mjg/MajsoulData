import { fetchJson } from "../core/http.js";
import { rowsOf } from "../../utils.js";
import { loadResources } from "./resources.js";
import { numberValue, parseItemAmountPairs, stringValue } from "./item-utils.js";

const URLS = {
  itemDefinitionItem: new URL("../../data/item_definition/item.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/item_definition/currency.json", import.meta.url),
  itemDefinitionTitle: new URL("../../data/item_definition/title.json", import.meta.url),
  itemDefinitionLoadingImage: new URL("../../data/item_definition/loading_image.json", import.meta.url),
  audioBgm: new URL("../../data/audio/bgm.json", import.meta.url),
  itemDefinitionItemPackage: new URL("../../data/item_definition/item_package.json", import.meta.url),
  itemDefinitionSourceLimit: new URL("../../data/item_definition/source_limit.json", import.meta.url),
  exchangeExchange: new URL("../../data/exchange/exchange.json", import.meta.url),
  exchangeSearch: new URL("../../data/exchange/searchexchange.json", import.meta.url),
  exchangeFushiquan: new URL("../../data/exchange/fushiquanexchange.json", import.meta.url),
  shopsGoods: new URL("../../data/shops/goods.json", import.meta.url),
  mallGoods: new URL("../../data/mall/goods.json", import.meta.url),
  composeCharaCompose: new URL("../../data/compose/characompose.json", import.meta.url),
  itemDefinitionCharacter: new URL("../../data/item_definition/character.json", import.meta.url),
  itemDefinitionView: new URL("../../data/item_definition/view.json", import.meta.url),
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

    const rawMaterial = stringValue(character.star_5_material);
    if (!rawMaterial) continue;

    const materials = parseItemAmountPairs(rawMaterial);
    for (const material of materials) {
      entries.push({ characterId, itemId: material.itemId, count: material.count, raw: rawMaterial });
    }
  }
  return entries;
}

function parseCharacterExchangeEntries(characters) {
  return (characters || [])
    .map((character) => ({
      characterId: numberValue(character.id),
      itemId: numberValue(character.exchange_item_id),
      count: numberValue(character.exchange_item_num),
    }))
    .filter((entry) => entry.characterId > 0 && entry.itemId > 0 && entry.count > 0);
}

function buildLoadingImageByUnlockItemId(loadingImages) {
  const mapping = new Map();
  for (const row of loadingImages || []) {
    const unlockItems = Array.isArray(row.unlock_items) ? row.unlock_items : [];
    for (const unlockItem of unlockItems) {
      const itemId = numberValue(unlockItem);
      if (itemId <= 0 || mapping.has(itemId)) continue;
      mapping.set(itemId, row);
    }
  }
  return mapping;
}

function deduplicateLoadingScreens(items) {
  const byIcon = new Map();
  for (const item of items || []) {
    if (Number(item.category) !== 8) continue;
    const icon = stringValue(item.icon);
    if (!icon) continue;
    const existing = byIcon.get(icon);
    if (!existing) {
      byIcon.set(icon, item);
      continue;
    }
    const existingExpiry = stringValue(existing.item_expire);
    const itemExpiry = stringValue(item.item_expire);
    if (!itemExpiry && existingExpiry) {
      byIcon.set(icon, item);
    }
  }
  return byIcon;
}

function filterItems(rawItems) {
  const loadingScreenMap = deduplicateLoadingScreens(rawItems);
  return rawItems.filter((item) => {
    if (Number(item.category) !== 8) return true;
    const icon = stringValue(item.icon);
    return !icon || loadingScreenMap.get(icon) === item;
  });
}

function mapTitleEntries(titleRows) {
  return (titleRows || []).map((row) => ({
    ...row,
    category: 7,
    type: 0,
    sort: numberValue(row.priority),
    max_stack: 1,
    is_unique: 1,
    can_sell: 0,
    func: "",
    access: "",
    accessinfo: 0,
    item_expire: "",
    region_limit: 0,
    cross_view: numberValue(row.cross_view),
    database_cache: 0,
    sourceType: "title",
    icon_original: stringValue(row.icon),
    icon_item: stringValue(row.icon_item || row.icon),
    // Keep title icon field as item-style icon for list rendering compatibility.
    icon: stringValue(row.icon_item || row.icon),
  }));
}

function buildAudioBgmByUnlockItemId(audioBgmRows) {
  const mapping = new Map();
  for (const row of audioBgmRows || []) {
    const itemId = numberValue(row.unlock_item);
    if (itemId <= 0 || mapping.has(itemId)) continue;
    mapping.set(itemId, row);
  }
  return mapping;
}

const LOADING_SPRITE_CATEGORY_ORDER = { table: 0, left: 1, mid: 2, right: 3 };
const LOADING_SPRITE_ID_BASE = { table: -1000, left: -2000, mid: -3000, right: -4000 };
const LOADING_SPRITE_KEY_PATTERN =
  /^extendRes\/loading\/common\/(table|left|mid|right)_(\d+)\.png$/;

function buildLoadingSprites(resources) {
  const images = resources && resources.images && typeof resources.images === "object"
    ? resources.images
    : {};
  const sprites = [];

  for (const key of Object.keys(images)) {
    const match = key.match(LOADING_SPRITE_KEY_PATTERN);
    if (!match) continue;

    const category = match[1];
    const index = numberValue(match[2]);
    const order = LOADING_SPRITE_CATEGORY_ORDER[category];
    const idBase = LOADING_SPRITE_ID_BASE[category];

    sprites.push({
      id: idBase - index - 1,
      key,
      filename: `${category}_${index}.png`,
      category,
      index,
      type: order,
      sort: order * 1000 + index,
    });
  }

  return sprites.sort((a, b) => a.sort - b.sort || a.id - b.id);
}

export async function loadItemsRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = Promise.all([
    loadResources(),
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
    fetchJson(URLS.itemDefinitionView),
  ]).then(([
    resources,
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
    itemDefinitionView,
  ]) => {

    const loadingSprites = buildLoadingSprites(resources);
    const loadingSpriteById = new Map(loadingSprites.map((sprite) => [sprite.id, sprite]));
    const items = filterItems(rowsOf(itemDefinitionItem));
    const currencies = rowsOf(itemDefinitionCurrency);
    const titleRows = rowsOf(itemDefinitionTitle);
    const titleEntries = mapTitleEntries(titleRows);
    const loadingImages = rowsOf(itemDefinitionLoadingImage);
    const audioBgmRows = rowsOf(audioBgm);
    const packageEntries = rowsOf(itemDefinitionItemPackage);
    const sourceLimits = rowsOf(itemDefinitionSourceLimit);
    const exchangeBase = rowsOf(exchangeExchange);
    const exchangeSearchRows = rowsOf(exchangeSearch);
    const exchangeFushiquanRows = rowsOf(exchangeFushiquan);
    const shops = rowsOf(shopsGoods);
    const mallRows = rowsOf(mallGoods);
    const composeRows = rowsOf(composeCharaCompose);
    const characters = rowsOf(itemDefinitionCharacter);
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
    const viewResNameByItemId = new Map(
      rowsOf(itemDefinitionView).map((row) => [numberValue(row.id), stringValue(row.res_name)]),
    );

    return {
      resources,
      loadingSprites,
      loadingSpriteById,
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
      viewResNameByItemId,
      audioBgmByUnlockItemId: buildAudioBgmByUnlockItemId(audioBgmRows),
      loadingImageByUnlockItemId: buildLoadingImageByUnlockItemId(loadingImages),
      packageByItemId: groupBy(packageEntries, (entry) => numberValue(entry.id)),
      packageByContentItemId: groupBy(packageEntries, (entry) => numberValue(entry.res_id)),
      sourceLimitsByItemId: groupBy(sourceLimits, (entry) => numberValue(entry.item_id)),
      exchangeSpendByItemId: groupBy(exchangeRows, (entry) => numberValue(entry.source_currency)),
      exchangeReceiveByItemId: groupBy(exchangeRows, (entry) => numberValue(entry.target_currency)),
      shopsByItemId: groupBy(shops, (entry) => numberValue(entry.item_id)),
      shopPriceByItemId: groupBy(shopPriceEntries, (entry) => numberValue(entry.itemId)),
      mallByResourceId: groupBy(mallRows, (entry) => numberValue(entry.resource_id)),
      composeByItemId: groupBy(composeRows, (entry) => numberValue(entry.item_id)),
      characterExchangeByItemId: groupBy(characterExchangeEntries, (entry) => numberValue(entry.itemId)),
      characterMaterialByItemId: groupBy(characterMaterialEntries, (entry) => numberValue(entry.itemId)),
    };
  }).catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
  });

  return cachedRepositoryPromise;
}
