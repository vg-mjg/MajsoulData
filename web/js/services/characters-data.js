import { DEFAULT_UI_LANGUAGE, normalizeUiLanguage } from "../../utils.js";
import { imageCandidates } from "./resources.js";
import { loadCharactersRepository } from "./characters-repository.js";

function makeCharacterModel(character, skinPathById, resources, language = DEFAULT_UI_LANGUAGE) {
  const skinPath = skinPathById.get(Number(character.init_skin));
  const candidates = skinPath ? imageCandidates(resources, `${skinPath}/bighead`, language) : [];
  return {
    id: character.id,
    name_en: character.name_en,
    name_jp: character.name_jp,
    name_chs: character.name_chs,
    name_chs_t: character.name_chs_t,
    name_kr: character.name_kr,
    limited: Number(character.limited || 0),
    collaboration: Number(character.collaboration || 0),
    imageCandidates: candidates,
  };
}

const charactersCacheByLanguage = new Map();

export async function loadCharacters(language = DEFAULT_UI_LANGUAGE) {
  const normalizedLanguage = normalizeUiLanguage(language);
  if (charactersCacheByLanguage.has(normalizedLanguage)) {
    return charactersCacheByLanguage.get(normalizedLanguage);
  }

  const promise = loadCharactersRepository()
    .then((repository) => {
      const resources = repository.resources || {};
      const skinPathById = new Map((repository.skins || []).map((skin) => [Number(skin.id), skin.path]));
      return (repository.characters || [])
        .map((character) => makeCharacterModel(character, skinPathById, resources, normalizedLanguage))
        .sort((a, b) => a.id - b.id);
    })
    .catch((error) => {
      if (charactersCacheByLanguage.get(normalizedLanguage) === promise) {
        charactersCacheByLanguage.delete(normalizedLanguage);
      }
      throw error;
    });

  charactersCacheByLanguage.set(normalizedLanguage, promise);
  return promise;
}
