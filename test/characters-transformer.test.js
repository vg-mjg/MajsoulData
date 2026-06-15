// Domain transformer seam: (parsed tables, asset index, audio index) -> the
// language-agnostic characters collection. The fixtures are a small REAL slice of
// the mirror tables (Ichihime 200001, Saki Miyanaga 200034), exercised with no
// network access and no live mirror.

import test from "node:test";
import assert from "node:assert/strict";

import { transformCharacters } from "../pipeline/characters.js";
import { buildFixtureCollection as buildCollection } from "./helpers/fixture-collection.js";

const EMPTY_ASSET_INDEX = { exact: new Map(), noext: new Map(), byBase: new Map() };
const EMPTY_AUDIO_INDEX = new Map();

function namedItem(id, name, canSell) {
  return {
    id,
    canSell,
    text: {
      name: {
        en: name,
        jp: `${name} JP`,
        chs: `${name} CHS`,
        chs_t: `${name} CHT`,
        kr: `${name} KR`,
      },
    },
    assets: { icon: `icon-${id}.png` },
  };
}

test("emits one entry per character, sorted by id", () => {
  const collection = buildCollection();
  assert.deepEqual(
    collection.map((c) => c.id),
    [200001, 200034],
  );
});

test("carries all five languages of text inline", () => {
  const ichihime = buildCollection()[0];
  assert.deepEqual(ichihime.text.name, {
    en: "Ichihime",
    jp: "一姫",
    chs: "一姬",
    chs_t: "一姬",
    kr: "이치히메",
  });
  assert.equal(ichihime.text.stature.en, "154 cm");
  assert.equal(ichihime.text.cv.jp, "内田真礼");
});

test("folds EN-base assets inline as bare URL strings", () => {
  const ichihime = buildCollection()[0];
  assert.equal(typeof ichihime.assets.bighead, "string");
  assert.match(ichihime.assets.bighead, /deco\/character\/yiji\/bighead\/bighead\.png$/);
});

test("folds region-exclusive assets inline as {region: url} value-maps", () => {
  // Saki's sprites ship only in the CN dump, so each variant is a {cn: url} map.
  const saki = buildCollection()[1];
  assert.equal(typeof saki.assets.bighead, "object");
  assert.deepEqual(Object.keys(saki.assets.bighead), ["cn"]);
  assert.match(saki.assets.bighead.cn, /deco\/character\/gongyongxiao\/bighead\/bighead\.png$/);
});

test("joins voices by sound id and bakes resolved audio URLs", () => {
  const ichihime = buildCollection()[0];
  assert.equal(ichihime.voices.length, 3);
  // All category 2, so sorted by type: act_chi < act_drich < act_rich.
  assert.equal(ichihime.voices[0].text.name.en, "Chii");
  assert.match(ichihime.voices[0].audio, /audio\/sound\/yiji\/act_chi\.mp3$/);
  assert.equal(ichihime.spotVoices.length, 1);
  assert.match(ichihime.spotVoices[0].audio, /audio\/sound\/yiji\/spot\/jtm_2_ich_085\.mp3$/);
});

test("joins stories and flags scenario vs inline content", () => {
  const ichihime = buildCollection()[0];
  assert.equal(ichihime.stories.length, 3);
  // Sorted by queue: the inline story (no content_path) first, then scenarios.
  assert.equal(ichihime.stories[0].text.name.en, "Nekomata - Rumor");
  assert.equal(ichihime.stories[0].hasScenario, false);
  assert.equal(ichihime.stories[1].hasScenario, true);
  // The Oath scenario is flagged married.
  assert.equal(ichihime.stories[2].isMarried, 1);
});

test("folds a skin's spine layer set into that skins[] entry with baked EN-base URLs", () => {
  const ichihime = buildCollection()[0];
  assert.equal("spine" in ichihime, false);
  const init = ichihime.skins[0];
  const live2d = ichihime.skins[1];
  assert.equal(init.id, 400101);
  assert.deepEqual(init.spine, []);
  assert.equal(live2d.id, 400107);
  assert.equal(live2d.text.name.en, "Freshman Mornings");
  assert.equal(live2d.spine.length, 1);
  const layer = live2d.spine[0];
  assert.equal(layer.name, "plain");
  assert.equal(typeof layer.skeleton, "string");
  assert.match(layer.skeleton, /spine\/400107\/yiji_kxj\.skel\.txt$/);
  assert.match(layer.atlas, /spine\/400107\/yiji_kxj\.atlas\.txt$/);
  assert.match(layer.textures[0], /spine\/400107\/yiji_kxj\.png$/);
});

test("orders stacked spine layers inside the owning skin and folds region-exclusive ones as value-maps", () => {
  const saki = buildCollection()[1];
  const live2d = saki.skins.find((skin) => skin.id === 403405);
  assert.ok(live2d);
  assert.deepEqual(live2d.spine.map((l) => l.name), ["1", "2"]);
  assert.deepEqual(Object.keys(live2d.spine[0].skeleton), ["cn"]);
  assert.match(live2d.spine[0].skeleton.cn, /spine\/403405\/1\/saki\.skel\.txt$/);
  assert.match(live2d.spine[1].atlas.cn, /spine\/403405\/2\/saki\.atlas\.txt$/);
});

test("emits the full skin roster, sorted by id, with inline 5-language text", () => {
  const ichihime = buildCollection()[0];
  assert.equal(ichihime.initSkin, 400101);
  assert.deepEqual(
    ichihime.skins.map((s) => s.id),
    [400101, 400107],
  );
  const init = ichihime.skins[0];
  assert.deepEqual(init.text.name, {
    en: "Ichihime",
    jp: "一姫",
    chs: "一姬",
    chs_t: "一姬",
    kr: "이치히메",
  });
  assert.equal(init.text.description.en, "Ichihime’s default look");
  assert.equal(init.text.lockTips.en, "");
});

test("merges base emotes before table emotes, excludes event specials, and bakes image/text", () => {
  const ichihime = buildCollection()[0];
  assert.deepEqual(
    ichihime.emotes.map((emote) => emote.subId),
    [0, 2, 888, 10],
  );

  assert.match(ichihime.emotes[0].image, /deco\/emo\/e200001\/common\/0\.png$/);
  assert.deepEqual(ichihime.emotes[0].unlockDescription, {
    en: "",
    jp: "",
    chs: "",
    chs_t: "",
    kr: "",
  });

  assert.deepEqual(Object.keys(ichihime.emotes[1].image).sort(), ["chs", "cn", "en", "jp", "kr"]);
  assert.match(ichihime.emotes[1].image.en, /deco\/emo\/e200001\/en_en\/2\.png$/);
  assert.match(ichihime.emotes[1].image.cn, /deco\/emo\/e200001\/chs_t\/2\.png$/);

  const stickerShop = ichihime.emotes[2];
  assert.match(stickerShop.image, /deco\/emo\/e200001\/common\/888\.png$/);
  assert.deepEqual(stickerShop.unlockDescription, {
    en: "Sticker Shop",
    jp: "スタンプ交換所",
    chs: "表情商店",
    chs_t: "表情商店",
    kr: "스탬프 상점",
  });
  assert.equal(ichihime.emotes.some((emote) => emote.subId >= 13 && emote.subId <= 18), false);
});

test("parses bond materials and enriches them with item names and icons", () => {
  const ichihime = buildCollection()[0];
  assert.deepEqual(
    ichihime.bond.map((item) => ({ itemId: item.itemId, count: item.count })),
    [
      { itemId: 302010, count: 10 },
      { itemId: 302011, count: 10 },
      { itemId: 303113, count: 1 },
      { itemId: 303013, count: 5 },
      { itemId: 302002, count: 10 },
      { itemId: 302004, count: 100 },
    ],
  );
  assert.equal(ichihime.bond[0].name.en, "Cookie");
  assert.match(ichihime.bond[0].icon, /extendRes\/items\/bond_302010\.png$/);
  assert.equal(ichihime.bond[2].name.en, "Ichihime Bond Token");
  assert.match(ichihime.bond[2].icon, /extendRes\/items\/bond_303113\.png$/);
});

test("deduplicates same-name bond gifts by keeping sellable entries", () => {
  const collection = transformCharacters(
    {
      character: [
        {
          id: 1,
          star_5_material: "101-1,102-2,201-3,301-4",
        },
      ],
    },
    EMPTY_ASSET_INDEX,
    EMPTY_AUDIO_INDEX,
    [
      namedItem(101, "Delicious Cookie", 0),
      namedItem(102, "Delicious Cookie", 1),
      namedItem(201, "Sphere of Innocence", 0),
      namedItem(301, "Unique Sellable", 1),
    ],
  );

  assert.deepEqual(
    collection[0].bond.map((item) => ({ itemId: item.itemId, count: item.count, icon: item.icon })),
    [
      { itemId: 102, count: 2, icon: "icon-102.png" },
      { itemId: 201, count: 3, icon: "icon-201.png" },
      { itemId: 301, count: 4, icon: "icon-301.png" },
    ],
  );
});

test("bakes each skin's preview sprite variants as resolved value-maps", () => {
  const ichihime = buildCollection()[0];
  // The init skin ships baked EN-base sprites; bighead is a bare string URL.
  const init = ichihime.skins[0];
  assert.equal(typeof init.assets.bighead, "string");
  assert.match(init.assets.bighead, /deco\/character\/yiji\/bighead\/bighead\.png$/);
  // Saki's init skin sprites are cn-only, so each variant is a {cn: url} map.
  const sakiInit = buildCollection()[1].skins[0];
  assert.equal(typeof sakiInit.assets.full, "object");
  assert.deepEqual(Object.keys(sakiInit.assets.full), ["cn"]);
});

test("marks Live2D skins by carrying their spine layers inline", () => {
  const ichihime = buildCollection()[0];
  assert.equal(ichihime.skins[0].spine.length, 0);
  assert.equal(ichihime.skins[1].id, 400107);
  assert.equal(ichihime.skins[1].spine.length, 1);
});

test("a skin only resolves its OWN sprites, never another character's same-named ones", () => {
  // 400107 (yiji_kxj) ships no baked sprites in the fixture. Sprite paths are
  // deterministic, so the resolver must NOT fuzzy-borrow the base skin's (yiji)
  // identically-named files — the variant set is simply empty.
  const ichihime = buildCollection()[0];
  assert.deepEqual(ichihime.skins[1].assets, {});
});

test("a character with no spot voices or stories emits empty arrays", () => {
  const saki = buildCollection()[1];
  assert.deepEqual(saki.spotVoices, []);
  assert.deepEqual(saki.stories, []);
  assert.equal(saki.text.name.en, "Saki Miyanaga");
});
