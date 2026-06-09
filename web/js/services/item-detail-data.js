import { characterDisplayName } from "../../utils.js";
import {
  itemIconCandidates,
  localizedDescriptionFromEntry,
  localizedNameFromEntry,
  numberValue,
  parseItemAmountPairs,
  stringValue,
} from "./item-utils.js";
import { imageCandidates, firstAudioCandidates } from "./resources.js";
import { loadItemsRepository } from "./items-repository.js";

const detailCache = new Map();

function isPrimitive(value) {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  return type === "string" || type === "number" || type === "boolean";
}

function scalarRows(entry) {
  return Object.entries(entry || {})
    .filter(([, value]) => isPrimitive(value))
    .map(([key, value]) => ({ key, value: stringValue(value) }));
}

function resolveItemName(repository, itemId, language) {
  const normalizedId = numberValue(itemId);
  if (normalizedId <= 0) return "";
  const entry = repository.entryById.get(normalizedId);
  if (!entry) return `#${normalizedId}`;
  return localizedNameFromEntry(entry, language, normalizedId);
}

function resolveCharacterName(repository, characterId, language) {
  const normalizedId = numberValue(characterId);
  const character = repository.characterById.get(normalizedId);
  if (!character) return `#${normalizedId}`;
  return characterDisplayName(character, language);
}

function parsePriceSummary(repository, rawPrice, language) {
  const pairs = parseItemAmountPairs(rawPrice);
  if (pairs.length === 0) return "-";
  return pairs.map((pair) => `${resolveItemName(repository, pair.itemId, language)} x${pair.count}`).join(", ");
}

function mapPackageContents(itemId, repository, language) {
  const contents = repository.packageByItemId.get(itemId) || [];
  return contents.map((entry) => ({
    itemId: numberValue(entry.res_id),
    itemName: resolveItemName(repository, entry.res_id, language),
    count: numberValue(entry.res_count),
  }));
}

function mapPackageContainers(itemId, repository, language) {
  const containers = repository.packageByContentItemId.get(itemId) || [];
  return containers.map((entry) => ({
    packageId: numberValue(entry.id),
    packageName: resolveItemName(repository, entry.id, language),
    count: numberValue(entry.res_count),
  }));
}

function mapExchangeRows(rows, repository, language, direction) {
  return (rows || []).map((entry) => {
    const sourceCurrency = numberValue(entry.source_currency);
    const targetCurrency = numberValue(entry.target_currency);
    const sourceValue = numberValue(entry.source_value);
    const targetValue = numberValue(entry.target_value);

    return {
      id: numberValue(entry.id),
      exchangeType: stringValue(entry.exchangeType),
      sourceCurrency,
      sourceCurrencyName: resolveItemName(repository, sourceCurrency, language),
      sourceValue,
      targetCurrency,
      targetCurrencyName: resolveItemName(repository, targetCurrency, language),
      targetValue,
      relation: direction === "spend"
        ? `Spend ${sourceValue} -> Receive ${targetValue}`
        : `Receive ${targetValue} <- Spend ${sourceValue}`,
    };
  });
}

function mapShopListings(rows, repository, language) {
  return (rows || []).map((entry) => ({
    id: numberValue(entry.id),
    name: localizedNameFromEntry(entry, language, numberValue(entry.id)),
    category: numberValue(entry.category),
    buyLimit: numberValue(entry.buy_limit),
    zone: stringValue(entry.zone),
    launchTime: stringValue(entry.launch_time),
    discount: numberValue(entry.discount),
    priceRaw: stringValue(entry.price),
    priceSummary: parsePriceSummary(repository, entry.price, language),
  }));
}

function mapShopPricing(rows, repository, language) {
  return (rows || []).map((entry) => {
    const shop = repository.shopById.get(numberValue(entry.shopId));
    return {
      shopId: numberValue(entry.shopId),
      shopName: shop ? localizedNameFromEntry(shop, language, numberValue(entry.shopId)) : `#${numberValue(entry.shopId)}`,
      count: numberValue(entry.count),
      soldItemId: shop ? numberValue(shop.item_id) : 0,
      soldItemName: shop ? resolveItemName(repository, numberValue(shop.item_id), language) : "-",
    };
  });
}

function mapMallRows(rows, repository, language) {
  return (rows || []).map((entry) => ({
    id: numberValue(entry.id),
    name: localizedNameFromEntry(entry, language, numberValue(entry.id)),
    type: numberValue(entry.type),
    resourceCount: numberValue(entry.resource_count),
    vipExp: numberValue(entry.vip_exp),
    cny: numberValue(entry.cny),
    priceLabel: stringValue(entry.price),
  }));
}

function mapSourceLimits(rows) {
  return (rows || []).map((entry) => ({
    id: numberValue(entry.id),
    itemLimit: numberValue(entry.item_limit),
  }));
}

function mapComposeRows(rows, repository, language) {
  return (rows || []).map((entry) => ({
    id: numberValue(entry.id),
    characterId: numberValue(entry.chara_id),
    characterName: resolveCharacterName(repository, entry.chara_id, language),
    count: numberValue(entry.item_num),
  }));
}

function mapCharacterExchangeRows(rows, repository, language) {
  return (rows || []).map((entry) => ({
    characterId: numberValue(entry.characterId),
    characterName: resolveCharacterName(repository, entry.characterId, language),
    count: numberValue(entry.count),
  }));
}

function mapCharacterMaterialRows(rows, repository, language) {
  const byCharacter = new Map();
  for (const row of rows || []) {
    const characterId = numberValue(row.characterId);
    if (characterId <= 0) continue;
    if (!byCharacter.has(characterId)) {
      byCharacter.set(characterId, {
        characterId,
        characterName: resolveCharacterName(repository, characterId, language),
        count: 0,
        references: 0,
      });
    }
    const target = byCharacter.get(characterId);
    target.count += numberValue(row.count);
    target.references += 1;
  }
  return Array.from(byCharacter.values()).sort((a, b) => a.characterId - b.characterId);
}

function kindOfEntry(itemId, repository) {
  if (repository.currencyById.has(itemId)) return "currency";
  if (repository.itemById.has(itemId)) return "item";
  return "";
}

function localizedNames(entry) {
  return {
    en: stringValue(entry.name_en),
    jp: stringValue(entry.name_jp),
    chs: stringValue(entry.name_chs),
    chs_t: stringValue(entry.name_chs_t),
    kr: stringValue(entry.name_kr),
  };
}

function localizedDescriptions(entry) {
  return {
    en: stringValue(entry.desc_en),
    jp: stringValue(entry.desc_jp),
    chs: stringValue(entry.desc_chs),
    chs_t: stringValue(entry.desc_chs_t),
    kr: stringValue(entry.desc_kr),
  };
}

function loadingOriginalCandidates(entry, itemId, repository, language) {
  const loadingImage = repository.loadingImageByUnlockItemId.get(itemId);
  const imgPath = loadingImage ? stringValue(loadingImage.img_path) : "";
  if (imgPath) {
    const candidates = imageCandidates(repository.resources, imgPath, language);
    if (candidates.length > 0) return candidates;
  }
  return itemIconCandidates(entry, repository.resources, language);
}

function titleOriginalCandidates(entry, repository, language) {
  if (stringValue(entry && entry.sourceType) !== "title") {
    return [];
  }
  const iconOriginal = stringValue(entry.icon_original).trim();
  if (!iconOriginal) {
    return [];
  }
  return imageCandidates(repository.resources, iconOriginal, language);
}

function tableclothOriginalRefs(entry) {
  if (numberValue(entry && entry.category) !== 5) {
    return [];
  }
  if (numberValue(entry && entry.type) !== 6) {
    return [];
  }

  const icon = stringValue(entry && entry.icon).trim().replace(/^\/+|\/+$/g, "").replace(/^MyAssets\//, "");
  const match = icon.match(/^(deco\/tablecloth\/[^/]+)\/pic\/[^/]+\.[^.]+$/i);
  if (!match) {
    return [];
  }

  const base = match[1];
  return [
    `${base}/3d/texture/Table_Dif.png`,
    `${base}/preview/preview.png`,
    icon,
  ];
}

function tableclothOriginalCandidates(entry, repository, language) {
  const candidates = [];
  for (const ref of tableclothOriginalRefs(entry)) {
    candidates.push(...imageCandidates(repository.resources, ref, language));
  }
  return candidates;
}

function firstAudioPathFromSargs(sargs) {
  const values = Array.isArray(sargs) ? sargs : [sargs];
  for (const value of values) {
    const text = stringValue(value).trim();
    if (!text) continue;
    if (/\.(mp3|ogg|wav|m4a)$/i.test(text)) return text;
    const parts = text.split(",").map((token) => token.trim()).filter(Boolean);
    const token = parts.find((part) => /\.(mp3|ogg|wav|m4a)$/i.test(part));
    if (token) return token;
  }
  return "";
}

function audioKeysFor(path) {
  const raw = stringValue(path).trim().replace(/^\/+|\/+$/g, "");
  if (!raw) return [];
  const noExt = raw.replace(/\.(mp3|ogg|wav|m4a)$/i, "");
  if (noExt.startsWith("audio/")) return [`${noExt}.mp3`];
  return [`audio/${noExt}.mp3`, `audio/music/${noExt}.mp3`, `${noExt}.mp3`];
}

function itemAudioPreview(entry, itemId, language, repository) {
  const category = numberValue(entry.category);
  const type = numberValue(entry.type);
  if (category !== 5) return null;

  if (type === 4) {
    const path = firstAudioPathFromSargs(entry.sargs);
    if (!path) return null;
    return {
      kind: "riichi",
      sectionTitle: "Riichi Music",
      trackName: localizedNameFromEntry(entry, language, itemId),
      subtitle: "Riichi declaration BGM",
      path,
    };
  }

  if (type === 9) {
    const bgmEntry = repository.audioBgmById.get(itemId) || repository.audioBgmByUnlockItemId.get(itemId);
    const path = bgmEntry ? stringValue(bgmEntry.path).trim() : "";
    if (!path) return null;
    const bgmType = stringValue(bgmEntry.type).trim().toLowerCase();
    const subtitle = bgmType === "lobby" ? "Lobby BGM" : bgmType === "mj" ? "In-game BGM" : "Music BGM";
    const trackName = localizedNameFromEntry(bgmEntry, language, itemId) || localizedNameFromEntry(entry, language, itemId);
    return { kind: "music", sectionTitle: "Music", trackName, subtitle, path };
  }

  return null;
}

export async function loadItemDetail(itemId, language) {
  const normalizedItemId = numberValue(itemId);
  const cacheKey = `${normalizedItemId}:${language}`;
  if (detailCache.has(cacheKey)) {
    return detailCache.get(cacheKey);
  }

  const repository = await loadItemsRepository();
  const kind = kindOfEntry(normalizedItemId, repository);
  const entry = repository.entryById.get(normalizedItemId);

  if (!entry || !kind) {
    return null;
  }

  const packageContents = mapPackageContents(normalizedItemId, repository, language);
  const packageContainers = mapPackageContainers(normalizedItemId, repository, language);
  const exchangeSpend = mapExchangeRows(repository.exchangeSpendByItemId.get(normalizedItemId), repository, language, "spend");
  const exchangeReceive = mapExchangeRows(repository.exchangeReceiveByItemId.get(normalizedItemId), repository, language, "receive");
  const shopListings = mapShopListings(repository.shopsByItemId.get(normalizedItemId), repository, language);
  const shopPricing = mapShopPricing(repository.shopPriceByItemId.get(normalizedItemId), repository, language);
  const mallListings = mapMallRows(repository.mallByResourceId.get(normalizedItemId), repository, language);
  const sourceLimits = mapSourceLimits(repository.sourceLimitsByItemId.get(normalizedItemId));
  const composeUsage = mapComposeRows(repository.composeByItemId.get(normalizedItemId), repository, language);
  const characterExchangeUsage = mapCharacterExchangeRows(repository.characterExchangeByItemId.get(normalizedItemId), repository, language);
  const characterMaterialUsage = mapCharacterMaterialRows(repository.characterMaterialByItemId.get(normalizedItemId), repository, language);

  const sellRewardId = numberValue(entry.sell_reward_id);
  const sellRewardCount = numberValue(entry.sell_reward_count);
  const localizedDescription = localizedDescriptionFromEntry(entry, language);
  const loadingOriginalImage = numberValue(entry.category) === 8
    ? loadingOriginalCandidates(entry, normalizedItemId, repository, language)
    : [];
  const titleOriginalImage = titleOriginalCandidates(entry, repository, language);
  const tableclothOriginalImage = tableclothOriginalCandidates(entry, repository, language);
  const audioPreview = itemAudioPreview(entry, normalizedItemId, language, repository);
  const musicAudio = audioPreview ? firstAudioCandidates(repository.resources, audioKeysFor(audioPreview.path)) : [];

  const detail = {
    id: normalizedItemId,
    kind,
    localized: {
      name: localizedNameFromEntry(entry, language, normalizedItemId),
      description: localizedDescription,
    },
    audio: audioPreview
      ? {
        kind: audioPreview.kind,
        sectionTitle: audioPreview.sectionTitle,
        trackName: audioPreview.trackName,
        subtitle: audioPreview.subtitle,
        path: audioPreview.path,
      }
      : null,
    names: localizedNames(entry),
    descriptions: localizedDescriptions(entry),
    profile: {
      sort: numberValue(entry.sort),
      category: numberValue(entry.category),
      type: numberValue(entry.type),
      func: stringValue(entry.func),
      maxStack: numberValue(entry.max_stack),
      isUnique: numberValue(entry.is_unique),
      canSell: numberValue(entry.can_sell),
      sellRewardId,
      sellRewardCount,
      sellRewardName: sellRewardId > 0 ? resolveItemName(repository, sellRewardId, language) : "-",
      access: stringValue(entry.access),
      accessInfo: numberValue(entry.accessinfo),
      itemExpire: stringValue(entry.item_expire),
      regionLimit: numberValue(entry.region_limit),
      crossView: numberValue(entry.cross_view),
      databaseCache: numberValue(entry.database_cache),
    },
    assets: {
      icon: itemIconCandidates(entry, repository.resources, language),
      loadingOriginalImage,
      portraitFrameOriginalImage: [],
      tableclothOriginalImage,
      backgroundOriginalImage: [],
      tileFaceOriginalImage: [],
      titleOriginalImage,
      musicAudio,
    },
    packageContents,
    packageContainers,
    exchangeSpend,
    exchangeReceive,
    shopListings,
    shopPricing,
    mallListings,
    sourceLimits,
    composeUsage,
    characterExchangeUsage,
    characterMaterialUsage,
    raw: {
      itemScalars: scalarRows(entry),
    },
    counts: {
      packageContents: packageContents.length,
      packageContainers: packageContainers.length,
      exchangeSpend: exchangeSpend.length,
      exchangeReceive: exchangeReceive.length,
      shopListings: shopListings.length,
      shopPricing: shopPricing.length,
      mallListings: mallListings.length,
      sourceLimits: sourceLimits.length,
      composeUsage: composeUsage.length,
      characterExchangeUsage: characterExchangeUsage.length,
      characterMaterialUsage: characterMaterialUsage.length,
      loadingOriginalImage: loadingOriginalImage.length,
      portraitFrameOriginalImage: 0,
      tableclothOriginalImage: tableclothOriginalImage.length,
      backgroundOriginalImage: 0,
      tileFaceOriginalImage: 0,
      titleOriginalImage: titleOriginalImage.length,
      musicAudio: musicAudio.length,
    },
  };

  detailCache.set(cacheKey, detail);
  return detail;
}
