import test from "node:test";
import assert from "node:assert/strict";

import { buildFixtureActivitiesCollection } from "./helpers/fixture-collection.js";

function byId() {
  const map = new Map();
  for (const activity of buildFixtureActivitiesCollection()) map.set(activity.id, activity);
  return map;
}

test("keeps named or banner-bearing activities, dropping only the truly empty rows", () => {
  const activities = buildFixtureActivitiesCollection();
  // 250301 has a banner row with no name and every banner path blank, so it drops.
  // Everything else survives (a name OR a banner path), newest id first — imageless
  // placeholders (250401, 250801) interleave with the rest by id.
  assert.deepEqual(
    activities.map((activity) => activity.id),
    [250801, 250701, 250601, 250501, 250401, 250201, 250101],
  );
});

test("resolves the banner image through the field priority order", () => {
  const a = byId();
  // Big lobby art wins for the festival (banner_big, a .jpg resolved to the .png),
  // collapsed to a bare string because every locale shares the common asset.
  assert.match(a.get(250101).image, /ui\/activity\/lobby\/banner_tab\/pic\/summer_b\.png$/);
  // The gacha has no banner_big and an unresolvable banner_left, so the image
  // falls through to enter_icon.
  assert.match(a.get(250201).image, /ui\/activity\/lobby\/banner_lobby\/pic\/winter_gacha_0\.png$/);
});

test("builds a per-locale banner map from variants inside the ref's own directory", () => {
  // 250501's banner ships distinct art per script: English under en_en, Simplified
  // under chs, Traditional under chs_t — not one shared locale for all.
  const image = byId().get(250501).image;
  assert.equal(typeof image, "object");
  assert.match(image.en, /ui\/activity\/lobby\/banner_lobby\/pic\/en_en\/qingyun_b\.png$/);
  assert.match(image.cn, /ui\/activity\/lobby\/banner_lobby\/pic\/chs_t\/qingyun_b\.png$/);
  assert.match(image.chs, /ui\/activity\/lobby\/banner_lobby\/pic\/chs\/qingyun_b\.png$/);
  // jp/kr have no own art and no common file here, so they ride the render-time
  // fallback chain rather than binding to a wrong locale.
  assert.equal(image.jp, undefined);
  assert.equal(image.kr, undefined);
});

test("fills an old banner absent from unity_raw from the legacy raw-assets archive", () => {
  // 250601's banner is gone from the live mirror; every region resolves from the
  // frozen archive at the same version, with cn served from the chs_t folder.
  const image = byId().get(250601).image;
  assert.equal(typeof image, "object");
  assert.match(image.en, /raw%20assets\/v0\.11\.235\.w\/en\/myres2\/activity_banner\/wenquan_b\.jpg$/);
  assert.match(image.cn, /raw%20assets\/v0\.11\.235\.w\/chs_t\/myres2\/activity_banner\/wenquan_b\.jpg$/);
  assert.match(image.jp, /raw%20assets\/v0\.11\.235\.w\/jp\/myres2\/activity_banner\/wenquan_b\.jpg$/);
  assert.match(image.kr, /raw%20assets\/v0\.11\.235\.w\/kr\/myres2\/activity_banner\/wenquan_b\.jpg$/);
});

test("legacy banners use the correct per-region version", () => {
  // 250701's banner is archived at v0.11.104.w everywhere except jp (v0.11.106.w).
  const image = byId().get(250701).image;
  assert.match(image.en, /raw%20assets\/v0\.11\.104\.w\/en\//);
  assert.match(image.cn, /raw%20assets\/v0\.11\.104\.w\/chs_t\//);
  assert.match(image.chs, /raw%20assets\/v0\.11\.104\.w\/chs\//);
  assert.match(image.kr, /raw%20assets\/v0\.11\.104\.w\/kr\//);
  assert.match(image.jp, /raw%20assets\/v0\.11\.106\.w\/jp\//);
});

test("never borrows a same-named asset from a different directory", () => {
  // 250801's banner has no variant under its own dir and no legacy entry; a
  // same-named asset exists elsewhere (extend/lonely/.../lonely_b.png) but must
  // NOT be borrowed. The activity stays (it has a name) as an imageless placeholder.
  const lonely = byId().get(250801);
  assert.equal(lonely.image, "");
  assert.equal(lonely.text.name.en, "Lonely Festival");
});

test("keeps imageless activities for the placeholder rendering", () => {
  const a = byId();
  // A named activity with no banner row at all is kept with an empty image.
  const bannerless = a.get(250401);
  assert.equal(bannerless.image, "");
  assert.equal(bannerless.text.name.en, "Bannerless Activity");
  assert.equal(bannerless.fallbackName, "");
});

test("carries inline five-language names and a banner-derived fallback name", () => {
  const a = byId();
  assert.equal(a.get(250101).text.name.en, "Summer Festival");
  assert.equal(a.get(250101).text.name.jp, "夏祭り");
  assert.equal(a.get(250101).fallbackName, "summer b");

  // The gacha row has blank names in every language; the fallback derives a label
  // from the enter_icon filename.
  assert.equal(a.get(250201).text.name.en, "");
  assert.equal(a.get(250201).fallbackName, "winter gacha 0");
});
