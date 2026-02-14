import {
  DEFAULT_UI_LANGUAGE,
  characterBigheadCandidatePaths,
  normalizeUiLanguage,
} from "../../utils.js";
import { loadCharactersRepository } from "./characters-repository.js";

function resolveCharacterBigheadCandidates(character, skinPathById, resourceManifest, language = DEFAULT_UI_LANGUAGE) {
  const skinPath = skinPathById.get(character.initSkin);
  if (!skinPath) return [];

  const candidates = [];

  for (const path of characterBigheadCandidatePaths(skinPath, language)) {
    const entry = resourceManifest[path];
    if (!entry || !entry.prefix) continue;
    candidates.push({
      path,
      prefix: String(entry.prefix),
    });
  }

  return candidates;
}

function makeCharacterModel(character, skinPathById, resourceManifest, language = DEFAULT_UI_LANGUAGE) {
  const imageCandidates = resolveCharacterBigheadCandidates(character, skinPathById, resourceManifest, language);
  return {
    id: character.id,
    nameEn: character.nameEn,
    nameJp: character.nameJp,
    nameChs: character.nameChs,
    nameChsT: character.nameChsT,
    nameKr: character.nameKr,
    limited: Number(character.limited || 0),
    collaboration: Number(character.collaboration || 0),
    imageCandidates,
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
      const resourceManifest = repository.resourceManifest || {};
      const skinPathById = new Map((repository.skins || []).map((skin) => [skin.id, skin.path]));
      return (repository.characters || [])
        .map((character) => makeCharacterModel(character, skinPathById, resourceManifest, normalizedLanguage))
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
