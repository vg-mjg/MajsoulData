// Characters domain transformer. Pure function: raw tables + asset/audio indexes
// in, a language-agnostic, self-contained characters collection out. Each entry
// carries all five languages' text inline as `{en, jp, chs, chs_t, kr}` maps and
// every asset reference folded inline as a baked URL value-map, so the build
// stage never has to fetch or join anything — it just localizes per page.

import { LANGUAGE_CODES, textMap, rowsOf } from "../lib/localization.js";
import {
  resolveAssetUrlExact,
  enumerateImageUrlsByNumericPrefix,
  resolveAudioUrl,
  normalizeRef,
  buildSpineIndex,
  resolveSpineLayers,
} from "./assets.js";

const SPRITE_VARIANTS = ["bighead", "smallhead", "half", "full", "waitingroom"];

// Localizable text columns we carry on a character (camel label -> column stem).
const CHARACTER_TEXT_FIELDS = {
  name: "name",
  description: "desc",
  stature: "desc_stature",
  birth: "desc_birth",
  age: "desc_age",
  bloodType: "desc_bloodtype",
  cv: "desc_cv",
  hobby: "desc_hobby",
};

function num(value) {
  const n = Number(value);
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

function characterText(row) {
  const text = {};
  for (const [label, stem] of Object.entries(CHARACTER_TEXT_FIELDS)) {
    text[label] = textMap(row, stem);
  }
  return text;
}

// Resolve the five sprite variants of a skin path into baked value-maps, keyed
// by variant. Empty variants are dropped so the entry only carries what exists.
function skinSprites(assetIndex, skinPath) {
  const path = normalizeRef(skinPath);
  const out = {};
  if (!path) return out;
  for (const variant of SPRITE_VARIANTS) {
    const value = resolveAssetUrlExact(assetIndex, `${path}/${variant}/${variant}.png`);
    if (value) out[variant] = value;
  }
  return out;
}

// Candidate audio keys for a voice line. The voice `path` is resolved against
// the audio manifest's logical layout, trying the character's sound folder first.
function voiceAudioKeys(voicePath, soundFolder) {
  const raw = str(voicePath).trim().replace(/^\/+|\/+$/g, "");
  if (!raw) return [];
  const noExt = raw.replace(/\.(mp3|ogg|wav|m4a)$/i, "");
  const folder = str(soundFolder).trim().replace(/^\/+|\/+$/g, "");
  if (noExt.startsWith("audio/")) return [`${noExt}.mp3`];
  const keys = [];
  if (folder) keys.push(`audio/sound/${folder}/${noExt}.mp3`);
  keys.push(`audio/sound/${noExt}.mp3`, `audio/${noExt}.mp3`, `${noExt}.mp3`);
  return keys;
}

function buildVoice(row, soundFolder, audioIndex) {
  return {
    type: str(row.type),
    category: num(row.category),
    levelLimit: num(row.level_limit),
    bondLimit: num(row.bond_limit),
    text: {
      name: textMap(row, "name"),
      words: textMap(row, "words"),
    },
    audio: resolveAudioUrl(audioIndex, voiceAudioKeys(row.path, soundFolder)),
  };
}

function buildSpotVoice(row, audioIndex) {
  return {
    id: num(row.id),
    type: num(row.type),
    typeDescription: str(row.type_desc),
    audio: resolveAudioUrl(audioIndex, voiceAudioKeys(row.path, "")),
  };
}

function isEventSpecialEmote(subId) {
  return subId >= 13 && subId <= 18;
}

function blankTextMap() {
  return textMap({}, "missing");
}

function fallbackItemName(itemId) {
  return { en: `#${itemId}`, jp: "", chs: "", chs_t: "", kr: "" };
}

function parseItemAmountEntries(raw) {
  return str(raw)
    .split(/[|,]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const pair = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (pair) return { itemId: num(pair[1]), count: num(pair[2]) };
      const bare = token.match(/^(\d+)$/);
      if (bare) return { itemId: num(bare[1]), count: 1 };
      return { itemId: 0, count: 0 };
    })
    .filter((entry) => entry.itemId > 0 && entry.count > 0);
}

function bondItemIcon(item) {
  if (!item || !item.assets) return "";
  return item.assets.icon || item.assets.loadingImage || item.assets.titleArt || "";
}

function nameMapKey(name) {
  return JSON.stringify(LANGUAGE_CODES.map((code) => str(name && name[code])));
}

function buildBondEntries(rawMaterials, itemById) {
  const entries = parseItemAmountEntries(rawMaterials).map((entry) => {
    const item = itemById.get(entry.itemId);
    return {
      itemId: entry.itemId,
      name: item && item.text ? item.text.name : fallbackItemName(entry.itemId),
      icon: bondItemIcon(item),
      count: entry.count,
      canSell: item ? num(item.canSell) : 0,
    };
  });

  const byName = groupBy(entries, (entry) => nameMapKey(entry.name));
  const preferSellableNames = new Set(
    Array.from(byName.entries())
      .filter(([, group]) => group.length > 1 && group.some((entry) => entry.canSell > 0))
      .map(([name]) => name),
  );

  return entries
    .filter((entry) => !preferSellableNames.has(nameMapKey(entry.name)) || entry.canSell > 0)
    .map(({ canSell, ...entry }) => entry);
}

function buildTableEmote(row, emoBasePath, scannedImages, assetIndex) {
  const subId = num(row.sub_id);
  return {
    subId,
    image:
      scannedImages.get(subId) ||
      resolveAssetUrlExact(assetIndex, `${normalizeRef(emoBasePath)}/${subId}`),
    unlockDescription: textMap(row, "unlock_desc"),
  };
}

function buildEmotes(character, tableRows, assetIndex) {
  const emoBasePath = str(character.emo);
  const scannedEmotes = enumerateImageUrlsByNumericPrefix(assetIndex, emoBasePath);
  const scannedImages = new Map(scannedEmotes.map((emote) => [emote.subId, emote.image]));
  const tableEmotes = (tableRows || [])
    .map((row) => buildTableEmote(row, emoBasePath, scannedImages, assetIndex))
    .filter((emote) => !isEventSpecialEmote(emote.subId) && emote.image);
  const tableSubIds = new Set((tableRows || []).map((row) => num(row.sub_id)));
  const baseEmotes = scannedEmotes
    .filter((emote) => !tableSubIds.has(emote.subId) && !isEventSpecialEmote(emote.subId))
    .map((emote) => ({
      subId: emote.subId,
      image: emote.image,
      unlockDescription: blankTextMap(),
    }));
  return [...baseEmotes, ...tableEmotes];
}

// The full roster of skins a character owns, sorted by id (all included). Each
// carries its localized name/description/lockTips inline, baked preview sprite
// variants, and the resolved spine layers for Live2D skins. Skins without baked
// sprites simply carry an empty `assets`; skins without Live2D carry `spine: []`.
function buildSkins(skins, assetIndex, spineIndex) {
  return (skins || [])
    .map((skin) => {
      const id = num(skin.id);
      const spine = resolveSpineLayers(spineIndex.get(String(id)) || [], id);
      return {
        id,
        spine,
        text: {
          name: textMap(skin, "name"),
          description: textMap(skin, "desc"),
          lockTips: textMap(skin, "lock_tips"),
        },
        assets: skinSprites(assetIndex, str(skin.path)),
      };
    })
    .sort((a, b) => a.id - b.id);
}

// Story-tab shell: enough to list a character's stories with localized titles and
// the kind/unlock metadata. The structured scenario content is a later domain
// (stories collection); here we only flag whether scenario content exists.
function buildStoryReward(row, itemById) {
  if (!row) return null;
  return {
    id: num(row.id),
    type: num(row.type),
    text: { content: textMap(row, "content") },
    items: buildBondEntries(row.reward, itemById),
  };
}

function buildStory(row, rewardById, itemById) {
  const contentPath = str(row.content_path).trim();
  const endingIds = Array.isArray(row.jieju)
    ? row.jieju.map(num).filter((id) => id > 0)
    : [];
  return {
    uniqueId: num(row.unique_id),
    type: num(row.type),
    queue: num(row.queque),
    levelLimit: num(row.level_limit),
    isMarried: num(row.is_married),
    hasScenario: contentPath.length > 0,
    contentPath,
    text: {
      name: textMap(row, "name"),
      content: textMap(row, "content"),
      lockTips: textMap(row, "lock_tips"),
    },
    endings: endingIds
      .map((rewardId) => buildStoryReward(rewardById.get(rewardId), itemById))
      .filter(Boolean),
  };
}

export function transformCharacters(tables, assetIndex, audioIndex, items = []) {
  const characterRows = rowsOf(tables.character);
  const skinRows = rowsOf(tables.skin);
  const characterEmojiRows = rowsOf(tables.characterEmoji);
  const voiceSoundRows = rowsOf(tables.voiceSound);
  const voiceSpotRows = rowsOf(tables.voiceSpot);
  const spotRows = rowsOf(tables.spot);

  const skinPathById = new Map(skinRows.map((skin) => [num(skin.id), str(skin.path)]));
  const skinsByCharacter = groupBy(skinRows, (skin) => num(skin.character_id));
  const emotesByCharacter = groupBy(characterEmojiRows, (row) => num(row.charid));
  const spineIndex = buildSpineIndex(assetIndex);
  const voicesBySound = groupBy(voiceSoundRows, (row) => num(row.id));
  const spotVoicesByCharacter = groupBy(voiceSpotRows, (row) => num(row.character));
  const storiesByCharacter = groupBy(spotRows, (row) => num(row.id));
  const rewardById = new Map(rowsOf(tables.spotRewards).map((row) => [num(row.id), row]));
  const itemById = new Map((items || []).map((item) => [num(item.id), item]));

  return characterRows
    .map((character) => {
      const id = num(character.id);
      const initSkin = num(character.init_skin);
      const initSkinPath = skinPathById.get(initSkin) || "";
      const soundFolder = str(character.sound_folder);
      const soundId = num(character.sound);
      const ownedSkins = skinsByCharacter.get(id) || [];

      const voices = (voicesBySound.get(soundId) || [])
        .map((row) => buildVoice(row, soundFolder, audioIndex))
        .sort((a, b) => a.category - b.category || a.type.localeCompare(b.type));

      const spotVoices = (spotVoicesByCharacter.get(id) || [])
        .map((row) => buildSpotVoice(row, audioIndex))
        .sort((a, b) => a.type - b.type || a.id - b.id);

      const stories = (storiesByCharacter.get(id) || [])
        .map((row) => buildStory(row, rewardById, itemById))
        .sort((a, b) => a.queue - b.queue || a.uniqueId - b.uniqueId);

      return {
        id,
        limited: num(character.limited),
        collaboration: num(character.collaboration),
        initSkin,
        text: characterText(character),
        assets: skinSprites(assetIndex, initSkinPath),
        skins: buildSkins(ownedSkins, assetIndex, spineIndex),
        emotes: buildEmotes(character, emotesByCharacter.get(id) || [], assetIndex),
        bond: buildBondEntries(character.star_5_material, itemById),
        voices,
        spotVoices,
        stories,
      };
    })
    .sort((a, b) => a.id - b.id);
}
