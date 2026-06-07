// Story scenario scripts (the old `docs/spot/*` bytes/JSON) are not part of the
// extracted mirror, so remote scenario content is unavailable. Inline story text
// (spot/spot `content`) is still shown directly by the detail view. This loader
// resolves to null so the view falls back to its "no scenario script" message.
export async function loadCharacterStoryContent() {
  return null;
}
