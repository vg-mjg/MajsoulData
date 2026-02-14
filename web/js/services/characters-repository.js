import { fetchJson } from "../core/http.js";

const URLS = {
  resversion: new URL("../../resversion.json", import.meta.url),
  itemDefinitionCharacter: new URL("../../data/ItemDefinitionCharacter.json", import.meta.url),
  itemDefinitionSkin: new URL("../../data/ItemDefinitionSkin.json", import.meta.url),
  itemDefinitionItem: new URL("../../data/ItemDefinitionItem.json", import.meta.url),
  itemDefinitionCurrency: new URL("../../data/ItemDefinitionCurrency.json", import.meta.url),
  levelDefinitionCharacter: new URL("../../data/LevelDefinitionCharacter.json", import.meta.url),
  composeCharacompose: new URL("../../data/ComposeCharacompose.json", import.meta.url),
  characterSkin: new URL("../../data/CharacterSkin.json", import.meta.url),
  characterEmoji: new URL("../../data/CharacterEmoji.json", import.meta.url),
  characterCutin: new URL("../../data/CharacterCutin.json", import.meta.url),
  spotCharacterSpot: new URL("../../data/SpotCharacterSpot.json", import.meta.url),
  spotSkinSpot: new URL("../../data/SpotSkinSpot.json", import.meta.url),
  spotSpot: new URL("../../data/SpotSpot.json", import.meta.url),
  spotRewards: new URL("../../data/SpotRewards.json", import.meta.url),
  voiceSound: new URL("../../data/VoiceSound.json", import.meta.url),
  voiceSpot: new URL("../../data/VoiceSpot.json", import.meta.url),
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
    fetchJson(URLS.resversion),
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
    resversion,
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

    const resourceManifest = resversion && resversion.res ? resversion.res : {};
    const characters = Array.isArray(itemDefinitionCharacter) ? itemDefinitionCharacter : [];
    const skins = Array.isArray(itemDefinitionSkin) ? itemDefinitionSkin : [];
    const items = Array.isArray(itemDefinitionItem) ? itemDefinitionItem : [];
    const currencies = Array.isArray(itemDefinitionCurrency) ? itemDefinitionCurrency : [];
    const characterLevels = Array.isArray(levelDefinitionCharacter) ? levelDefinitionCharacter : [];
    const composeEntries = Array.isArray(composeCharacompose) ? composeCharacompose : [];
    const skinExtras = Array.isArray(characterSkin) ? characterSkin : [];
    const emojis = Array.isArray(characterEmoji) ? characterEmoji : [];
    const cutins = Array.isArray(characterCutin) ? characterCutin : [];
    const spotCharacters = Array.isArray(spotCharacterSpot) ? spotCharacterSpot : [];
    const spotSkins = Array.isArray(spotSkinSpot) ? spotSkinSpot : [];
    const spotStories = Array.isArray(spotSpot) ? spotSpot : [];
    const spotRewardEntries = Array.isArray(spotRewards) ? spotRewards : [];
    const voiceLines = Array.isArray(voiceSound) ? voiceSound : [];
    const spotVoices = Array.isArray(voiceSpot) ? voiceSpot : [];
    const itemEntries = [...currencies, ...items];

    const characterById = new Map(characters.map((character) => [Number(character.id || 0), character]));
    const spotCharacterById = new Map(spotCharacters.map((character) => [Number(character.id || 0), character]));
    const skinById = new Map(skins.map((skin) => [Number(skin.id || 0), skin]));
    const itemById = new Map(itemEntries.map((entry) => [Number(entry.id || 0), entry]));
    const spotRewardById = new Map(spotRewardEntries.map((entry) => [Number(entry.id || 0), entry]));

    const skinsByCharacterId = groupBy(skins, (skin) => Number(skin.characterId || 0));
    const characterLevelsByCharacterId = groupBy(characterLevels, (entry) => Number(entry.characterId || 0));
    const composeByCharacterId = groupBy(composeEntries, (entry) => Number(entry.charaId || 0));
    const skinExtraBySkinId = new Map(skinExtras.map((entry) => [Number(entry.skinid || 0), entry]));
    const emojisByCharacterId = groupBy(emojis, (entry) => Number(entry.charid || 0));
    const cutinBySkinId = groupBy(cutins, (entry) => Number(entry.skinid || 0));
    const spotSkinsByCharacterId = groupBy(spotSkins, (entry) => Number(entry.characterId || 0));
    const spotStoriesByCharacterId = groupBy(spotStories, (entry) => Number(entry.id || 0));
    const voiceLinesBySoundId = groupBy(voiceLines, (entry) => Number(entry.id || 0));
    const spotVoicesByCharacterId = groupBy(spotVoices, (entry) => Number(entry.character || 0));

    return {
      resourceManifest,
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
