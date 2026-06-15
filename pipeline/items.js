// Items domain transformer. Pure seam: raw item/shop/exchange tables plus baked
// asset/audio indexes in, a language-agnostic items collection out. The output
// carries localized text maps and resolved media/pricing/relationship data inline
// so Eleventy renders committed JSON with no runtime data fetches.

import { textMap, rowsOf } from "../lib/localization.js";
import {
  compressLocaleValue,
  resolveAssetUrl,
  resolveAudioUrl,
  resolveLocaleValueWithinDir,
  normalizeRef,
  recordToUrl,
  buildTableclothFolderIndex,
  resolveTableclothImage,
} from "./assets.js";
const ITEM_KIND_ORDER = { currency: 0, item: 1, loading_sprite: 2 };
const LOADING_SPRITE_CATEGORY_ORDER = { table: 0, left: 1, mid: 2, right: 3 };
const LOADING_SPRITE_ID_PREFIX = 900000000;
const LOADING_SPRITE_PATTERN = /^extendRes\/loading\/common\/(table|left|mid|right)_(\d+)\.png$/;

export const CATEGORY_LABELS = {
  0: "Currencies",
  1: "Consumables",
  2: "Gifts",
  3: "Bags",
  5: "Cosmetics",
  6: "Event Items",
  7: "Titles",
  8: "Loading Screens",
  9: "Loading Sprites",
};

export const COSMETIC_TYPE_LABELS = {
  0: "Riichi Bets",
  1: "Winning Effects",
  2: "Riichi Effects",
  3: "Hands",
  4: "Riichi Music",
  5: "Portrait Frames",
  6: "Tablecloths",
  7: "Tile Backs",
  8: "Backgrounds",
  9: "Music",
  10: "Tile Call Indicators",
  13: "Tile Faces",
};
function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
function str(value) {
  return value === null || value === undefined ? "" : String(value);
}
function groupBy(rows, keyOf) {
  const out = new Map();
  for (const row of rows || []) {
    const key = keyOf(row);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(row);
  }
  return out;
}
function firstAsset(assetIndex, refs) {
  for (const ref of refs || []) {
    const url = resolveAssetUrl(assetIndex, ref);
    if (url) return url;
  }
  return "";
}
function resolveLocalizedAssetUrl(assetIndex, ref) {
  // Prefer per-locale siblings inside the referenced directory. When none are
  // present, keep the historical basename-fuzzy resolver for plain item icons.
  const localized = compressLocaleValue(resolveLocaleValueWithinDir(assetIndex, ref));
  return localized || resolveAssetUrl(assetIndex, ref);
}
function firstLocalizedAsset(assetIndex, refs) {
  for (const ref of refs || []) {
    const url = resolveLocalizedAssetUrl(assetIndex, ref);
    if (url) return url;
  }
  return "";
}
function parseItemAmountPairs(raw, options = {}) {
  const text = str(raw);
  const pairs = [];
  const pattern = /(\d+)\s*-\s*(\d+)/g;
  let match = pattern.exec(text);
  while (match) {
    const itemId = num(match[1]);
    const count = num(match[2]);
    if (itemId > 0 && count > 0) pairs.push({ itemId, count, raw: match[0] });
    match = pattern.exec(text);
  }
  if (options.allowBare) {
    for (const token of text.split(/[|,]/).map((part) => part.trim()).filter(Boolean)) {
      if (/^\d+\s*-\s*\d+$/.test(token)) continue;
      if (!/^\d+$/.test(token)) continue;
      const itemId = num(token);
      if (itemId > 0) pairs.push({ itemId, count: 1, raw: token });
    }
  }
  return pairs;
}
function itemText(entry) {
  return {
    name: textMap(entry, "name"),
    description: textMap(entry, "desc"),
    funcDescription: textMap(entry, "desc_func"),
    expireDescription: textMap(entry, "expire_desc"),
  };
}
function displayText(entry) {
  return {
    name: textMap(entry, "name"),
    description: textMap(entry, "desc"),
  };
}
function itemIcon(entry, assetIndex) {
  return firstLocalizedAsset(assetIndex, [
    entry.icon,
    entry.icon_transparent,
    entry.icon_item,
    entry.icon_jpg,
    entry.icon_original,
  ]);
}
function mapTitleEntries(titleRows) {
  return (titleRows || []).map((row) => ({
    ...row,
    category: 7,
    type: 0,
    sort: num(row.priority),
    max_stack: 1,
    is_unique: 1,
    can_sell: 0,
    func: "",
    access: "",
    accessinfo: 0,
    item_expire: "",
    region_limit: 0,
    cross_view: num(row.cross_view),
    database_cache: 0,
    sourceType: "title",
    icon_original: str(row.icon),
    icon_item: str(row.icon_item || row.icon),
    icon: str(row.icon_item || row.icon),
  }));
}
function deduplicateLoadingScreens(items) {
  const byIcon = new Map();
  for (const item of items || []) {
    if (num(item.category) !== 8) continue;
    const icon = str(item.icon);
    if (!icon) continue;
    const existing = byIcon.get(icon);
    if (!existing || (!str(item.item_expire) && str(existing.item_expire))) byIcon.set(icon, item);
  }
  return byIcon;
}
function filterItems(rawItems) {
  const loadingScreenMap = deduplicateLoadingScreens(rawItems);
  return (rawItems || []).filter((item) => {
    if (num(item.category) !== 8) return true;
    const icon = str(item.icon);
    return !icon || loadingScreenMap.get(icon) === item;
  });
}
function buildLoadingSprites(assetIndex) {
  const sprites = [];
  for (const [logical, rec] of assetIndex.exact) {
    const match = logical.match(LOADING_SPRITE_PATTERN);
    if (!match) continue;
    const slot = match[1];
    const index = num(match[2]);
    const order = LOADING_SPRITE_CATEGORY_ORDER[slot];
    sprites.push({
      id: LOADING_SPRITE_ID_PREFIX + order * 1000 + index + 1,
      key: logical,
      filename: `${slot}_${index}.png`,
      slot,
      index,
      type: order,
      sort: order * 1000 + index,
      image: recordToUrl(rec),
    });
  }
  return sprites.sort((a, b) => a.sort - b.sort || a.id - b.id);
}
function loadingSpriteName(filename) {
  const labels = { table: "Table", left: "Left", mid: "Mid", right: "Right" };
  const match = filename.match(/^([a-z]+)_?(\d+)\.png$/);
  if (match) return `Loading: ${labels[match[1]] || match[1]} ${match[2]}`;
  return `Loading: ${filename.replace(/\.png$/, "")}`;
}
function buildAudioBgmByUnlockItemId(rows) {
  const out = new Map();
  for (const row of rows || []) {
    const itemId = num(row.unlock_item);
    if (itemId > 0 && !out.has(itemId)) out.set(itemId, row);
  }
  return out;
}
function buildLoadingImageByUnlockItemId(rows) {
  const out = new Map();
  for (const row of rows || []) {
    const unlockItems = Array.isArray(row.unlock_items) ? row.unlock_items : [];
    for (const value of unlockItems) {
      const itemId = num(value);
      if (itemId > 0 && !out.has(itemId)) out.set(itemId, row);
    }
  }
  return out;
}
function parseShopPriceEntries(shops) {
  const entries = [];
  for (const shop of shops || []) {
    for (const price of parseItemAmountPairs(shop.price)) {
      entries.push({ shopId: num(shop.id), itemId: price.itemId, count: price.count, raw: str(shop.price) });
    }
  }
  return entries;
}
function parseCharacterMaterialEntries(characters) {
  const entries = [];
  for (const character of characters || []) {
    const characterId = num(character.id);
    for (const material of parseItemAmountPairs(character.star_5_material, { allowBare: true })) {
      entries.push({ characterId, itemId: material.itemId, count: material.count, raw: str(character.star_5_material) });
    }
  }
  return entries.filter((row) => row.characterId > 0 && row.itemId > 0 && row.count > 0);
}
function parseCharacterExchangeEntries(characters) {
  return (characters || [])
    .map((character) => ({
      characterId: num(character.id),
      itemId: num(character.exchange_item_id),
      count: num(character.exchange_item_num),
    }))
    .filter((row) => row.characterId > 0 && row.itemId > 0 && row.count > 0);
}
function normalizedAssetRef(ref) {
  return normalizeRef(ref);
}
function tileOriginalRefs(entry) {
  if (num(entry.category) !== 5 || (num(entry.type) !== 7 && num(entry.type) !== 13)) return [];
  const match = normalizedAssetRef(entry.icon).match(/^(deco\/(?:mjpai|mjpface)\/[^/]+)\/pic\/[^/]+\.[^.]+$/i);
  if (!match) return [];
  return [`${match[1]}/3d/texture/hand.png`, `${match[1]}/preview/preview.png`];
}
function firstAudioPathFromSargs(sargs) {
  const values = Array.isArray(sargs) ? sargs : [sargs];
  for (const value of values) {
    const text = str(value).trim();
    if (!text) continue;
    if (/\.(mp3|ogg|wav|m4a)$/i.test(text)) return text;
    const token = text.split(",").map((part) => part.trim()).find((part) => /\.(mp3|ogg|wav|m4a)$/i.test(part));
    if (token) return token;
  }
  return "";
}
function audioKeysFor(path) {
  const raw = str(path).trim().replace(/^\/+|\/+$/g, "");
  if (!raw) return [];
  const noExt = raw.replace(/\.(mp3|ogg|wav|m4a)$/i, "");
  if (noExt.startsWith("audio/")) return [`${noExt}.mp3`];
  return [`audio/${noExt}.mp3`, `audio/music/${noExt}.mp3`, `${noExt}.mp3`];
}
function itemAudio(entry, itemId, audioBgmById, audioBgmByUnlockItemId, audioIndex) {
  if (num(entry.category) !== 5) return null;
  if (num(entry.type) === 4) {
    const path = firstAudioPathFromSargs(entry.sargs);
    const url = resolveAudioUrl(audioIndex, audioKeysFor(path));
    return url ? { kind: "riichi", title: "Riichi Music", path, url } : null;
  }
  if (num(entry.type) === 9) {
    const bgm = audioBgmById.get(itemId) || audioBgmByUnlockItemId.get(itemId);
    const path = bgm ? str(bgm.path) : "";
    const url = resolveAudioUrl(audioIndex, audioKeysFor(path));
    return url ? { kind: "music", title: "Music", path, url, text: displayText(bgm) } : null;
  }
  return null;
}
function resolveOriginalAssets(entry, itemId, indexes) {
  const { assetIndex, tableclothFolderIndex, loadingImageByUnlockItemId, viewResNameByItemId } = indexes;
  const loadingImage = loadingImageByUnlockItemId.get(itemId);
  const resName = str(viewResNameByItemId.get(itemId)).trim();
  return {
    icon: itemIcon(entry, assetIndex),
    loadingImage: num(entry.category) === 8 && loadingImage ? firstAsset(assetIndex, [loadingImage.img_path, loadingImage.thumb_path, entry.icon]) : "",
    titleArt: str(entry.sourceType) === "title" ? resolveLocalizedAssetUrl(assetIndex, entry.icon_original) : "",
    portraitFrame: num(entry.category) === 5 && num(entry.type) === 5 && resName
      ? resolveAssetUrl(assetIndex, `deco/head_frame/${resName}/icon/${resName}.png`)
      : "",
    tablecloth: num(entry.category) === 5 && num(entry.type) === 6
      ? resolveTableclothImage(tableclothFolderIndex, entry.icon)
      : "",
    tile: firstAsset(assetIndex, tileOriginalRefs(entry)),
    background: num(entry.category) === 5 && num(entry.type) === 8 && resName
      ? firstAsset(assetIndex, [`extendRes/background/${resName}/${resName}.png`, entry.icon])
      : "",
  };
}
function refItemName(entryById, id) {
  const item = entryById.get(num(id));
  return item ? textMap(item, "name") : { en: `#${num(id)}`, jp: "", chs: "", chs_t: "", kr: "" };
}
function mapPackageContents(rows, entryById) {
  return (rows || []).map((entry) => ({ itemId: num(entry.res_id), itemName: refItemName(entryById, entry.res_id), count: num(entry.res_count) }));
}
function mapPackageContainers(rows, entryById) {
  return (rows || []).map((entry) => ({ packageId: num(entry.id), packageName: refItemName(entryById, entry.id), count: num(entry.res_count) }));
}
function mapExchangeRows(rows, entryById, direction) {
  return (rows || []).map((entry) => ({
    id: num(entry.id),
    exchangeType: str(entry.exchangeType),
    sourceCurrency: num(entry.source_currency),
    sourceCurrencyName: refItemName(entryById, entry.source_currency),
    sourceValue: num(entry.source_value),
    targetCurrency: num(entry.target_currency),
    targetCurrencyName: refItemName(entryById, entry.target_currency),
    targetValue: num(entry.target_value),
    direction,
  }));
}
function mapShopListings(rows) {
  return (rows || []).map((entry) => ({
    id: num(entry.id),
    text: displayText(entry),
    category: num(entry.category),
    buyLimit: num(entry.buy_limit),
    zone: str(entry.zone),
    launchTime: str(entry.launch_time),
    discount: num(entry.discount),
    priceRaw: str(entry.price),
    prices: parseItemAmountPairs(entry.price),
  }));
}
function mapShopPricing(rows, shopById, entryById) {
  return (rows || []).map((entry) => {
    const shop = shopById.get(num(entry.shopId));
    return {
      shopId: num(entry.shopId),
      shopName: shop ? textMap(shop, "name") : { en: `#${num(entry.shopId)}`, jp: "", chs: "", chs_t: "", kr: "" },
      count: num(entry.count),
      soldItemId: shop ? num(shop.item_id) : 0,
      soldItemName: shop ? refItemName(entryById, shop.item_id) : { en: "-", jp: "", chs: "", chs_t: "", kr: "" },
    };
  });
}
function mapMallRows(rows) {
  return (rows || []).map((entry) => ({
    id: num(entry.id),
    text: displayText(entry),
    type: num(entry.type),
    resourceCount: num(entry.resource_count),
    vipExp: num(entry.vip_exp),
    cny: num(entry.cny),
    priceLabel: str(entry.price),
  }));
}
function mapCharacterRows(rows, characterById) {
  return (rows || []).map((entry) => ({
    characterId: num(entry.characterId),
    characterName: characterById.has(num(entry.characterId)) ? textMap(characterById.get(num(entry.characterId)), "name") : { en: `#${num(entry.characterId)}`, jp: "", chs: "", chs_t: "", kr: "" },
    count: num(entry.count),
  }));
}
function usageCounts(item) {
  return {
    packageContents: item.packageContents.length,
    packageContainers: item.packageContainers.length,
    exchangeSpend: item.exchangeSpend.length,
    exchangeReceive: item.exchangeReceive.length,
    shopListings: item.shopListings.length,
    shopPricing: item.shopPricing.length,
    mallListings: item.mallListings.length,
    sourceLimits: item.sourceLimits.length,
    composeUsage: item.composeUsage.length,
    characterExchangeUsage: item.characterExchangeUsage.length,
    characterMaterialUsage: item.characterMaterialUsage.length,
  };
}
function categoryLabel(entry) {
  if (num(entry.category) === 5) return COSMETIC_TYPE_LABELS[num(entry.type)] || CATEGORY_LABELS[5];
  return CATEGORY_LABELS[num(entry.category)] || `Category ${num(entry.category)}`;
}
function buildItem(entry, kind, indexes) {
  const itemId = num(entry.id);
  const audio = itemAudio(entry, itemId, indexes.audioBgmById, indexes.audioBgmByUnlockItemId, indexes.audioIndex);
  const item = {
    id: itemId,
    kind,
    sort: num(entry.sort),
    category: num(entry.category),
    categoryLabel: categoryLabel(entry),
    type: num(entry.type),
    func: str(entry.func),
    canSell: num(entry.can_sell),
    isUnique: num(entry.is_unique),
    maxStack: num(entry.max_stack),
    isTitleDefinition: str(entry.sourceType) === "title",
    text: itemText(entry),
    assets: resolveOriginalAssets(entry, itemId, indexes),
    audio,
    profile: {
      sellRewardId: num(entry.sell_reward_id),
      sellRewardCount: num(entry.sell_reward_count),
      access: str(entry.access),
      accessInfo: num(entry.accessinfo),
      itemExpire: str(entry.item_expire),
      regionLimit: num(entry.region_limit),
      crossView: num(entry.cross_view),
      databaseCache: num(entry.database_cache),
    },
    packageContents: mapPackageContents(indexes.packageByItemId.get(itemId), indexes.entryById),
    packageContainers: mapPackageContainers(indexes.packageByContentItemId.get(itemId), indexes.entryById),
    exchangeSpend: mapExchangeRows(indexes.exchangeSpendByItemId.get(itemId), indexes.entryById, "spend"),
    exchangeReceive: mapExchangeRows(indexes.exchangeReceiveByItemId.get(itemId), indexes.entryById, "receive"),
    shopListings: mapShopListings(indexes.shopsByItemId.get(itemId)),
    shopPricing: mapShopPricing(indexes.shopPriceByItemId.get(itemId), indexes.shopById, indexes.entryById),
    mallListings: mapMallRows(indexes.mallByResourceId.get(itemId)),
    sourceLimits: (indexes.sourceLimitsByItemId.get(itemId) || []).map((row) => ({ id: num(row.id), itemLimit: num(row.item_limit) })),
    composeUsage: (indexes.composeByItemId.get(itemId) || []).map((row) => ({ id: num(row.id), characterId: num(row.chara_id), count: num(row.item_num) })),
    characterExchangeUsage: mapCharacterRows(indexes.characterExchangeByItemId.get(itemId), indexes.characterById),
    characterMaterialUsage: mapCharacterRows(indexes.characterMaterialByItemId.get(itemId), indexes.characterById),
  };
  item.usageCounts = usageCounts(item);
  return item;
}
function buildLoadingSpriteItem(sprite) {
  const name = loadingSpriteName(sprite.filename);
  const item = {
    id: sprite.id,
    kind: "loading_sprite",
    sort: sprite.sort,
    category: 9,
    categoryLabel: CATEGORY_LABELS[9],
    type: sprite.type,
    func: "",
    canSell: 0,
    isUnique: 1,
    maxStack: 1,
    isTitleDefinition: false,
    text: {
      name: { en: name, jp: name, chs: name, chs_t: name, kr: name },
      description: { en: "Loading sprite", jp: "Loading sprite", chs: "Loading sprite", chs_t: "Loading sprite", kr: "Loading sprite" },
      funcDescription: { en: "", jp: "", chs: "", chs_t: "", kr: "" },
      expireDescription: { en: "", jp: "", chs: "", chs_t: "", kr: "" },
    },
    assets: { icon: sprite.image, loadingImage: sprite.image, titleArt: "", portraitFrame: "", tablecloth: "", tile: "", background: "" },
    audio: null,
    profile: { sellRewardId: 0, sellRewardCount: 0, access: "", accessInfo: 0, itemExpire: "", regionLimit: 0, crossView: 0, databaseCache: 0 },
    packageContents: [],
    packageContainers: [],
    exchangeSpend: [],
    exchangeReceive: [],
    shopListings: [],
    shopPricing: [],
    mallListings: [],
    sourceLimits: [],
    composeUsage: [],
    characterExchangeUsage: [],
    characterMaterialUsage: [],
    usageCounts: {},
  };
  item.usageCounts = usageCounts(item);
  return item;
}
function compareItems(a, b) {
  if (a.kind !== b.kind) return (ITEM_KIND_ORDER[a.kind] ?? 99) - (ITEM_KIND_ORDER[b.kind] ?? 99);
  if (a.sort !== b.sort) return a.sort - b.sort;
  return a.id - b.id;
}
function stableValueKey(value) {
  if (!value || typeof value !== "object") return str(value);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = value[key];
  return JSON.stringify(out);
}
function portraitFrameDedupKey(item) {
  if (item.kind !== "item" || item.category !== 5 || item.type !== 5) return "";
  return stableValueKey(item.assets && item.assets.portraitFrame);
}
export function deduplicatePortraitFrames(collection) {
  const representativeByImage = new Map();
  for (const item of collection || []) {
    const key = portraitFrameDedupKey(item);
    if (!key) continue;
    const existing = representativeByImage.get(key);
    if (!existing || compareItems(item, existing) < 0) representativeByImage.set(key, item);
  }
  return (collection || []).filter((item) => {
    const key = portraitFrameDedupKey(item);
    return !key || representativeByImage.get(key) === item;
  });
}
export function transformItems(tables, assetIndex, audioIndex) {
  const currencies = rowsOf(tables.currency).map((row) => ({ ...row, category: 0, type: 0, sort: num(row.sort) || num(row.id), max_stack: 0, is_unique: 0, can_sell: 0, func: "" }));
  const items = filterItems(rowsOf(tables.item));
  const titleEntries = mapTitleEntries(rowsOf(tables.title));
  const loadingImages = rowsOf(tables.loadingImage);
  const audioBgmRows = rowsOf(tables.audioBgm);
  const packageEntries = rowsOf(tables.itemPackage);
  const sourceLimits = rowsOf(tables.sourceLimit);
  const exchangeRows = [
    ...rowsOf(tables.exchange).map((row) => ({ ...row, exchangeType: "exchange" })),
    ...rowsOf(tables.searchExchange).map((row) => ({ ...row, exchangeType: "search" })),
    ...rowsOf(tables.fushiquanExchange).map((row) => ({ ...row, exchangeType: "fushiquan" })),
  ];
  const shops = rowsOf(tables.shops);
  const mallRows = rowsOf(tables.mall);
  const composeRows = rowsOf(tables.compose);
  const characters = rowsOf(tables.character);
  const viewRows = rowsOf(tables.view);

  const entryRows = [...currencies, ...items, ...titleEntries];
  const indexes = {
    assetIndex,
    tableclothFolderIndex: buildTableclothFolderIndex(assetIndex),
    audioIndex,
    audioBgmById: new Map(audioBgmRows.map((row) => [num(row.id), row])),
    audioBgmByUnlockItemId: buildAudioBgmByUnlockItemId(audioBgmRows),
    loadingImageByUnlockItemId: buildLoadingImageByUnlockItemId(loadingImages),
    entryById: new Map(entryRows.map((row) => [num(row.id), row])),
    characterById: new Map(characters.map((row) => [num(row.id), row])),
    shopById: new Map(shops.map((row) => [num(row.id), row])),
    viewResNameByItemId: new Map(viewRows.map((row) => [num(row.id), str(row.res_name)])),
    packageByItemId: groupBy(packageEntries, (row) => num(row.id)),
    packageByContentItemId: groupBy(packageEntries, (row) => num(row.res_id)),
    sourceLimitsByItemId: groupBy(sourceLimits, (row) => num(row.item_id)),
    exchangeSpendByItemId: groupBy(exchangeRows, (row) => num(row.source_currency)),
    exchangeReceiveByItemId: groupBy(exchangeRows, (row) => num(row.target_currency)),
    shopsByItemId: groupBy(shops, (row) => num(row.item_id)),
    shopPriceByItemId: groupBy(parseShopPriceEntries(shops), (row) => num(row.itemId)),
    mallByResourceId: groupBy(mallRows, (row) => num(row.resource_id)),
    composeByItemId: groupBy(composeRows, (row) => num(row.item_id)),
    characterExchangeByItemId: groupBy(parseCharacterExchangeEntries(characters), (row) => num(row.itemId)),
    characterMaterialByItemId: groupBy(parseCharacterMaterialEntries(characters), (row) => num(row.itemId)),
  };

  return deduplicatePortraitFrames([
    ...currencies.map((entry) => buildItem(entry, "currency", indexes)),
    ...items.map((entry) => buildItem(entry, "item", indexes)),
    ...titleEntries.map((entry) => buildItem(entry, "item", indexes)),
    ...buildLoadingSprites(assetIndex).map(buildLoadingSpriteItem),
  ]).sort(compareItems);
}
