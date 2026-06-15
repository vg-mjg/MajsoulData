// One entry per (character × locale) so the detail template can paginate the
// cartesian product into a real per-locale page for every character. Each entry
// is the locale object with the character attached, so it drops straight into
// `base.njk` (which expects `locale.code`, `locale.fontQuery`, …) as the
// pagination alias while the body reads `locale.character`.

import { readFileSync } from "node:fs";
import locales from "./locales.js";

function loadJsonFile(name, fallback) {
  try {
    const raw = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function loadCharacters() {
  // Before the first ingest (or in a fresh clone) the collection may be absent.
  // Render no detail pages rather than failing the whole build.
  return loadJsonFile("characters.json", []);
}

export default function () {
  const characters = loadCharacters();
  const storiesByPath = loadJsonFile("stories.json", {});
  const pages = [];
  for (const locale of locales) {
    for (const character of characters) {
      const characterWithStories = {
        ...character,
        stories: (character.stories || []).map((story) => ({
          ...story,
          scenario: story.contentPath ? storiesByPath[story.contentPath] || null : null,
        })),
      };
      pages.push({ ...locale, character: characterWithStories });
    }
  }
  return pages;
}
