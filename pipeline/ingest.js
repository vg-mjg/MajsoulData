// Ingest orchestrator (the `ingest` npm script). Pulls the character domain from
// $MJS_SOURCE (public mirror or a local dump/fixture), denormalizes it into a
// self-contained committed collection, and skips work entirely when the mirror's
// resource version is unchanged. The static build reads the committed collection
// and never runs this.

import { promises as fsp } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FORCE,
  readJson,
  readOptionalJson,
  sourceLabel,
} from "./mirror.js";
import { buildAssetIndex, buildAudioIndex, collectBakedSeeds } from "./assets.js";
import {
  LEGACY_ACTIVITY_BANNER_DIR,
  LEGACY_CATCHAT_DIR,
  buildLegacyCatChatVersionsByActivity,
  buildLegacyVersionsByFile,
  loadLegacyManifest,
  readLegacyVersion,
} from "./legacy.js";
import { transformAchievements } from "./achievements.js";
import { transformActivities } from "./activities.js";
import { transformCatChat } from "./catchat.js";
import { transformCharacters } from "./characters.js";
import { transformItems } from "./items.js";
import { loadStoriesCollection } from "./stories.js";

// Mirror region -> the files that describe it.
const REGIONS = [
  { key: "en", meta: "meta_en.json", manifest: "extracted/extracted_manifest_en.json" },
  { key: "cn", meta: "meta_cn.json", manifest: "extracted/extracted_manifest_cn.json" },
  { key: "jp", meta: "meta_jp.json", manifest: "extracted/extracted_manifest_jp.json" },
  { key: "kr", meta: "meta_kr.json", manifest: "extracted/extracted_manifest_kr.json" },
];

const FETCH_STATE_SCHEMA_VERSION = 6;

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = process.env.MJS_DATA_DIR
  ? path.resolve(process.env.MJS_DATA_DIR)
  : path.join(ROOT, "src", "_data");
const STATE_FILE = process.env.MJS_STATE_FILE
  ? path.resolve(process.env.MJS_STATE_FILE)
  : path.join(ROOT, ".fetch-state.json");

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key]);
    return out;
  }
  return value;
}

async function writeJsonStable(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(sortKeysDeep(value), null, 2) + "\n");
}

function manifestEntries(manifest) {
  if (Array.isArray(manifest)) return manifest;
  return (manifest && manifest.entries) || [];
}

// Harvest the asset URLs already baked into the previously-committed collections,
// reversed into seed records for the asset/audio indexes. This is what preserves
// a reference whose file the mirror pruned from the live manifests: the file
// still serves (the mirror is additive), so its last-known URL keeps resolving
// as a low-priority seed that live manifests always override. The committed
// collections ARE the persistence — a seed survives only while some table row
// still emits its URL, so the preserved set self-GCs with the tables. A generic
// deep-walk over scalar strings: no per-collection shape knowledge.
async function harvestCommittedSeeds(files) {
  const seeds = { imageSeeds: [], audioSeeds: [] };
  for (const file of files) {
    const json = await fsp
      .readFile(file, "utf8")
      .then(JSON.parse)
      .catch(() => null);
    if (json) collectBakedSeeds(json, seeds);
  }
  return seeds;
}

// One-shot recovery hook (scripts/recover-pruned-assets-from-git-history.mjs):
// when MJS_SEED_URLS_FILE points at a JSON array of baked URLs mined from git
// history, they join the SAME low-priority seed tier as the committed-output
// harvest — live manifests still win, and only URLs a current table row still
// references get baked. Unset on every steady-state ingest.
async function appendRecoverySeeds(seeds) {
  const file = process.env.MJS_SEED_URLS_FILE;
  if (!file) return;
  const urls = JSON.parse(await fsp.readFile(file, "utf8"));
  collectBakedSeeds(urls, seeds);
  console.log(`Seeded ${urls.length} recovered URLs from ${file}.`);
}

async function main() {
  console.log(`Source: ${sourceLabel()}`);

  // Versions + manifests describe what we'd produce; hash them into a fetch
  // state so unchanged scheduled runs are cheap.
  const metas = {};
  const manifestsByRegion = {};
  for (const region of REGIONS) {
    metas[region.key] = await readJson(region.meta);
    manifestsByRegion[region.key] = manifestEntries(await readJson(region.manifest));
  }
  const audioManifest = await readJson("extracted/audio_manifest.json");

  const oldState = await fsp
    .readFile(STATE_FILE, "utf8")
    .then(JSON.parse)
    .catch(() => null);

  // Cheap legacy version pointer (a few bytes). Folded into the fetch-state so it
  // gates the ~12.7 MB legacy manifest: the heavy file is only read on a real
  // rebuild below. A source without the legacy slice reuses the last-known version.
  const legacyVersion =
    (await readLegacyVersion()) || (oldState && oldState.legacy_version) || null;

  const newState = {
    schema_version: FETCH_STATE_SCHEMA_VERSION,
    regions: {},
    audio_count: Array.isArray(audioManifest) ? audioManifest.length : 0,
    legacy_version: legacyVersion,
  };
  for (const region of REGIONS) {
    const meta = metas[region.key];
    newState.regions[region.key] = {
      resource_version: meta.resource_version,
      bundle_hash: meta.bundle_hash,
      manifest_generated_at: meta.generated_at || null,
    };
  }

  const charactersFile = path.join(DATA_DIR, "characters.json");
  const itemsFile = path.join(DATA_DIR, "items.json");
  const achievementsFile = path.join(DATA_DIR, "achievements.json");
  const activitiesFile = path.join(DATA_DIR, "activities.json");
  const catchatFile = path.join(DATA_DIR, "catchat.json");
  const storiesFile = path.join(DATA_DIR, "stories.json");
  const collectionsExist =
    fs.existsSync(charactersFile) &&
    fs.existsSync(itemsFile) &&
    fs.existsSync(achievementsFile) &&
    fs.existsSync(activitiesFile) &&
    fs.existsSync(catchatFile) &&
    fs.existsSync(storiesFile);

  const unchanged =
    JSON.stringify(sortKeysDeep(oldState)) === JSON.stringify(sortKeysDeep(newState));
  if (!FORCE && collectionsExist && unchanged) {
    console.log("Mirror unchanged; nothing to do (set MJS_FORCE=1 to rebuild).");
    return;
  }

  // Character domain tables. spot/voice tables are optional — a missing one just
  // means a character has no stories / spot voices, never a failed ingest.
  const tables = {
    character: await readJson("metadata/tables/item_definition/character.json"),
    skin: await readJson("metadata/tables/item_definition/skin.json"),
    characterEmoji: await readJson("metadata/tables/character/emoji.json"),
    voiceSound: await readJson("metadata/tables/voice/sound.json"),
    voiceSpot: (await readOptionalJson("metadata/tables/voice/spot.json")) || [],
    spot: (await readOptionalJson("metadata/tables/spot/spot.json")) || [],
    spotRewards: (await readOptionalJson("metadata/tables/spot/rewards.json")) || [],
  };

  const itemTables = {
    item: await readJson("metadata/tables/item_definition/item.json"),
    currency: await readJson("metadata/tables/item_definition/currency.json"),
    title: await readJson("metadata/tables/item_definition/title.json"),
    loadingImage: await readJson("metadata/tables/item_definition/loading_image.json"),
    audioBgm: (await readOptionalJson("metadata/tables/audio/bgm.json")) || [],
    itemPackage: (await readOptionalJson("metadata/tables/item_definition/item_package.json")) || [],
    sourceLimit: (await readOptionalJson("metadata/tables/item_definition/source_limit.json")) || [],
    exchange: (await readOptionalJson("metadata/tables/exchange/exchange.json")) || [],
    searchExchange: (await readOptionalJson("metadata/tables/exchange/searchexchange.json")) || [],
    fushiquanExchange: (await readOptionalJson("metadata/tables/exchange/fushiquanexchange.json")) || [],
    shops: (await readOptionalJson("metadata/tables/shops/goods.json")) || [],
    mall: (await readOptionalJson("metadata/tables/mall/goods.json")) || [],
    compose: (await readOptionalJson("metadata/tables/compose/characompose.json")) || [],
    character: tables.character,
    view: (await readOptionalJson("metadata/tables/item_definition/view.json")) || [],
  };

  const achievementTables = {
    achievement: await readJson("metadata/tables/achievement/achievement.json"),
    achievementGroup: await readJson("metadata/tables/achievement/achievement_group.json"),
  };

  const activityTables = {
    activity: await readJson("metadata/tables/activity/activity.json"),
    activityBanner: (await readOptionalJson("metadata/tables/activity/activity_banner.json")) || [],
  };

  const catchatTables = {
    snsActivity: (await readOptionalJson("metadata/tables/activity/sns_activity.json")) || [],
    activity: activityTables.activity,
    strEvent: (await readOptionalJson("metadata/tables/str/event.json")) || [],
  };

  // Reconstruct the seed tier from the collections BEFORE anything overwrites
  // them; on a fresh checkout the harvest is empty and output matches a seedless
  // build. Only paths absent from every live manifest become seed records.
  const seeds = await harvestCommittedSeeds([
    charactersFile,
    itemsFile,
    achievementsFile,
    activitiesFile,
    catchatFile,
    storiesFile,
  ]);
  await appendRecoverySeeds(seeds);

  const assetIndex = buildAssetIndex(manifestsByRegion, seeds.imageSeeds);
  const audioIndex = buildAudioIndex(audioManifest, seeds.audioSeeds);
  // The big legacy manifest is only fetched here, on the rebuild path the cheap
  // version gate above already let through.
  const legacyManifest = await loadLegacyManifest(legacyVersion);
  const legacyBannerVersions = buildLegacyVersionsByFile(
    legacyManifest,
    LEGACY_ACTIVITY_BANNER_DIR,
  );
  const legacyCatChatVersionsByFile = buildLegacyVersionsByFile(
    legacyManifest,
    LEGACY_CATCHAT_DIR,
  );
  const legacyCatChatVersionsByActivity = buildLegacyCatChatVersionsByActivity(
    catchatTables.snsActivity,
    legacyCatChatVersionsByFile,
  );
  const seedCount = Array.from(assetIndex.exact.values()).filter((rec) => rec.seed).length;
  console.log(
    `Indexed ${assetIndex.exact.size} asset paths (${seedCount} preserved from ` +
      `committed output), ${audioIndex.size} audio clips, ` +
      `${Object.keys(legacyBannerVersions).length} legacy banners, ` +
      `${Object.keys(legacyCatChatVersionsByFile).length} legacy CatChat images ` +
      `(${legacyVersion || "none"}).`,
  );

  const items = transformItems(itemTables, assetIndex, audioIndex);
  await writeJsonStable(itemsFile, items);

  const characters = transformCharacters(tables, assetIndex, audioIndex, items);
  await writeJsonStable(charactersFile, characters);

  const storyContentPaths = characters.flatMap((character) =>
    (character.stories || []).map((story) => story.contentPath).filter(Boolean),
  );
  const stories = await loadStoriesCollection(storyContentPaths, tables.spotRewards, items, {
    warn: (message) => console.warn(`Warning: ${message}`),
  });
  await writeJsonStable(storiesFile, stories);

  const achievements = transformAchievements(achievementTables, items);
  await writeJsonStable(achievementsFile, achievements);

  const activities = transformActivities(activityTables, assetIndex, legacyBannerVersions);
  await writeJsonStable(activitiesFile, activities);

  const catchat = transformCatChat(
    catchatTables,
    assetIndex,
    legacyCatChatVersionsByFile,
    legacyCatChatVersionsByActivity,
    characters,
    items,
  );
  await writeJsonStable(catchatFile, catchat);

  const version = {};
  for (const region of REGIONS) {
    const meta = metas[region.key];
    version[region.key] = {
      product_version: meta.product_version,
      resource_version: meta.resource_version,
      lua_version: meta.lua_version,
      issuer: meta.issuer,
      generated_at: meta.generated_at,
    };
  }
  await writeJsonStable(path.join(DATA_DIR, "version.json"), version);
  await writeJsonStable(STATE_FILE, newState);

  console.log(`Wrote ${characters.length} characters to ${charactersFile}.`);
  console.log(`Wrote ${items.length} items to ${itemsFile}.`);
  console.log(`Wrote ${achievements.length} achievement groups to ${achievementsFile}.`);
  console.log(`Wrote ${activities.length} activities to ${activitiesFile}.`);
  console.log(`Wrote ${catchat.length} CatChat activities to ${catchatFile}.`);
  console.log(`Wrote ${Object.keys(stories).length} stories to ${storiesFile}.`);
  console.log("Done.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
