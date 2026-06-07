import { fetchJson } from "../core/http.js";
import { rowsOf } from "../../utils.js";
import { loadResources } from "./resources.js";

const URLS = {
  itemDefinitionCharacter: new URL("../../data/item_definition/character.json", import.meta.url),
  itemDefinitionSkin: new URL("../../data/item_definition/skin.json", import.meta.url),
  itemDefinitionItem: new URL("../../data/item_definition/item.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/item_definition/currency.json", import.meta.url),
  levelDefinitionCharacter: new URL("../../data/level_definition/character.json", import.meta.url),
  composeCharacompose: new URL("../../data/compose/characompose.json", import.meta.url),
  characterSkin: new URL("../../data/character/skin.json", import.meta.url),
  characterEmoji: new URL("../../data/character/emoji.json", import.meta.url),
  characterCutin: new URL("../../data/character/cutin.json", import.meta.url),
  spotCharacterSpot: new URL("../../data/spot/character_spot.json", import.meta.url),
  spotSkinSpot: new URL("../../data/spot/skin_spot.json", import.meta.url),
  spotSpot: new URL("../../data/spot/spot.json", import.meta.url),
  spotRewards: new URL("../../data/spot/rewards.json", import.meta.url),
  voiceSound: new URL("../../data/voice/sound.json", import.meta.url),
  voiceSpot: new URL("../../data/voice/spot.json", import.meta.url),
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

export async function loadCharactersRepository() {
  if (cachedRepositoryPromise) {
    return cachedRepositoryPromise;
  }

  cachedRepositoryPromise = Promise.all([
    loadResources(),
    fetchJson(URLS.itemDefinitionCharacter),
    fetchJson(URLS.itemDefinitionSkin),
    fetchJson(URLS.itemDefinitionItem),
    fetchJson(URLS.itemDefinitionCurrency),
    fetchJson(URLS.levelDefinitionCharacter),
    fetchJson(URLS.composeCharacompose),
    fetchJson(URLS.characterSkin),
    fetchJson(URLS.characterEmoji),
    fetchJson(URLS.characterCutin),
    fetchJson(URLS.spotCharacterSpot),
    fetchJson(URLS.spotSkinSpot),
    fetchJson(URLS.spotSpot),
    fetchJson(URLS.spotRewards),
    fetchJson(URLS.voiceSound),
    fetchJson(URLS.voiceSpot),
  ]).then(([
    resources,
    itemDefinitionCharacter,
    itemDefinitionSkin,
    itemDefinitionItem,
    itemDefinitionCurrency,
    levelDefinitionCharacter,
    composeCharacompose,
    characterSkin,
    characterEmoji,
    characterCutin,
    spotCharacterSpot,
    spotSkinSpot,
    spotSpot,
    spotRewards,
    voiceSound,
    voiceSpot,
  ]) => {

    const characters = rowsOf(itemDefinitionCharacter);
    const skins = rowsOf(itemDefinitionSkin);
    const items = rowsOf(itemDefinitionItem);
    const currencies = rowsOf(itemDefinitionCurrency);
    const characterLevels = rowsOf(levelDefinitionCharacter);
    const composeEntries = rowsOf(composeCharacompose);
    const skinExtras = rowsOf(characterSkin);
    const emojis = rowsOf(characterEmoji);
    const cutins = rowsOf(characterCutin);
    const spotCharacters = rowsOf(spotCharacterSpot);
    const spotSkins = rowsOf(spotSkinSpot);
    const spotStories = rowsOf(spotSpot);
    const spotRewardEntries = rowsOf(spotRewards);
    const voiceLines = rowsOf(voiceSound);
    const spotVoices = rowsOf(voiceSpot);
    const itemEntries = [...currencies, ...items];

    const characterById = new Map(characters.map((character) => [Number(character.id || 0), character]));
    const spotCharacterById = new Map(spotCharacters.map((character) => [Number(character.id || 0), character]));
    const skinById = new Map(skins.map((skin) => [Number(skin.id || 0), skin]));
    const itemById = new Map(itemEntries.map((entry) => [Number(entry.id || 0), entry]));
    const spotRewardById = new Map(spotRewardEntries.map((entry) => [Number(entry.id || 0), entry]));

    const skinsByCharacterId = groupBy(skins, (skin) => Number(skin.character_id || 0));
    const characterLevelsByCharacterId = groupBy(characterLevels, (entry) => Number(entry.character_id || 0));
    const composeByCharacterId = groupBy(composeEntries, (entry) => Number(entry.chara_id || 0));
    const skinExtraBySkinId = new Map(skinExtras.map((entry) => [Number(entry.skinid || 0), entry]));
    const emojisByCharacterId = groupBy(emojis, (entry) => Number(entry.charid || 0));
    const cutinBySkinId = groupBy(cutins, (entry) => Number(entry.skinid || 0));
    const spotSkinsByCharacterId = groupBy(spotSkins, (entry) => Number(entry.character_id || 0));
    const spotStoriesByCharacterId = groupBy(spotStories, (entry) => Number(entry.id || 0));
    const voiceLinesBySoundId = groupBy(voiceLines, (entry) => Number(entry.id || 0));
    const spotVoicesByCharacterId = groupBy(spotVoices, (entry) => Number(entry.character || 0));

    return {
      resources,
      characters,
      spotCharacters,
      skins,
      items,
      currencies,
      characterLevels,
      composeEntries,
      skinExtras,
      emojis,
      cutins,
      spotSkins,
      spotStories,
      spotRewardEntries,
      voiceLines,
      spotVoices,
      itemEntries,
      characterById,
      spotCharacterById,
      skinById,
      itemById,
      spotRewardById,
      skinsByCharacterId,
      characterLevelsByCharacterId,
      composeByCharacterId,
      skinExtraBySkinId,
      emojisByCharacterId,
      cutinBySkinId,
      spotSkinsByCharacterId,
      spotStoriesByCharacterId,
      voiceLinesBySoundId,
      spotVoicesByCharacterId,
    };
  }).catch((error) => {
    cachedRepositoryPromise = null;
    throw error;
  });

  return cachedRepositoryPromise;
}
