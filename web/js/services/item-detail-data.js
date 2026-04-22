import { characterDisplayName, localizedAssetPrefixes } from "../../utils.js";
import {
  assetCandidatesFromPaths,
  expandLocalizedAssetPaths,
  itemIconCandidates,
  loadingSpriteDisplayName,
  localizedDescriptionFromEntry,
  localizedNameFromEntry,
  numberValue,
  parseItemAmountPairs,
  stringValue
} from "./item-utils.js";
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
    .map(([key, value]) => ({
      key,
      value: stringValue(value),
    }));
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

  return pairs
    .map((pair) => `${resolveItemName(repository, pair.itemId, language)} x${pair.count}`)
    .join(", ");
}

function mapPackageContents(itemId, repository, language) {
  const contents = repository.packageByItemId.get(itemId) || [];
  return contents.map((entry) => ({
    itemId: numberValue(entry.resId),
    itemName: resolveItemName(repository, entry.resId, language),
    count: numberValue(entry.resCount),
  }));
}

function mapPackageContainers(itemId, repository, language) {
  const containers = repository.packageByContentItemId.get(itemId) || [];
  return containers.map((entry) => ({
    packageId: numberValue(entry.id),
    packageName: resolveItemName(repository, entry.id, language),
    count: numberValue(entry.resCount),
  }));
}

function mapExchangeRows(rows, repository, language, direction) {
  return (rows || []).map((entry) => {
    const sourceCurrency = numberValue(entry.sourceCurrency);
    const targetCurrency = numberValue(entry.targetCurrency);
    const sourceValue = numberValue(entry.sourceValue);
    const targetValue = numberValue(entry.targetValue);

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
    buyLimit: numberValue(entry.buyLimit),
    zone: stringValue(entry.zone),
    launchTime: stringValue(entry.launchTime),
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
      shopName: shop
        ? localizedNameFromEntry(shop, language, numberValue(entry.shopId))
        : `#${numberValue(entry.shopId)}`,
      count: numberValue(entry.count),
      soldItemId: shop ? numberValue(shop.itemId) : 0,
      soldItemName: shop ? resolveItemName(repository, numberValue(shop.itemId), language) : "-",
    };
  });
}

function mapMallRows(rows, repository, language) {
  return (rows || []).map((entry) => ({
    id: numberValue(entry.id),
    name: localizedNameFromEntry(entry, language, numberValue(entry.id)),
    type: numberValue(entry.type),
    resourceCount: numberValue(entry.resourceCount),
    vipExp: numberValue(entry.vipExp),
    cny: numberValue(entry.cny),
    priceLabel: stringValue(entry.price),
  }));
}

function mapSourceLimits(rows) {
  return (rows || []).map((entry) => ({
    id: numberValue(entry.id),
    itemLimit: numberValue(entry.itemLimit),
  }));
}

function mapComposeRows(rows, repository, language) {
  return (rows || []).map((entry) => ({
    id: numberValue(entry.id),
    characterId: numberValue(entry.charaId),
    characterName: resolveCharacterName(repository, entry.charaId, language),
    count: numberValue(entry.itemNum),
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

  return Array.from(byCharacter.values())
    .sort((a, b) => a.characterId - b.characterId);
}

function kindOfEntry(itemId, repository) {
  if (repository.loadingSpriteById.has(itemId)) return "loading_sprite";
  if (repository.currencyById.has(itemId)) return "currency";
  if (repository.itemById.has(itemId)) return "item";
  return "";
}

function localizedNames(entry) {
  return {
    en: stringValue(entry.nameEn),
    jp: stringValue(entry.nameJp),
    chs: stringValue(entry.nameChs),
    chs_t: stringValue(entry.nameChsT),
    kr: stringValue(entry.nameKr),
  };
}

function localizedDescriptions(entry) {
  return {
    en: stringValue(entry.descEn),
    jp: stringValue(entry.descJp),
    chs: stringValue(entry.descChs),
    chs_t: stringValue(entry.descChsT),
    kr: stringValue(entry.descKr),
  };
}

function originalPathFromThumbnail(path) {
  const normalized = stringValue(path).trim();
  if (!normalized) return "";
  if (/_thumb\.[a-z0-9]+$/i.test(normalized)) {
    return normalized.replace(/_thumb(\.[a-z0-9]+)$/i, "$1");
  }
  return normalized;
}

function loadingOriginalCandidates(entry, itemId, repository, language) {
  const paths = new Set();
  const loadingImage = repository.loadingImageByUnlockItemId.get(itemId);
  if (loadingImage && stringValue(loadingImage.imgPath)) {
    paths.add(stringValue(loadingImage.imgPath));
  }

  const iconPath = originalPathFromThumbnail(entry.icon);
  if (iconPath) {
    paths.add(iconPath);
  }

  const expandedPaths = [];
  for (const path of paths) {
    expandedPaths.push(...expandLocalizedAssetPaths(path, language));
  }
  return assetCandidatesFromPaths(expandedPaths, repository.resourceManifest);
}

function portraitFrameOriginalPaths(iconPath) {
  const normalized = stringValue(iconPath).trim();
  if (!normalized) return [];

  const transformed = normalized
    .replace(/(^|\/)extendRes\/items2?\//i, "$1extendRes/head_frame/")
    .replace(/\.(jpg|jpeg|webp)$/i, ".png");

  const candidates = new Set([transformed]);
  const match = transformed.match(/^(.*\/)([^/]+)$/);
  if (match) {
    const directory = match[1];
    const fileName = match[2];
    if (!/^headframe_/i.test(fileName)) {
      candidates.add(`${directory}headframe_${fileName}`);
    }
  }

  return Array.from(candidates);
}

function portraitFrameOriginalCandidates(entry, repository, language) {
  const paths = new Set();
  const originalPaths = portraitFrameOriginalPaths(entry.icon);
  for (const path of originalPaths) {
    paths.add(path);
  }

  const expandedPaths = [];
  for (const path of paths) {
    expandedPaths.push(...expandLocalizedAssetPaths(path, language));
  }
  return assetCandidatesFromPaths(expandedPaths, repository.resourceManifest);
}

function addAchievementVariants(nameSet, name) {
  const normalized = stringValue(name).trim();
  if (!normalized) return;
  nameSet.add(normalized);
  if (normalized.includes("achievement")) {
    nameSet.add(normalized.replace(/achievement/gi, "achivement"));
  }
  if (normalized.includes("achivement")) {
    nameSet.add(normalized.replace(/achivement/gi, "achievement"));
  }
}

function tableclothNameCandidates(iconPath) {
  const icon = stringValue(iconPath).trim();
  const match = icon.match(/([^/]+)\.(jpg|jpeg|png|webp)$/i);
  if (!match) return [];

  const baseName = match[1];
  const names = new Set();

  if (/^tablecloth_/i.test(baseName)) {
    addAchievementVariants(names, baseName);
  }

  if (/_table$/i.test(baseName)) {
    const token = baseName.replace(/_table$/i, "");
    addAchievementVariants(names, `tablecloth_${token}`);
    const withoutLeadingDigits = token.replace(/^\d+/, "");
    if (withoutLeadingDigits && withoutLeadingDigits !== token) {
      addAchievementVariants(names, `tablecloth_${withoutLeadingDigits}`);
    }
  }

  return Array.from(names);
}

function tableclothOriginalCandidates(entry, repository, language) {
  const paths = new Set();
  const tableclothNames = tableclothNameCandidates(entry.icon);

  for (const tableclothName of tableclothNames) {
    paths.add(`myres2/tablecloth/${tableclothName}/preview.jpg`);
    paths.add(`scene/Assets/Resource/tablecloth/${tableclothName}/Table_Dif.jpg`);
    paths.add(`scene/Assets/Resource/tablecloth/${tableclothName}/Table_Dif.png`);
  }

  const iconPath = stringValue(entry.icon).trim();
  if (iconPath) {
    // Keep icon as last-resort fallback for legacy tablecloth entries without preview resources.
    paths.add(iconPath);
  }

  const expandedPaths = [];
  for (const path of paths) {
    expandedPaths.push(...expandLocalizedAssetPaths(path, language));
  }
  return assetCandidatesFromPaths(expandedPaths, repository.resourceManifest);
}

function backgroundOriginalCandidates(entry, repository, language) {
  const paths = new Set();
  const iconPath = stringValue(entry.icon).trim();
  if (!iconPath) {
    return [];
  }

  const fileMatch = iconPath.match(/([^/]+\.(jpg|jpeg|png|webp))$/i);
  if (fileMatch) {
    const fileName = fileMatch[1];
    paths.add(`scene/Assets/Resource/lobby/${fileName}`);
  }

  // Keep icon as final fallback only when scene original is missing for a specific build.
  paths.add(iconPath);

  const expandedPaths = [];
  for (const path of paths) {
    expandedPaths.push(...expandLocalizedAssetPaths(path, language));
  }
  return assetCandidatesFromPaths(expandedPaths, repository.resourceManifest);
}

function tileFaceOriginalCandidates(entry, repository, language) {
  const iconPath = stringValue(entry.icon).trim();
  const iconMatch = iconPath.match(/([^/]+)\.(jpg|jpeg|png|webp)$/i);
  if (!iconMatch) return [];

  const token = iconMatch[1];
  const normalizedPrefixes = localizedAssetPrefixes(language)
    .map((prefix) => stringValue(prefix).replace(/\/$/, ""));
  const paths = new Set();

  for (const prefix of normalizedPrefixes) {
    const atlasRoot = prefix ? `res/atlas/${prefix}/myres2/mjpm/${token}` : `res/atlas/myres2/mjpm/${token}`;
    const atlasQ7Root = prefix ? `res/atlas_q7/${prefix}/myres2/mjpm/${token}` : `res/atlas_q7/myres2/mjpm/${token}`;

    paths.add(`${atlasRoot}/ui.png`);
    paths.add(`${atlasQ7Root}/ui_0.png`);

    if (prefix === "en" || prefix === "kr" || prefix === "en_kr") {
      paths.add(`${atlasRoot}_0/ui.png`);
      paths.add(`${atlasQ7Root}_0/ui_0.png`);
    }
  }

  return assetCandidatesFromPaths(Array.from(paths), repository.resourceManifest);
}

function titleOriginalCandidates(entry, repository, language) {
  const paths = new Set();
  const iconOriginal = stringValue(entry.iconOriginal).trim();
  if (iconOriginal) {
    paths.add(iconOriginal);
  }

  const icon = stringValue(entry.icon).trim();
  if (icon) {
    paths.add(icon);
  }

  const expandedPaths = [];
  for (const path of paths) {
    expandedPaths.push(...expandLocalizedAssetPaths(path, language));
  }
  return assetCandidatesFromPaths(expandedPaths, repository.resourceManifest);
}

function appendAudioPath(paths, rawPath) {
  const normalized = stringValue(rawPath).trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) return;
  if (/\.(mp3|ogg|wav|m4a)$/i.test(normalized)) {
    paths.add(normalized);
    return;
  }
  paths.add(`${normalized}.mp3`);
}

function itemAudioCandidatePaths(audioPath) {
  const normalized = stringValue(audioPath).trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) return [];

  const rawNoExt = normalized.replace(/\.(mp3|ogg|wav|m4a)$/i, "");
  const paths = new Set();

  if (rawNoExt.startsWith("audio/")) {
    appendAudioPath(paths, rawNoExt);
    return Array.from(paths);
  }

  appendAudioPath(paths, rawNoExt);
  appendAudioPath(paths, `audio/${rawNoExt}`);
  return Array.from(paths);
}

function itemAudioCandidates(audioPath, repository, language) {
  const paths = itemAudioCandidatePaths(audioPath);
  const expandedPaths = [];
  for (const path of paths) {
    expandedPaths.push(...expandLocalizedAssetPaths(path, language));
  }
  return assetCandidatesFromPaths(expandedPaths, repository.resourceManifest);
}

function firstAudioPathFromSargs(sargs) {
  const values = Array.isArray(sargs) ? sargs : [sargs];
  for (const value of values) {
    const text = stringValue(value).trim();
    if (!text) continue;

    if (/\.(mp3|ogg|wav|m4a)$/i.test(text)) {
      return text;
    }

    const parts = text.split(",").map((token) => token.trim()).filter(Boolean);
    const token = parts.find((part) => /\.(mp3|ogg|wav|m4a)$/i.test(part));
    if (token) {
      return token;
    }
  }
  return "";
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
    const subtitle = bgmType === "lobby"
      ? "Lobby BGM"
      : bgmType === "mj"
        ? "In-game BGM"
        : "Music BGM";
    const trackName = localizedNameFromEntry(bgmEntry, language, itemId) || localizedNameFromEntry(entry, language, itemId);

    return {
      kind: "music",
      sectionTitle: "Music",
      trackName,
      subtitle,
      path,
    };
  }

  return null;
}

function buildLoadingSpriteDetail(sprite, repository) {
  const name = loadingSpriteDisplayName(sprite.filename);
  const imageCandidates = assetCandidatesFromPaths([sprite.path], repository.resourceManifest);
  const description = "Loading sprite";

  const detail = {
    id: 0,
    kind: "loading_sprite",
    localized: {
      name,
      description: description,
    },
    names: { en: name, jp: name, chs: name, chs_t: name, kr: name },
    descriptions: { en: description, jp: description, chs: description, chs_t: description, kr: description },
    profile: {
      sort: sprite.sort,
      category: 9,
      type: sprite.type,
    },
    assets: {
      icon: imageCandidates,
      loadingOriginalImage: imageCandidates,
    },
  };

  return detail;
}

export async function loadItemDetail(itemId, language) {
  const normalizedItemId = numberValue(itemId);
  const cacheKey = `${normalizedItemId}:${language}`;
  if (detailCache.has(cacheKey)) {
    return detailCache.get(cacheKey);
  }

  const repository = await loadItemsRepository();
  const kind = kindOfEntry(normalizedItemId, repository);

  if (kind === "loading_sprite") {
    const cacheKey = `${normalizedItemId}:${language}`;
    if (detailCache.has(cacheKey)) {
      return detailCache.get(cacheKey);
    }
    const sprite = repository.loadingSpriteById.get(normalizedItemId);
    if (!sprite) return null;
    const detail = buildLoadingSpriteDetail(sprite, repository);
    detailCache.set(cacheKey, detail);
    return detail;
  }

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

  const sellRewardId = numberValue(entry.sellRewardId);
  const sellRewardCount = numberValue(entry.sellRewardCount);
  const localizedDescription = localizedDescriptionFromEntry(entry, language);
  const loadingOriginalImage = numberValue(entry.category) === 8
    ? loadingOriginalCandidates(entry, normalizedItemId, repository, language)
    : [];
  const portraitFrameOriginalImage = numberValue(entry.category) === 5 && numberValue(entry.type) === 5
    ? portraitFrameOriginalCandidates(entry, repository, language)
    : [];
  const tableclothOriginalImage = numberValue(entry.category) === 5 && numberValue(entry.type) === 6
    ? tableclothOriginalCandidates(entry, repository, language)
    : [];
  const backgroundOriginalImage = numberValue(entry.category) === 5 && numberValue(entry.type) === 8
    ? backgroundOriginalCandidates(entry, repository, language)
    : [];
  const tileFaceOriginalImage = numberValue(entry.category) === 5 && numberValue(entry.type) === 13
    ? tileFaceOriginalCandidates(entry, repository, language)
    : [];
  const titleOriginalImage = numberValue(entry.category) === 7
    ? titleOriginalCandidates(entry, repository, language)
    : [];
  const audioPreview = itemAudioPreview(entry, normalizedItemId, language, repository);
  const musicAudio = audioPreview ? itemAudioCandidates(audioPreview.path, repository, language) : [];

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
      maxStack: numberValue(entry.maxStack),
      isUnique: numberValue(entry.isUnique),
      canSell: numberValue(entry.canSell),
      sellRewardId,
      sellRewardCount,
      sellRewardName: sellRewardId > 0 ? resolveItemName(repository, sellRewardId, language) : "-",
      access: stringValue(entry.access),
      accessInfo: numberValue(entry.accessinfo),
      itemExpire: stringValue(entry.itemExpire),
      regionLimit: numberValue(entry.regionLimit),
      crossView: numberValue(entry.crossView),
      databaseCache: numberValue(entry.databaseCache),
    },
    assets: {
      icon: itemIconCandidates(entry, repository.resourceManifest, language),
      loadingOriginalImage,
      portraitFrameOriginalImage,
      tableclothOriginalImage,
      backgroundOriginalImage,
      tileFaceOriginalImage,
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
      portraitFrameOriginalImage: portraitFrameOriginalImage.length,
      tableclothOriginalImage: tableclothOriginalImage.length,
      backgroundOriginalImage: backgroundOriginalImage.length,
      tileFaceOriginalImage: tileFaceOriginalImage.length,
      titleOriginalImage: titleOriginalImage.length,
      musicAudio: musicAudio.length,
    },
  };

  detailCache.set(cacheKey, detail);
  return detail;
}
