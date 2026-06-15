// One entry per (item × locale) so each committed collection item gets a real
// per-locale detail URL at /{locale}/items/{id}/.

import { readFileSync } from "node:fs";
import locales from "./locales.js";

function loadItems() {
  try {
    const raw = readFileSync(new URL("./items.json", import.meta.url), "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default function () {
  const items = loadItems();
  const pages = [];
  for (const locale of locales) {
    for (const item of items) pages.push({ ...locale, item });
  }
  return pages;
}
