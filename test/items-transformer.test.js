import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildAssetIndex, buildAudioIndex } from "../pipeline/assets.js";
import { transformItems } from "../pipeline/items.js";
import { buildFixtureItemsCollection } from "./helpers/fixture-collection.js";

const MIRROR = new URL("./fixtures/mirror/", import.meta.url);

function readJson(relPath) {
  return JSON.parse(readFileSync(new URL(relPath, MIRROR), "utf8"));
}

function manifest(region) {
  return readJson(`extracted/extracted_manifest_${region}.json`).entries;
}

function fixtureItemTables() {
  return {
    item: readJson("metadata/tables/item_definition/item.json"),
    currency: readJson("metadata/tables/item_definition/currency.json"),
    title: readJson("metadata/tables/item_definition/title.json"),
    loadingImage: readJson("metadata/tables/item_definition/loading_image.json"),
    audioBgm: readJson("metadata/tables/audio/bgm.json"),
    itemPackage: readJson("metadata/tables/item_definition/item_package.json"),
    sourceLimit: readJson("metadata/tables/item_definition/source_limit.json"),
    exchange: readJson("metadata/tables/exchange/exchange.json"),
    searchExchange: readJson("metadata/tables/exchange/searchexchange.json"),
    fushiquanExchange: readJson("metadata/tables/exchange/fushiquanexchange.json"),
    shops: readJson("metadata/tables/shops/goods.json"),
    mall: readJson("metadata/tables/mall/goods.json"),
    compose: readJson("metadata/tables/compose/characompose.json"),
    character: readJson("metadata/tables/item_definition/character.json"),
    view: readJson("metadata/tables/item_definition/view.json"),
  };
}

function fixtureAssetIndex() {
  return buildAssetIndex({
    en: manifest("en"),
    cn: manifest("cn"),
    jp: manifest("jp"),
    kr: manifest("kr"),
  });
}

function manifestEntries(region, extra = []) {
  return [...manifest(region), ...extra.map((outputPath) => ({ outputPath: `MyAssets/${outputPath}` }))];
}

function countByCategoryLabel(collection) {
  const counts = new Map();
  for (const item of collection) counts.set(item.categoryLabel, (counts.get(item.categoryLabel) || 0) + 1);
  return counts;
}

test("emits currencies, items, titles, and loading sprites with inline localized text", () => {
  const collection = buildFixtureItemsCollection();
  assert.ok(collection.find((item) => item.id === 100001 && item.kind === "currency"));
  assert.ok(collection.find((item) => item.id === 600001 && item.isTitleDefinition));
  const loadingSprite = collection.find((item) => item.kind === "loading_sprite");
  assert.ok(loadingSprite);
  assert.ok(loadingSprite.id > 900000000);
  const gift = collection.find((item) => item.id === 300001);
  assert.deepEqual(gift.text.name, {
    en: "Gift Token",
    jp: "Gift Token JP",
    chs: "Gift Token CHS",
    chs_t: "Gift Token CHT",
    kr: "Gift Token KR",
  });
});

test("resolves item category labels and baked media for item kinds", () => {
  const collection = buildFixtureItemsCollection();
  assert.equal(collection.find((item) => item.id === 300001).categoryLabel, "Gifts");
  assert.match(collection.find((item) => item.id === 300001).assets.icon, /extendRes\/items\/gift\.png$/);
  assert.match(collection.find((item) => item.id === 600001).assets.titleArt, /deco\/title\/notitle\/pic\/notitle\.png$/);
  assert.match(collection.find((item) => item.id === 307401).assets.loadingImage, /deco\/loading_cg\/201201\/main\/201201\.jpg$/);
  assert.match(collection.find((item) => item.id === 305001).assets.tablecloth, /deco\/tablecloth\/blue\/3d\/texture\/Table_Dif\.png$/);
  // The icon folder `tablecloth_achievement1` has no texture of its own; the real
  // texture lives under the typo'd sibling `tablecloth_achivement1` (edit distance
  // 1, identical numeric runs). It must bridge to that sibling — and never borrow
  // the unrelated `tablecloth_hl` texture the old unbounded fuzzy fallback grabbed.
  const typoTablecloth = collection.find((item) => item.id === 305005).assets.tablecloth;
  assert.match(typoTablecloth, /deco\/tablecloth\/tablecloth_achivement1\/3d\/texture\/Table_Dif\.png$/);
  assert.doesNotMatch(typoTablecloth, /tablecloth_hl/);
  // No full texture exists for `tablecloth_fish1`, so it falls back to its own
  // locale preview rather than borrowing another cloth's texture.
  const previewTablecloth = collection.find((item) => item.id === 305006).assets.tablecloth;
  assert.match(previewTablecloth, /deco\/tablecloth\/tablecloth_fish1\/preview\/en_en\/preview\.png$/);
  assert.match(collection.find((item) => item.id === 305002).assets.tile, /deco\/mjpai\/green\/3d\/texture\/hand\.png$/);
  assert.match(collection.find((item) => item.id === 305003).assets.portraitFrame, /deco\/head_frame\/gold_frame\/icon\/gold_frame\.png$/);
  assert.match(collection.find((item) => item.id === 305004).assets.background, /extendRes\/background\/moon_bg\/moon_bg\.png$/);
});

test("bakes item audio and usage/pricing relationships", () => {
  const collection = buildFixtureItemsCollection();
  const music = collection.find((item) => item.id === 306001);
  assert.equal(music.audio.kind, "riichi");
  assert.match(music.audio.url, /audio\/music\/riichi\.mp3$/);

  const gift = collection.find((item) => item.id === 300001);
  assert.equal(gift.usageCounts.packageContainers, 1);
  assert.equal(gift.usageCounts.shopListings, 1);
  assert.equal(gift.usageCounts.shopPricing, 0);
  assert.equal(gift.usageCounts.sourceLimits, 1);
  assert.equal(gift.usageCounts.composeUsage, 1);
  assert.equal(gift.packageContainers[0].packageId, 300010);
  assert.equal(gift.shopListings[0].prices[0].itemId, 100001);

  const jade = collection.find((item) => item.id === 100001);
  assert.equal(jade.usageCounts.exchangeSpend, 1);
  assert.equal(jade.usageCounts.mallListings, 1);
  assert.equal(jade.usageCounts.shopPricing, 1);

  const bondToken = collection.find((item) => item.id === 303113);
  assert.equal(bondToken.usageCounts.characterMaterialUsage, 1);
  assert.equal(bondToken.characterMaterialUsage[0].characterId, 200001);
  assert.equal(bondToken.characterMaterialUsage[0].count, 1);
});

test("collapses portrait frames sharing one resolved image to the lowest sort/id representative", () => {
  const tables = fixtureItemTables();
  const frame = tables.item.find((item) => item.id === 305003);
  tables.item.push(
    { ...frame, id: 305102, sort: 1, name_en: "Limited Portrait Frame A", item_expire: "2026-07-01" },
    { ...frame, id: 305103, sort: 1, name_en: "Limited Portrait Frame B", item_expire: "2026-08-01" },
  );
  tables.view.push(
    { id: 305102, res_name: "gold_frame" },
    { id: 305103, res_name: "gold_frame" },
  );

  const assetIndex = fixtureAssetIndex();
  const audioIndex = buildAudioIndex(readJson("extracted/audio_manifest.json"));
  const baseline = buildFixtureItemsCollection();
  const collection = transformItems(tables, assetIndex, audioIndex);
  const frames = collection.filter((item) => item.categoryLabel === "Portrait Frames");

  assert.deepEqual(frames.map((item) => item.id), [305102]);
  assert.match(frames[0].assets.portraitFrame, /deco\/head_frame\/gold_frame\/icon\/gold_frame\.png$/);

  const baselineCounts = countByCategoryLabel(baseline);
  const counts = countByCategoryLabel(collection);
  for (const [label, count] of baselineCounts) {
    assert.equal(counts.get(label), count, `${label} count changed`);
  }
});

test("resolves localized title item icons from variants inside the title directory", () => {
  const tables = fixtureItemTables();
  tables.title = [
    {
      id: 600777,
      priority: 777,
      name_en: "Localized Title",
      name_jp: "Localized Title JP",
      name_chs: "Localized Title CHS",
      name_chs_t: "Localized Title CHT",
      name_kr: "Localized Title KR",
      desc_en: "",
      desc_jp: "",
      desc_chs: "",
      desc_chs_t: "",
      desc_kr: "",
      icon: "deco/title/localized/pic/title.png",
      icon_item: "",
      unlock_type: 0,
      unlock_param: {},
      cross_view: 0,
    },
  ];

  const localizedTitlePaths = [
    "deco/title/localized/pic/en_en/title.png",
    "deco/title/localized/pic/jp/title.png",
    "deco/title/localized/pic/chs/title.png",
    "deco/title/localized/pic/chs_t/title.png",
    "deco/title/localized/pic/kr/title.png",
    "deco/title/other/pic/jp/title.png",
  ];
  const assetIndex = buildAssetIndex({
    en: manifestEntries("en", localizedTitlePaths),
    cn: manifestEntries("cn", localizedTitlePaths),
    jp: manifestEntries("jp", localizedTitlePaths),
    kr: manifestEntries("kr", localizedTitlePaths),
  });
  const audioIndex = buildAudioIndex(readJson("extracted/audio_manifest.json"));
  const collection = transformItems(tables, assetIndex, audioIndex);
  const title = collection.find((item) => item.id === 600777);

  assert.equal(typeof title.assets.icon, "object");
  assert.match(title.assets.icon.en, /deco\/title\/localized\/pic\/en_en\/title\.png$/);
  assert.match(title.assets.icon.jp, /deco\/title\/localized\/pic\/jp\/title\.png$/);
  assert.match(title.assets.icon.chs, /deco\/title\/localized\/pic\/chs\/title\.png$/);
  assert.match(title.assets.icon.cn, /deco\/title\/localized\/pic\/chs_t\/title\.png$/);
  assert.match(title.assets.icon.kr, /deco\/title\/localized\/pic\/kr\/title\.png$/);
  assert.equal(Object.values(title.assets.icon).some((url) => url.includes("/other/")), false);
  assert.deepEqual(title.assets.titleArt, title.assets.icon);
});

test("keeps plain item icons as unchanged bare strings", () => {
  const baselineGiftIcon = buildFixtureItemsCollection().find((item) => item.id === 300001).assets.icon;
  const tables = fixtureItemTables();
  const assetIndex = fixtureAssetIndex();
  const audioIndex = buildAudioIndex(readJson("extracted/audio_manifest.json"));
  const gift = transformItems(tables, assetIndex, audioIndex).find((item) => item.id === 300001);

  assert.equal(typeof gift.assets.icon, "string");
  assert.equal(gift.assets.icon, baselineGiftIcon);
});

test("title item icons fall back to the title texture when the item thumbnail is absent", () => {
  const tables = fixtureItemTables();
  tables.title = [
    {
      id: 600778,
      priority: 778,
      name_en: "Missing Item Thumbnail Title",
      name_jp: "Missing Item Thumbnail Title JP",
      name_chs: "Missing Item Thumbnail Title CHS",
      name_chs_t: "Missing Item Thumbnail Title CHT",
      name_kr: "Missing Item Thumbnail Title KR",
      desc_en: "",
      desc_jp: "",
      desc_chs: "",
      desc_chs_t: "",
      desc_kr: "",
      icon: "deco/title/fallback/pic/title.png",
      icon_item: "deco/title/fallback/pic/title_item.png",
      unlock_type: 0,
      unlock_param: {},
      cross_view: 0,
    },
  ];

  const titleTexturePaths = [
    "deco/title/fallback/pic/en_en/title.png",
    "deco/title/fallback/pic/jp/title.png",
    "deco/title/fallback/pic/chs/title.png",
    "deco/title/fallback/pic/chs_t/title.png",
    "deco/title/fallback/pic/kr/title.png",
  ];
  const assetIndex = buildAssetIndex({
    en: manifestEntries("en", titleTexturePaths),
    cn: manifestEntries("cn", titleTexturePaths),
    jp: manifestEntries("jp", titleTexturePaths),
    kr: manifestEntries("kr", titleTexturePaths),
  });
  const audioIndex = buildAudioIndex(readJson("extracted/audio_manifest.json"));
  const title = transformItems(tables, assetIndex, audioIndex).find((item) => item.id === 600778);

  assert.deepEqual(title.assets.icon, title.assets.titleArt);
  assert.match(title.assets.icon.en, /deco\/title\/fallback\/pic\/en_en\/title\.png$/);
});
