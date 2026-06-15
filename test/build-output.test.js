// Build-output seam: render the real templates over a deterministic FIXTURE
// collection and assert the resulting HTML. To stay hermetic (independent of the
// committed real collection, which a maintainer re-ingests), we copy `src` into a
// temp directory, swap in the fixture characters.json, and point Eleventy there
// with an inline config that reuses the production filters. No mirror access.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Eleventy from "@11ty/eleventy";

import {
  buildFixtureAchievementsCollection,
  buildFixtureActivitiesCollection,
  buildFixtureCatChatCollection,
  buildFixtureCollection,
  buildFixtureItemsCollection,
  buildFixtureStoriesCollection,
} from "./helpers/fixture-collection.js";

const LOCALES = ["en", "jp", "chs", "chs_t", "kr"];
const TEST_CONFIG = new URL("./fixtures/eleventy-test.config.js", import.meta.url).pathname;

let pagesByUrl;
let stylesCss;
let tmp;

test.before(async () => {
  tmp = mkdtempSync(join(tmpdir(), "mjs-build-"));
  const input = join(tmp, "src");
  cpSync("src", input, { recursive: true });
  // Swap the committed (real) collection for the fixture corpus so assertions
  // are deterministic. characterDetailPages.js reads this file relative to itself.
  const characters = buildFixtureCollection();
  const singleSkinCharacter = JSON.parse(JSON.stringify(characters[0]));
  singleSkinCharacter.id = 299999;
  singleSkinCharacter.initSkin = singleSkinCharacter.skins[0].id;
  singleSkinCharacter.text.name.en = "Single Skin Fixture";
  singleSkinCharacter.skins = [singleSkinCharacter.skins[0]];
  characters.push(singleSkinCharacter);
  writeFileSync(
    join(input, "_data", "characters.json"),
    JSON.stringify(characters),
  );
  const items = buildFixtureItemsCollection();
  items.find((item) => item.id === 300005).text.name.en = "Trial's Ticket";
  writeFileSync(
    join(input, "_data", "items.json"),
    JSON.stringify(items),
  );
  writeFileSync(
    join(input, "_data", "achievements.json"),
    JSON.stringify(buildFixtureAchievementsCollection()),
  );
  writeFileSync(
    join(input, "_data", "activities.json"),
    JSON.stringify(buildFixtureActivitiesCollection()),
  );
  writeFileSync(
    join(input, "_data", "catchat.json"),
    JSON.stringify(buildFixtureCatChatCollection()),
  );
  writeFileSync(
    join(input, "_data", "stories.json"),
    JSON.stringify(buildFixtureStoriesCollection()),
  );
  writeFileSync(
    join(input, "_data", "version.json"),
    JSON.stringify({
      cn: { product_version: "4.0.cn", resource_version: "0.16.cn" },
      en: { product_version: "4.0.en", resource_version: "0.16.en" },
      jp: { product_version: "4.0.jp", resource_version: "0.16.jp" },
      kr: { product_version: "4.0.kr", resource_version: "0.16.kr" },
    }),
  );

  const elev = new Eleventy(input, join(tmp, "_site"), {
    quietMode: true,
    pathPrefix: "/MajsoulData/",
    configPath: TEST_CONFIG,
  });
  const results = await elev.toJSON();
  pagesByUrl = new Map(results.map((page) => [page.url, page]));
  stylesCss = readFileSync(join(input, "assets", "styles.css"), "utf8");
});

test.after(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

test("renders a list page and a detail page for every locale", () => {
  for (const code of LOCALES) {
    assert.ok(pagesByUrl.has(`/${code}/characters/`), `missing list page for ${code}`);
    assert.ok(
      pagesByUrl.has(`/${code}/characters/200001/`),
      `missing 200001 detail page for ${code}`,
    );
    assert.ok(
      pagesByUrl.has(`/${code}/characters/200034/`),
      `missing 200034 detail page for ${code}`,
    );
  }
});

test("emits a localized character and item search index for every locale", () => {
  for (const code of LOCALES) {
    assert.ok(pagesByUrl.has(`/${code}/search-index.json`), `missing search index for ${code}`);
  }

  const en = JSON.parse(pagesByUrl.get("/en/search-index.json").content);
  assert.ok(en.find((entry) => entry.type === "character" && entry.name === "Ichihime"));
  assert.ok(en.find((entry) => entry.type === "item" && entry.name === "Jade"));
  const ichihime = en.find((entry) => entry.type === "character" && entry.id === 200001);
  assert.equal(ichihime.route, "/en/characters/200001/");
  assert.match(ichihime.thumbnail, /deco\/character\/yiji\/smallhead\/smallhead\.png$/);

  const jp = JSON.parse(pagesByUrl.get("/jp/search-index.json").content);
  assert.ok(jp.find((entry) => entry.type === "character" && entry.name === "一姫"));
  assert.ok(jp.find((entry) => entry.type === "item" && entry.route === "/jp/items/100001/"));
});

test("base layout applies the resolved theme before loading stylesheets", () => {
  const en = pagesByUrl.get("/en/").content;
  const inlineTheme = en.indexOf('localStorage.getItem("theme")');
  const appCss = en.indexOf("/MajsoulData/assets/styles.css");
  const themeSwitcher = en.indexOf("/MajsoulData/assets/js/theme-switcher.js");

  assert.ok(inlineTheme > 0);
  assert.ok(inlineTheme < appCss);
  assert.ok(themeSwitcher > appCss);
  assert.doesNotMatch(en, /bootstrap/);
  assert.doesNotMatch(en, /cdn\.jsdelivr|unpkg\.com/);
  assert.match(en, /document\.documentElement\.setAttribute\("data-theme", theme\);/);
  assert.match(en, /prefers-color-scheme: dark/);
});

test("base layout wires the lazy sidebar search island to the locale index", () => {
  const en = pagesByUrl.get("/en/").content;
  assert.match(en, /data-sidebar-search/);
  assert.match(en, /data-search-index-url="\/MajsoulData\/en\/search-index\.json"/);
  assert.match(en, /placeholder="Search characters and items"/);
  assert.match(en, /<script type="module" src="\/MajsoulData\/assets\/js\/sidebar-search\.js"><\/script>/);
});

test("base layout bakes the per-locale game version label into the sidebar", () => {
  assert.match(pagesByUrl.get("/en/").content, /<span id="gameVersion" class="small">4\.0\.en \(0\.16\.en\)<\/span>/);
  assert.match(pagesByUrl.get("/jp/").content, /<span id="gameVersion" class="small">4\.0\.jp \(0\.16\.jp\)<\/span>/);
  assert.match(pagesByUrl.get("/kr/").content, /<span id="gameVersion" class="small">4\.0\.kr \(0\.16\.kr\)<\/span>/);
  assert.match(pagesByUrl.get("/chs/").content, /<span id="gameVersion" class="small">4\.0\.cn \(0\.16\.cn\)<\/span>/);
  assert.match(pagesByUrl.get("/chs_t/").content, /<span id="gameVersion" class="small">4\.0\.cn \(0\.16\.cn\)<\/span>/);
});

test("detail page renders localized text per locale", () => {
  assert.match(pagesByUrl.get("/en/characters/200001/").content, /Ichihime/);
  assert.match(pagesByUrl.get("/jp/characters/200001/").content, /一姫/);
  assert.match(pagesByUrl.get("/en/characters/200034/").content, /Saki Miyanaga/);
  assert.match(pagesByUrl.get("/jp/characters/200034/").content, /宮永咲/);
});

test("detail page bakes asset URLs straight into the HTML", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(en, /src="https:\/\/files\.riichi\.moe\/[^"]*deco\/character\/yiji\/full\/full\.png"/);
  // Voice clips are baked onto the play buttons' data-audio (the audio island reads them).
  assert.match(en, /data-audio="https:\/\/files\.riichi\.moe\/[^"]*audio\/sound\/yiji\/act_rich\.mp3"/);
  // Saki's sprites are cn-only; they still resolve for jp via the fallback chain.
  const jp = pagesByUrl.get("/jp/characters/200034/").content;
  assert.match(jp, /src="https:\/\/files\.riichi\.moe\/[^"]*deco\/character\/gongyongxiao\/[^"]*\.png"/);
});

test("language switcher emits locale_links to sibling URLs under the path prefix", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  // Every other locale's sibling detail URL, prefixed. (The current locale also
  // appears once as the active switcher item, which the locale_links filter
  // itself excludes.)
  for (const code of LOCALES.filter((c) => c !== "en")) {
    assert.match(
      en,
      new RegExp(`href="/MajsoulData/${code}/characters/200001/"`),
      `missing ${code} sibling link`,
    );
  }
});

test("detail page mounts per-skin spine controls fed by baked asset URLs", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(en, /data-spine-skins/);
  assert.match(en, /data-spine-host="400107"/);
  assert.match(en, /data-spine-play="400107"/);
  assert.match(en, /class="detail-spine-data"/);
  assert.match(en, /"400107":\[/);
  assert.match(
    en,
    /"skeletonUrl":"https:\/\/files\.riichi\.moe\/[^"]*spine\/400107\/yiji_kxj\.skel\.txt"/,
  );
  assert.match(
    en,
    /"atlasUrl":"https:\/\/files\.riichi\.moe\/[^"]*spine\/400107\/yiji_kxj\.atlas\.txt"/,
  );
  assert.doesNotMatch(en, /detail-spine-skin/);
  assert.match(en, /<script type="module" src="\/MajsoulData\/assets\/js\/spine-island\.js">/);
});

test("a character page renders its own inline spine layers on the owning skin", () => {
  const saki = pagesByUrl.get("/en/characters/200034/").content;
  assert.match(saki, /data-spine-host="403405"/);
  assert.match(saki, /"403405":\[/);
  assert.match(saki, /"name":"1"/);
  assert.match(saki, /"name":"2"/);
  assert.match(saki, /"skeletonUrl":"https:\/\/files\.riichi\.moe\/[^"]*spine\/403405\/1\/saki\.skel\.txt"/);
});

test("renders a CSS-only skin selector with the init skin checked by default", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  // A radio per skin, grouped per character, init (400101) checked.
  assert.match(en, /<input type="radio" name="skin-200001" id="skinRadio-400101"[^>]*checked/);
  assert.match(en, /<input type="radio" name="skin-200001" id="skinRadio-400107"[^>]*\/>/);
  // The non-init radio must NOT be checked.
  assert.doesNotMatch(en, /id="skinRadio-400107"[^>]*checked/);
  // The :has() correlation rules are baked per page (hero + description swap).
  assert.match(
    en,
    /#ch-200001:has\(#skinRadio-400107:checked\) \[data-skin-hero="400107"\]/,
  );
});

test("the skin grid badges the spine-owning skin as Live2D", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(
    en,
    /data-skin-card="400107">[\s\S]*?<span class="detail-skin-tag">Live2D<\/span>/,
  );
  assert.equal((en.match(/detail-skin-tag/g) || []).length, 1);
});

test("the Live2D badge positions against the thumbnail box", () => {
  assert.match(
    stylesCss,
    /\.detail-skin-thumb-wrap\s*{[^}]*position:\s*relative;[^}]*display:\s*block;[^}]*line-height:\s*0;/,
  );
});

test("character and item link cards keep neutral text styling in link states", () => {
  assert.match(
    stylesCss,
    /:is\(\.character-card,\s*\.item-card\),\s*:is\(\.character-card,\s*\.item-card\):hover,\s*:is\(\.character-card,\s*\.item-card\):focus,\s*:is\(\.character-card,\s*\.item-card\):active,\s*:is\(\.character-card,\s*\.item-card\):visited\s*{[^}]*color:\s*inherit;[^}]*text-decoration:\s*none;/,
  );
});

test("detail page renders skins, skin description, and emotes inside the info card", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  const infoCardStart = en.indexOf('<div class="detail-info-column">');
  const voicesStart = en.indexOf("<!-- Voices/Story toggle");
  const profileTitle = en.indexOf('<h2 class="detail-section-title detail-profile-title">Profile</h2>', infoCardStart);
  const profileGrid = en.indexOf('class="detail-profile-grid"', infoCardStart);
  const skins = en.indexOf('class="detail-skins"', infoCardStart);
  const skinDescription = en.indexOf('class="detail-skin-desc-stack"', infoCardStart);
  const emotes = en.indexOf('class="detail-stamps"', infoCardStart);
  assert.ok(infoCardStart > 0);
  assert.ok(voicesStart > infoCardStart);
  assert.ok(profileTitle > infoCardStart && profileTitle < voicesStart);
  assert.ok(profileGrid > profileTitle && profileGrid < voicesStart);
  assert.ok(skins > profileGrid && skins < voicesStart);
  assert.ok(skinDescription > skins && skinDescription < voicesStart);
  assert.ok(emotes > skinDescription && emotes < voicesStart);
  assert.match(en, /<h2 class="detail-section-title detail-stamps-title">Emotes<\/h2>/);
  assert.doesNotMatch(en, /Emotes \(4\)/);
  assert.match(en, /src="https:\/\/files\.riichi\.moe\/[^"]*deco\/emo\/e200001\/common\/0\.png"/);
  assert.match(
    en,
    /src="https:\/\/files\.riichi\.moe\/[^"]*deco\/emo\/e200001\/common\/888\.png"[^>]*title="Sticker Shop"/,
  );
  assert.doesNotMatch(en, /deco\/emo\/e200001\/common\/13\.png/);
});

test("detail page renders linked bond requirements below emotes", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  const infoCardStart = en.indexOf('<div class="detail-info-column">');
  const voicesStart = en.indexOf("<!-- Voices/Story toggle");
  const emotes = en.indexOf('class="detail-stamps"', infoCardStart);
  const bond = en.indexOf('class="detail-contract"', infoCardStart);
  assert.ok(bond > emotes && bond < voicesStart);
  assert.match(en, /<h2 class="detail-section-title detail-contract-title">Bond Requirements<\/h2>/);
  assert.match(en, /href="\/MajsoulData\/en\/items\/302010\/"[^>]*title="Cookie ×10"/);
  assert.match(en, /src="https:\/\/files\.riichi\.moe\/[^"]*extendRes\/items\/bond_302010\.png"[^>]*alt="Cookie"/);
  assert.match(en, /<span class="detail-contract-count-badge">×100<\/span>/);
  assert.match(en, /href="\/MajsoulData\/en\/items\/303113\/"[^>]*title="Ichihime Bond Token ×1"/);
});

test("the default-selected hero and skin names localize per locale", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(
    en,
    /<div class="detail-skin-hero-frame" data-skin-hero="400101">\s*<img class="detail-full-image detail-skin-static" src="https:\/\/files\.riichi\.moe\/[^"]*deco\/character\/yiji\/full\/full\.png"/,
  );
  assert.match(en, /class="detail-skin-name">Freshman Mornings</);
  const jp = pagesByUrl.get("/jp/characters/200001/").content;
  assert.match(jp, /class="detail-skin-name">新生の朝</);
});

test("per-skin spine mount points are inside radio-gated hero frames", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(
    en,
    /#ch-200001:has\(#skinRadio-400107:checked\) \[data-skin-hero="400107"\]/,
  );
  assert.match(
    en,
    /<div class="detail-skin-hero-frame" data-skin-hero="400107">[\s\S]*?<div class="detail-spine-host" data-spine-host="400107"><\/div>/,
  );
});

test("skin deep-link helper loads only for multi-skin characters and keeps prefixed radio ids", () => {
  const multi = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(multi, /<article class="character-detail-page" id="ch-200001" data-skin-linker data-init-skin="400101">/);
  assert.match(multi, /<script type="module" src="\/MajsoulData\/assets\/js\/skin-linker\.js"><\/script>/);
  assert.match(multi, /<input type="radio" name="skin-200001" id="skinRadio-400107"/);
  assert.doesNotMatch(multi, /id="skin-400107"/);

  const single = pagesByUrl.get("/en/characters/299999/").content;
  assert.doesNotMatch(single, /data-skin-linker/);
  assert.doesNotMatch(single, /skin-linker\.js/);
});

test("characters index renders query-param category tabs with live counts", () => {
  const en = pagesByUrl.get("/en/characters/").content;
  assert.match(en, /data-tab-toggle-root data-tab-toggle-param="tab"/);
  assert.match(en, /data-tab-toggle-button="all"[^>]*>All \(3\)<\/button>/);
  assert.match(en, /data-tab-toggle-button="standard"[^>]*>Standard \(2\)<\/button>/);
  assert.match(en, /data-tab-toggle-button="limited"[^>]*>Limited \(0\)<\/button>/);
  assert.match(en, /data-tab-toggle-button="collaboration"[^>]*>Collaboration \(1\)<\/button>/);
  assert.match(en, /data-tab-toggle-card data-tab-toggle-key="standard" data-category="Standard"/);
  assert.match(en, /data-tab-toggle-card data-tab-toggle-key="collaboration" data-category="Collaboration"/);
  assert.match(en, /<script type="module" src="\/MajsoulData\/assets\/js\/tab-toggle\.js"><\/script>/);
});

test("detail page has the CSS-only voices/story tab toggle and no inline tab script", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(en, /<input type="radio" name="cv-tab" id="cv-voices"[^>]*checked/);
  assert.match(en, /<input type="radio" name="cv-tab" id="cv-story"/);
  assert.match(en, /class="cv-panel cv-panel-voices"/);
  assert.match(en, /class="cv-panel cv-panel-story"/);
});

test("detail page renders structured story scenarios from the committed collection", () => {
  const en = pagesByUrl.get("/en/characters/200001/").content;
  assert.match(en, /<input type="radio" name="story-tab-200001" id="story-radio-200001-100001"[^>]*checked/);
  assert.match(en, /for="story-radio-200001-100004"[^>]*data-story-label="100004"[^>]*>4\. Ichihime Gone Missing<\/label>/);
  assert.match(en, /class="detail-story-panel" data-story-panel="100004"/);
  assert.match(en, /Ichihime Gone Missing/);
  assert.match(en, /Possible Endings/);
  assert.match(en, /Spots 1, Scenes 2, Choices 1, Endings 1/);
  assert.match(en, /<div class="detail-story-speaker">Narrator<\/div>/);
  assert.match(en, /Hello\s*world/);
  assert.match(en, /Follow the cat → Spot 2/);
  assert.match(en, /Unlock Ending - Cat/);
  assert.match(en, /Jade ×2/);
  assert.doesNotMatch(en, /character-story-loader/);
  assert.doesNotMatch(en, /fetch\(/);

  const jp = pagesByUrl.get("/jp/characters/200001/").content;
  assert.match(jp, /行方不明の一姫/);
  assert.match(jp, /こんにちは/);
  assert.match(jp, /猫を追う → Spot 2/);
});

test("renders an items list page and item detail page for every locale", () => {
  for (const code of LOCALES) {
    assert.ok(pagesByUrl.has(`/${code}/items/`), `missing items page for ${code}`);
    assert.ok(pagesByUrl.has(`/${code}/items/300001/`), `missing item detail for ${code}`);
  }
});

test("items index bakes all items once with a client-side category filter and lazy images", () => {
  const en = pagesByUrl.get("/en/items/").content;
  assert.match(en, /data-tab-toggle-root data-tab-toggle-param="filter"/);
  assert.match(en, /data-tab-toggle-button="gifts"/);
  assert.match(en, /data-tab-toggle-card data-tab-toggle-key="gifts"/);
  assert.match(en, /<script type="module" src="\/MajsoulData\/assets\/js\/tab-toggle\.js"><\/script>/);
  assert.match(en, /Gift Token/);
  assert.match(en, /src="https:\/\/files\.riichi\.moe\/[^\"]*extendRes\/items\/gift\.png"[^>]*loading="lazy"/);
  assert.doesNotMatch(en, /fetch\(/);
});

test("item detail page renders localized text, media, audio, and pricing from the collection", () => {
  const gift = pagesByUrl.get("/en/items/300001/").content;
  assert.match(gift, /Gift Token/);
  assert.match(gift, /Gift Box contains ×2/);
  assert.match(gift, /Gift Token Shop: 100001-5/);
  assert.match(gift, /src="https:\/\/files\.riichi\.moe\/[^\"]*extendRes\/items\/gift\.png"/);

  const jade = pagesByUrl.get("/en/items/100001/").content;
  assert.match(jade, /120 Jade: \$1\.99/);
  assert.doesNotMatch(jade, /120Jade: \$1\.99/);

  const jp = pagesByUrl.get("/jp/items/300001/").content;
  assert.match(jp, /Gift Token JP/);

  const tablecloth = pagesByUrl.get("/en/items/305001/").content;
  assert.match(tablecloth, /deco\/tablecloth\/blue\/3d\/texture\/Table_Dif\.png/);

  // A tablecloth whose icon folder is a misspelling bridges to its typo'd sibling's
  // texture (edit distance 1, matching numeric runs) and must NOT borrow the
  // unrelated `tablecloth_hl` texture the old unbounded fuzzy fallback grabbed
  // (regression: the SPA fixed this once, the rewrite reintroduced it).
  const typoTablecloth = pagesByUrl.get("/en/items/305005/").content;
  assert.match(typoTablecloth, /deco\/tablecloth\/tablecloth_achivement1\/3d\/texture\/Table_Dif\.png/);
  assert.doesNotMatch(typoTablecloth, /tablecloth_hl/);

  const music = pagesByUrl.get("/en/items/306001/").content;
  assert.match(music, /<audio class="item-detail-audio-player" controls preload="none" src="https:\/\/files\.riichi\.moe\/[^\"]*audio\/music\/riichi\.mp3"><\/audio>/);
});

test("page title preserves apostrophes from computed data", () => {
  const en = pagesByUrl.get("/en/items/300005/").content;
  assert.match(en, /<title>Trial's Ticket · Items · Mahjong Soul Data<\/title>/);
  assert.doesNotMatch(en, /Trial&amp;#39;s Ticket/);
});

test("item detail hides empty relationship sections and prefers same-locale functional text", () => {
  const en = pagesByUrl.get("/en/items/300005/").content;
  assert.match(en, /Entrance ticket to the Path of Trial\./);
  assert.doesNotMatch(en, /시련의 길 입장권/);
  assert.doesNotMatch(en, /Contents and containers/);
  assert.doesNotMatch(en, /Pricing and exchange/);

  const kr = pagesByUrl.get("/kr/items/300005/").content;
  assert.match(kr, /시련의 길 입장권\./);
});

test("renders achievements tabs and item reward links for every locale", () => {
  for (const code of LOCALES) {
    assert.ok(pagesByUrl.has(`/${code}/achievements/`), `missing achievements page for ${code}`);
  }
  const en = pagesByUrl.get("/en/achievements/").content;
  assert.match(en, /data-tab-toggle-root data-tab-toggle-param="tab"/);
  assert.match(en, /data-tab-toggle-button="all"[^>]*>All \(3\)<\/button>/);
  assert.match(en, /data-tab-toggle-button="group-1"/);
  assert.match(en, /data-tab-toggle-card data-tab-toggle-key="group-1"/);
  assert.doesNotMatch(en, /groups · \d+ achievements/);
  assert.match(en, /First Steps/);
  assert.match(en, /Hidden Path/);
  assert.match(en, /href="\/MajsoulData\/en\/items\/300001\/"/);
  assert.match(en, /href="\/MajsoulData\/en\/items\/600001\/"/);
  assert.match(en, /Gift Token ×2/);
  assert.match(en, /N\/A ×1/);
  assert.match(en, /<script type="module" src="\/MajsoulData\/assets\/js\/tab-toggle\.js"><\/script>/);
  assert.doesNotMatch(en, /fetch\(/);

  const jp = pagesByUrl.get("/jp/achievements/").content;
  assert.match(jp, /First Steps JP/);
});

test("renders a list-only activities index with lightbox-ready banner images", () => {
  for (const code of LOCALES) {
    assert.ok(pagesByUrl.has(`/${code}/activities/`), `missing activities page for ${code}`);
  }
  const en = pagesByUrl.get("/en/activities/").content;
  assert.doesNotMatch(en, /<p class="achievement-summary">7 activities<\/p>/);
  // Localized name for the festival; banner-derived fallback name for the gacha.
  assert.match(en, /Summer Festival/);
  assert.match(en, /winter gacha 0/);
  // Banner images are baked in with native lazy loading and a lightbox hook.
  assert.match(
    en,
    /data-lightbox-src="https:\/\/files\.riichi\.moe\/[^"]*ui\/activity\/lobby\/banner_tab\/pic\/summer_b\.png"/,
  );
  assert.match(
    en,
    /<img class="activity-thumb is-clickable" src="https:\/\/files\.riichi\.moe\/[^"]*summer_b\.png" alt="Summer Festival" loading="lazy"/,
  );
  assert.match(en, /<script type="module" src="\/MajsoulData\/assets\/js\/activities-lightbox\.js">/);
  // No per-activity sub-pages and no runtime data fetches.
  assert.ok(!pagesByUrl.has("/en/activities/250101/"));
  assert.doesNotMatch(en, /fetch\(/);

  // The localized name follows the UI language.
  const jp = pagesByUrl.get("/jp/activities/").content;
  assert.match(jp, /夏祭り/);
});

test("bakes per-locale banner art and legacy raw-asset fallbacks into the index", () => {
  // 250501 ships distinct art per script; each locale page bakes its own variant.
  assert.match(
    pagesByUrl.get("/en/activities/").content,
    /src="https:\/\/files\.riichi\.moe\/[^"]*banner_lobby\/pic\/en_en\/qingyun_b\.png"/,
  );
  assert.match(
    pagesByUrl.get("/chs/activities/").content,
    /src="https:\/\/files\.riichi\.moe\/[^"]*banner_lobby\/pic\/chs\/qingyun_b\.png"/,
  );
  assert.match(
    pagesByUrl.get("/chs_t/activities/").content,
    /src="https:\/\/files\.riichi\.moe\/[^"]*banner_lobby\/pic\/chs_t\/qingyun_b\.png"/,
  );
  // 250601's banner dropped out of unity_raw; it renders from the frozen archive.
  assert.match(
    pagesByUrl.get("/en/activities/").content,
    /src="https:\/\/files\.riichi\.moe\/[^"]*raw%20assets\/v0\.11\.235\.w\/en\/myres2\/activity_banner\/wenquan_b\.jpg"/,
  );
});

test("renders imageless activities as non-interactive placeholder cards", () => {
  const en = pagesByUrl.get("/en/activities/").content;
  // 250801 has a same-named asset in another directory that must NOT be borrowed,
  // and 250401 has no banner at all; both render as placeholders, never images.
  assert.match(
    en,
    /<div class="activity-card is-placeholder">\s*<div class="activity-thumb placeholder"[^>]*>Lonely Festival<\/div>/,
  );
  assert.match(
    en,
    /<div class="activity-card is-placeholder">\s*<div class="activity-thumb placeholder"[^>]*>Bannerless Activity<\/div>/,
  );
  // The cross-directory asset is never referenced; placeholders carry no lightbox.
  assert.doesNotMatch(en, /extend\/lonely/);
  assert.doesNotMatch(en, /data-lightbox-alt="Lonely Festival"/);
});

test("renders a single CatChat index per locale with client-side tabs and lazy images", () => {
  for (const code of LOCALES) {
    assert.ok(pagesByUrl.has(`/${code}/catchat/`), `missing catchat page for ${code}`);
  }
  const en = pagesByUrl.get("/en/catchat/").content;
  assert.match(en, /data-catchat-root/);
  assert.match(en, /data-catchat-tab="9001"/);
  assert.match(en, /data-catchat-panel="9001"/);
  assert.match(en, /Hello Player!\s*Fresh image post\./);
  assert.match(en, /Mystery Cat/);
  assert.match(en, /Unlock: Gift Token ×2/);
  assert.match(en, /src="\/MajsoulData\/assets\/mao\.png" alt="Player avatar"/);
  assert.match(en, /<span class="catchat-entry-badge choice">Choice 2<\/span>/);
  assert.match(
    en,
    /src="https:\/\/files\.riichi\.moe\/[^"]*catchat\/main\/pic_scattered\/en_en\/newpost\.png"[^>]*loading="lazy"/,
  );
  assert.match(
    en,
    /src="https:\/\/files\.riichi\.moe\/[^"]*raw%20assets\/v0\.11\.50\.w\/en\/myres\/sns\/legacy_file\.png"[^>]*loading="lazy"/,
  );
  assert.match(en, /Image unavailable/);
  assert.match(en, /<script type="module" src="\/MajsoulData\/assets\/js\/catchat-tabs\.js">/);
  assert.ok(!pagesByUrl.has("/en/catchat/9001/"));
  assert.doesNotMatch(en, /fetch\(/);
});

test("CatChat pages bake each locale's own image variant", () => {
  assert.match(
    pagesByUrl.get("/chs/catchat/").content,
    /src="https:\/\/files\.riichi\.moe\/[^"]*catchat\/main\/pic_scattered\/chs\/newpost\.png"/,
  );
  assert.match(
    pagesByUrl.get("/chs_t/catchat/").content,
    /src="https:\/\/files\.riichi\.moe\/[^"]*catchat\/main\/pic_scattered\/chs_t\/newpost\.png"/,
  );
});
