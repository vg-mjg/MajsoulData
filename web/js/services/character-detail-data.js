import {
  characterDisplayName,
  localizedFieldValue,
} from "../../utils.js";
import { imageCandidates, firstAudioCandidates, emojiEntries, spineLayersForSkin } from "./resources.js";
import { itemIconCandidates } from "./item-utils.js";
import { loadCharactersRepository } from "./characters-repository.js";

const SPRITE_VARIANTS = {
  bighead: "bighead",
  smallhead: "smallhead",
  half: "half",
  full: "full",
  waitingroom: "waitingroom",
};

function numberValue(value) {
  return Number(value || 0);
}

function stringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function skinSprite(resources, skinPath, variant, language) {
  const path = stringValue(skinPath).replace(/\/+$/, "");
  if (!path) return [];
  return imageCandidates(resources, `${path}/${variant}`, language);
}

function buildVoiceAudioKeys(voicePath, soundFolder) {
  const raw = stringValue(voicePath).trim().replace(/^\/+|\/+$/g, "");
  if (!raw) return [];
  const noExt = raw.replace(/\.(mp3|ogg|wav|m4a)$/i, "");
  const folder = stringValue(soundFolder).trim().replace(/^\/+|\/+$/g, "");
  const keys = [];

  if (noExt.startsWith("audio/")) {
    keys.push(`${noExt}.mp3`);
  } else {
    if (folder) keys.push(`audio/sound/${folder}/${noExt}.mp3`);
    keys.push(`audio/sound/${noExt}.mp3`);
    keys.push(`audio/${noExt}.mp3`);
    keys.push(`${noExt}.mp3`);
  }
  return keys;
}

function parseMaterialSegment(segment) {
  const tokens = stringValue(segment).split(",").map((token) => token.trim()).filter(Boolean);
  return tokens.map((token) => {
    const [itemIdRaw, countRaw] = token.split("-");
    return { itemId: numberValue(itemIdRaw), count: numberValue(countRaw), raw: token };
  });
}

function parseStarMaterials(raw) {
  const text = stringValue(raw).trim();
  if (!text) return [];
  const stages = text.split("|").map((segment, index) => ({
    stage: index + 1,
    materials: parseMaterialSegment(segment),
  }));
  return stages.filter((stage) => stage.materials.length > 0);
}

function parseContractItems(raw) {
  const text = stringValue(raw).trim();
  if (!text) return [];
  return text
    .split(",")
    .map((token) => stringValue(token).trim())
    .filter(Boolean)
    .map((token) => {
      const normalizedToken = token.includes("|") ? stringValue(token.split("|").pop()).trim() : token;
      const [itemIdRaw, countRaw] = normalizedToken.split("-");
      return { itemId: numberValue(itemIdRaw), count: numberValue(countRaw), raw: token, normalized: normalizedToken };
    })
    .filter((item) => item.itemId > 0 && item.count > 0);
}

function characterCategory(character) {
  if (numberValue(character.collaboration) > 0) return "Collaboration";
  if (numberValue(character.limited) > 0) return "Limited";
  return "Standard";
}

function localizedCharacterInfo(character, language) {
  return {
    name: characterDisplayName(character, language),
    description: localizedFieldValue(character, "desc", language),
    stature: localizedFieldValue(character, "descStature", language),
    birth: localizedFieldValue(character, "descBirth", language),
    age: localizedFieldValue(character, "descAge", language),
    bloodType: localizedFieldValue(character, "descBloodtype", language),
    cv: localizedFieldValue(character, "descCv", language),
    hobby: localizedFieldValue(character, "descHobby", language),
  };
}

function resolveItemName(repository, itemId, language) {
  const normalizedItemId = numberValue(itemId);
  if (normalizedItemId <= 0) return "";
  const item = repository.itemById.get(normalizedItemId);
  if (!item) return `#${normalizedItemId}`;
  const localized = localizedFieldValue(item, "name", language);
  return localized || `#${normalizedItemId}`;
}

function resolveItemDescriptor(repository, itemId, count, language) {
  const id = numberValue(itemId);
  const amount = numberValue(count);
  const name = resolveItemName(repository, id, language);
  if (id <= 0 || amount <= 0) {
    return { id, count: amount, name, summary: "-" };
  }
  return { id, count: amount, name, summary: `${name} (${id}) x${amount}` };
}

function enrichMaterialsWithItemNames(materials, repository, language) {
  return (materials || []).map((material) => {
    const itemName = resolveItemName(repository, material.itemId, language);
    const itemEntry = repository.itemById.get(material.itemId);
    const imageCands = itemIconCandidates(itemEntry, repository.resources, language);
    return {
      ...material,
      itemName,
      imageCandidates: imageCands,
      summary: itemName ? `${itemName} (${material.itemId}) x${material.count}` : `${material.itemId} x${material.count}`,
    };
  });
}

function mapSkinDetail(skin, language, repository) {
  const resources = repository.resources;
  const skinId = numberValue(skin.id);
  const extra = repository.skinExtraBySkinId.get(skinId) || null;
  const cutins = repository.cutinBySkinId.get(skinId) || [];
  const exchangeItem = resolveItemDescriptor(repository, skin.exchange_item_id, skin.exchange_item_num, language);
  const spineLayers = spineLayersForSkin(resources, skinId, language);

  return {
    id: skinId,
    type: numberValue(skin.type),
    spineType: spineLayers.length > 0 ? 1 : 0,
    characterId: numberValue(skin.character_id),
    path: stringValue(skin.path),
    name: localizedFieldValue(skin, "name", language) || `#${skinId}`,
    description: localizedFieldValue(skin, "desc", language),
    lockTips: localizedFieldValue(skin, "lockTips", language),
    exchangeItemId: exchangeItem.id,
    exchangeItemNum: exchangeItem.count,
    exchangeItemName: exchangeItem.name,
    exchangeSummary: exchangeItem.summary,
    direction: numberValue(skin.direction),
    noReverse: numberValue(skin.no_reverse),
    lockReverse: numberValue(skin.lock_reverse),
    effectiveTime: stringValue(skin.effective_time),
    spotScale: stringValue(skin.spot_scale),
    previewBighead: skinSprite(resources, skin.path, SPRITE_VARIANTS.bighead, language),
    previewSmallhead: skinSprite(resources, skin.path, SPRITE_VARIANTS.smallhead, language),
    previewHalf: skinSprite(resources, skin.path, SPRITE_VARIANTS.half, language),
    previewFull: skinSprite(resources, skin.path, SPRITE_VARIANTS.full, language),
    previewWaitingRoom: skinSprite(resources, skin.path, SPRITE_VARIANTS.waitingroom, language),
    spineLayers,
    extra: extra
      ? {
          effects: Array.isArray(extra.effects) ? extra.effects.filter(Boolean) : [],
          spineLayers: numberValue(extra.spine_layers),
          audioIdle: stringValue(extra.audio_idle),
          audioGreeting: stringValue(extra.audio_greeting),
          audioClick: stringValue(extra.audio_click),
          audioClick2: stringValue(extra.audio_click2),
          audioCelebrate: stringValue(extra.audio_celebrate),
          audioCelebrateIdle: stringValue(extra.audio_celebrate_idle),
          celebrateDelay: numberValue(extra.celebrate_delay),
        }
      : null,
    cutins: cutins.map((cutin) => ({
      skinId: numberValue(cutin.skinid),
      cutinName: stringValue(cutin.cutin_name),
      effect: stringValue(cutin.effect),
      atlas: stringValue(cutin.atlas),
      type: numberValue(cutin.type),
      charX: numberValue(cutin.char_x),
      charY: numberValue(cutin.char_y),
      charWidth: numberValue(cutin.char_width),
      charHeight: numberValue(cutin.char_height),
    })),
  };
}

function mapEmojiDetail(emoji, language, repository, emoBasePath) {
  const unlockParamRaw = Array.isArray(emoji.unlock_param) ? emoji.unlock_param : [];
  const unlockParam = unlockParamRaw.map((value) => {
    const raw = stringValue(value);
    const numeric = Number.parseInt(raw, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) return { raw, itemName: "" };
    return { raw, itemName: resolveItemName(repository, numeric, language) };
  });
  const unlockParamText = unlockParam
    .map((entry) => (entry.itemName ? `${entry.raw} (${entry.itemName})` : entry.raw))
    .join(", ");
  const subId = numberValue(emoji.sub_id);
  const candidates = imageCandidates(repository.resources, `${stringValue(emoBasePath).replace(/\/+$/, "")}/${subId}`, language);

  return {
    subId,
    type: numberValue(emoji.type),
    unlockType: numberValue(emoji.unlock_type),
    unlockParam: unlockParamRaw,
    unlockParamText,
    unlockDescription: localizedFieldValue(emoji, "unlockDesc", language),
    afterUnlockDescription: localizedFieldValue(emoji, "afterUnlockDesc", language),
    view: stringValue(emoji.view),
    audio: numberValue(emoji.audio),
    imageCandidates: candidates,
  };
}

function mapVoiceDetail(voice, language, repository, soundFolder) {
  const audioCands = firstAudioCandidates(repository.resources, buildVoiceAudioKeys(voice.path, soundFolder));
  return {
    type: stringValue(voice.type),
    category: numberValue(voice.category),
    name: localizedFieldValue(voice, "name", language),
    words: localizedFieldValue(voice, "words", language),
    levelLimit: numberValue(voice.level_limit),
    bondLimit: numberValue(voice.bond_limit),
    timeLength: numberValue(voice.time_length),
    path: stringValue(voice.path),
    hide: numberValue(voice.hide),
    dateLimit: stringValue(voice.date_limit),
    audioCandidates: audioCands,
  };
}

function mapSpotVoiceDetail(voice, repository) {
  const audioCands = firstAudioCandidates(repository.resources, buildVoiceAudioKeys(voice.path, ""));
  return {
    id: numberValue(voice.id),
    type: numberValue(voice.type),
    typeDescription: stringValue(voice.type_desc),
    path: stringValue(voice.path),
    audioCandidates: audioCands,
  };
}

function parseRewardItems(raw) {
  return stringValue(raw)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [itemIdRaw, countRaw] = token.split("-");
      return { itemId: numberValue(itemIdRaw), count: numberValue(countRaw), raw: token };
    })
    .filter((entry) => entry.itemId > 0 && entry.count > 0);
}

function mapStoryRewardDetail(rewardEntry, language, repository) {
  if (!rewardEntry) return null;
  const rewardItems = enrichMaterialsWithItemNames(parseRewardItems(rewardEntry.reward), repository, language);
  return {
    id: numberValue(rewardEntry.id),
    type: numberValue(rewardEntry.type),
    text: localizedFieldValue(rewardEntry, "content", language),
    rawReward: stringValue(rewardEntry.reward),
    rewards: rewardItems,
    rewardSummary: rewardItems.length > 0 ? rewardItems.map((reward) => reward.summary).join(", ") : "-",
  };
}

function mapStoryDetail(story, language, repository) {
  const endingIds = Array.isArray(story.jieju)
    ? story.jieju.map((value) => numberValue(value)).filter((value) => value > 0)
    : [];
  const endings = endingIds
    .map((rewardId) => mapStoryRewardDetail(repository.spotRewardById.get(rewardId), language, repository))
    .filter(Boolean);

  const content = localizedFieldValue(story, "content", language);
  const contentPath = stringValue(story.content_path).trim();
  return {
    characterId: numberValue(story.id),
    uniqueId: numberValue(story.unique_id),
    type: numberValue(story.type),
    queue: numberValue(story.queque),
    levelLimit: numberValue(story.level_limit),
    isMarried: numberValue(story.is_married),
    name: localizedFieldValue(story, "name", language) || `Story #${numberValue(story.unique_id)}`,
    lockTips: localizedFieldValue(story, "lockTips", language),
    content,
    contentPath,
    hasInlineContent: content.length > 0,
    hasScenarioContent: contentPath.length > 0,
    endingIds,
    endings,
  };
}

function mergeCharacterLevels(defaultLevels, specificLevels) {
  const byDefaultLevel = new Map((defaultLevels || []).map((entry) => [numberValue(entry.level), entry]));
  const bySpecificLevel = new Map((specificLevels || []).map((entry) => [numberValue(entry.level), entry]));
  const allLevels = Array.from(new Set([...byDefaultLevel.keys(), ...bySpecificLevel.keys()]))
    .filter((level) => level > 0)
    .sort((a, b) => a - b);
  return allLevels.map((level) => bySpecificLevel.get(level) || byDefaultLevel.get(level)).filter(Boolean);
}

function mapLevelDetail(entry, language, repository) {
  const rewards = enrichMaterialsWithItemNames(parseMaterialSegment(entry.reward), repository, language);
  return {
    level: numberValue(entry.level),
    exp: numberValue(entry.exp),
    unlockSays: numberValue(entry.unlock_says),
    unlockDescription: localizedFieldValue(entry, "unlockDesc", language),
    rewardMaterials: rewards,
    rewardSummary: rewards.length > 0 ? rewards.map((reward) => reward.summary).join(", ") : "-",
  };
}

function mapComposeDetail(entry, language, repository) {
  const reward = resolveItemDescriptor(repository, entry.item_id, entry.item_num, language);
  return {
    id: numberValue(entry.id),
    itemId: reward.id,
    itemName: reward.name,
    itemNum: reward.count,
    summary: reward.summary,
  };
}

function mapSpotSkinDetail(spotSkin, language, repository) {
  const resources = repository.resources;
  const exchangeItem = resolveItemDescriptor(repository, spotSkin.exchange_item_id, spotSkin.exchange_item_num, language);
  return {
    id: numberValue(spotSkin.id),
    type: numberValue(spotSkin.type),
    characterId: numberValue(spotSkin.character_id),
    path: stringValue(spotSkin.path),
    name: localizedFieldValue(spotSkin, "name", language) || `#${numberValue(spotSkin.id)}`,
    description: localizedFieldValue(spotSkin, "desc", language),
    lockTips: localizedFieldValue(spotSkin, "lockTips", language),
    exchangeItemId: exchangeItem.id,
    exchangeItemNum: exchangeItem.count,
    exchangeItemName: exchangeItem.name,
    exchangeSummary: exchangeItem.summary,
    direction: numberValue(spotSkin.direction),
    noReverse: numberValue(spotSkin.no_reverse),
    lockReverse: numberValue(spotSkin.lock_reverse),
    effectiveTime: stringValue(spotSkin.effective_time),
    spotScale: stringValue(spotSkin.spot_scale),
    previewBighead: skinSprite(resources, spotSkin.path, SPRITE_VARIANTS.bighead, language),
    previewSmallhead: skinSprite(resources, spotSkin.path, SPRITE_VARIANTS.smallhead, language),
    previewHalf: skinSprite(resources, spotSkin.path, SPRITE_VARIANTS.half, language),
    previewFull: skinSprite(resources, spotSkin.path, SPRITE_VARIANTS.full, language),
    previewWaitingRoom: skinSprite(resources, spotSkin.path, SPRITE_VARIANTS.waitingroom, language),
  };
}

function mapScalarRows(entry) {
  return Object.entries(entry || {})
    .filter(([, value]) => {
      if (value === null || value === undefined) return true;
      const type = typeof value;
      return type === "string" || type === "number" || type === "boolean";
    })
    .map(([key, value]) => ({ key, value: stringValue(value) }));
}

const detailCache = new Map();

export async function loadCharacterDetail(characterId, language) {
  const normalizedCharacterId = numberValue(characterId);
  const cacheKey = `${normalizedCharacterId}:${language}`;
  if (detailCache.has(cacheKey)) {
    return detailCache.get(cacheKey);
  }

  const repository = await loadCharactersRepository();
  const resources = repository.resources;
  const character = repository.characterById.get(normalizedCharacterId) ||
    repository.spotCharacterById.get(normalizedCharacterId);

  if (!character) {
    return null;
  }

  const characterSkins = (repository.skinsByCharacterId.get(normalizedCharacterId) || [])
    .slice()
    .sort((a, b) => numberValue(a.id) - numberValue(b.id));
  const skinPathById = new Map(characterSkins.map((skin) => [numberValue(skin.id), stringValue(skin.path)]));

  const initSkinId = numberValue(character.init_skin);
  const initSkinPath = skinPathById.get(initSkinId) ||
    stringValue((repository.skinById.get(initSkinId) || {}).path);

  const localized = localizedCharacterInfo(character, language);
  const skins = characterSkins.map((skin) => mapSkinDetail(skin, language, repository));
  const emoBasePath = stringValue(character.emo);

  // The emoji table lists only the unlockable/special emotes, in the in-game
  // display order (not numeric). The base emotes (e.g. 1-9) exist only in the
  // manifest. Show base emotes first (numeric), then the table emotes in order.
  const tableEmojis = (repository.emojisByCharacterId.get(normalizedCharacterId) || [])
    .map((emoji) => mapEmojiDetail(emoji, language, repository, emoBasePath));
  const tableSubIds = new Set(tableEmojis.map((emoji) => emoji.subId));
  const baseEmojis = emojiEntries(resources, emoBasePath, language)
    .filter((entry) => {
      const subId = numberValue(entry.subId);
      return subId > 0 && !tableSubIds.has(subId) && entry.candidates.length > 0;
    })
    .map((entry) => ({
      subId: numberValue(entry.subId),
      type: 1,
      unlockType: 0,
      unlockParam: [],
      unlockParamText: "",
      unlockDescription: "",
      afterUnlockDescription: "",
      view: "",
      audio: 0,
      imageCandidates: entry.candidates,
    }));
  // Sub-ids 13-18 are event-special emotes; exclude them from the display.
  const isEventSpecialEmote = (subId) => subId >= 13 && subId <= 18;
  const emojis = [...baseEmojis, ...tableEmojis].filter((emoji) => !isEventSpecialEmote(emoji.subId));

  const soundId = numberValue(character.sound);
  const voices = (repository.voiceLinesBySoundId.get(soundId) || [])
    .map((voice) => mapVoiceDetail(voice, language, repository, stringValue(character.sound_folder)))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category;
      return a.type.localeCompare(b.type);
    });

  const spotVoices = (repository.spotVoicesByCharacterId.get(normalizedCharacterId) || [])
    .map((voice) => mapSpotVoiceDetail(voice, repository))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type - b.type;
      return a.path.localeCompare(b.path);
    });

  const starMaterials = parseStarMaterials(character.star_5_material).map((stage) => ({
    stage: stage.stage,
    materials: enrichMaterialsWithItemNames(stage.materials, repository, language),
  }));
  const contractItems = enrichMaterialsWithItemNames(parseContractItems(character.star_5_material), repository, language);
  const spotProfile = repository.spotCharacterById.get(normalizedCharacterId) || null;
  const relatedCutins = skins.flatMap((skin) => skin.cutins);
  const relatedSkinExtras = skins.filter((skin) => Boolean(skin.extra));
  const exchangeItem = resolveItemDescriptor(repository, character.exchange_item_id, character.exchange_item_num, language);

  const levelRows = mergeCharacterLevels(
    repository.characterLevelsByCharacterId.get(0),
    repository.characterLevelsByCharacterId.get(normalizedCharacterId),
  ).map((entry) => mapLevelDetail(entry, language, repository));

  const composeRows = (repository.composeByCharacterId.get(normalizedCharacterId) || [])
    .map((entry) => mapComposeDetail(entry, language, repository))
    .sort((a, b) => a.id - b.id);

  const spotSkins = (repository.spotSkinsByCharacterId.get(normalizedCharacterId) || [])
    .map((entry) => mapSpotSkinDetail(entry, language, repository))
    .sort((a, b) => a.id - b.id);
  const stories = (repository.spotStoriesByCharacterId.get(normalizedCharacterId) || [])
    .map((entry) => mapStoryDetail(entry, language, repository))
    .sort((a, b) => {
      if (a.queue !== b.queue) return a.queue - b.queue;
      return a.uniqueId - b.uniqueId;
    });

  const detail = {
    id: normalizedCharacterId,
    category: characterCategory(character),
    localized,
    names: {
      en: stringValue(character.name_en),
      jp: stringValue(character.name_jp),
      chs: stringValue(character.name_chs),
      chsT: stringValue(character.name_chs_t),
      kr: stringValue(character.name_kr),
      chsAlt: stringValue(character.name_chs2),
      chsTAlt: stringValue(character.name_chs_t2),
      jpAlt: stringValue(character.name_jp2),
    },
    profile: {
      skinLib: stringValue(character.skin_lib),
      sort: numberValue(character.sort),
      launchTime: stringValue(character.launch_time),
      sex: numberValue(character.sex),
      open: numberValue(character.open),
      canMarry: numberValue(character.can_marry),
      favorite: numberValue(character.favorite),
      limited: numberValue(character.limited),
      collaboration: numberValue(character.collaboration),
      regionLimit: numberValue(character.region_limit),
      treasureSp: numberValue(character.treasure_sp),
      ur: numberValue(character.ur),
      urRon: numberValue(character.ur_ron),
      urLiqi: numberValue(character.ur_liqi),
      urCutin: stringValue(character.ur_cutin),
      hand: numberValue(character.hand),
      sound: numberValue(character.sound),
      soundVolume: numberValue(character.sound_volume),
      soundFolder: stringValue(character.sound_folder),
      exchangeItemId: exchangeItem.id,
      exchangeItemNum: exchangeItem.count,
      exchangeItemName: exchangeItem.name,
      exchangeSummary: exchangeItem.summary,
      star5Cost: numberValue(character.star_5_cost),
      star5Materials: starMaterials,
      contractItems,
      initSkin: initSkinId,
      fullFetterSkin: numberValue(character.full_fetter_skin),
      emoPath: stringValue(character.emo),
    },
    assets: {
      bighead: skinSprite(resources, initSkinPath, SPRITE_VARIANTS.bighead, language),
      smallhead: skinSprite(resources, initSkinPath, SPRITE_VARIANTS.smallhead, language),
      half: skinSprite(resources, initSkinPath, SPRITE_VARIANTS.half, language),
      full: skinSprite(resources, initSkinPath, SPRITE_VARIANTS.full, language),
      waitingRoom: skinSprite(resources, initSkinPath, SPRITE_VARIANTS.waitingroom, language),
    },
    skins,
    emojis,
    voices,
    spotVoices,
    cutins: relatedCutins,
    skinExtras: relatedSkinExtras.map((skin) => ({ skinId: skin.id, skinName: skin.name, extra: skin.extra })),
    levels: levelRows,
    compose: composeRows,
    spotSkins,
    stories,
    spotProfile: spotProfile
      ? {
          localized: localizedCharacterInfo(spotProfile, language),
          open: numberValue(spotProfile.open),
          canMarry: numberValue(spotProfile.can_marry),
          limited: numberValue(spotProfile.limited),
          collaboration: numberValue(spotProfile.collaboration),
          initSkin: numberValue(spotProfile.init_skin),
          fullFetterSkin: numberValue(spotProfile.full_fetter_skin),
        }
      : null,
    raw: {
      characterScalars: mapScalarRows(character),
      spotCharacterScalars: spotProfile ? mapScalarRows(spotProfile) : [],
    },
    counts: {
      skins: skins.length,
      emojis: emojis.length,
      voices: voices.length,
      spotVoices: spotVoices.length,
      cutins: relatedCutins.length,
      skinExtras: relatedSkinExtras.length,
      levels: levelRows.length,
      compose: composeRows.length,
      spotSkins: spotSkins.length,
      stories: stories.length,
    },
  };

  detailCache.set(cacheKey, detail);
  return detail;
}
