import test from "node:test";
import assert from "node:assert/strict";

import { matchSearchEntries, normalizeSearchText } from "../src/assets/js/search-matcher.js";

const fixtureIndex = [
  { type: "item", id: 100001, name: "Jade", route: "/en/items/100001/", thumbnail: "/assets/jade.png" },
  { type: "character", id: 200001, name: "Jade Rabbit", route: "/en/characters/200001/", thumbnail: "/assets/rabbit.png" },
  { type: "item", id: 300001, name: "Jadeite Charm", route: "/en/items/300001/", thumbnail: "/assets/charm.png" },
  { type: "character", id: 200002, name: "Ada Jade", route: "/en/characters/200002/", thumbnail: "/assets/ada.png" },
  { type: "character", id: 200003, name: "Mysterious Jade", route: "/en/characters/200003/", thumbnail: "/assets/mystery.png" },
  { type: "item", id: 400001, name: "Copper", route: "/en/items/400001/", thumbnail: "/assets/copper.png" },
];

test("normalizes case, accents, and repeated whitespace", () => {
  assert.equal(normalizeSearchText("  JÁDE   Rabbit "), "jade rabbit");
});

test("orders exact, prefix, then contained name matches with deterministic tie breaks", () => {
  assert.deepEqual(
    matchSearchEntries(fixtureIndex, "jade").map((entry) => `${entry.type}:${entry.id}`),
    [
      "item:100001",
      "character:200001",
      "item:300001",
      "character:200002",
      "character:200003",
    ],
  );
});

test("limits result count after ranking", () => {
  assert.deepEqual(
    matchSearchEntries(fixtureIndex, "jade", { limit: 2 }).map((entry) => entry.name),
    ["Jade", "Jade Rabbit"],
  );
});
