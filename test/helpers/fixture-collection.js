// Build the characters collection from the committed fixture mirror, with no
// network and no live-mirror access. Shared by the transformer test (asserts the
// collection directly) and the build-output test (renders pages from it), so
// both exercise the same deterministic, hand-authored corpus.

import { readFileSync } from "node:fs";

import { buildAssetIndex, buildAudioIndex } from "../../pipeline/assets.js";
import {
  LEGACY_ACTIVITY_BANNER_DIR,
  LEGACY_CATCHAT_DIR,
  buildLegacyCatChatVersionsByActivity,
  buildLegacyVersionsByFile,
} from "../../pipeline/legacy.js";
import { transformAchievements } from "../../pipeline/achievements.js";
import { transformActivities } from "../../pipeline/activities.js";
import { transformCatChat } from "../../pipeline/catchat.js";
import { transformCharacters } from "../../pipeline/characters.js";
import { transformItems } from "../../pipeline/items.js";
import { buildStoryEntry, parseStoryBytesMap, parseStoryMapJson } from "../../pipeline/stories.js";

const MIRROR = new URL("../fixtures/mirror/", import.meta.url);

function readText(relPath) {
  return readFileSync(new URL(relPath, MIRROR), "utf8");
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function manifest(region) {
  return readJson(`extracted/extracted_manifest_${region}.json`).entries;
}

export function buildFixtureCollection() {
  const assetIndex = buildAssetIndex({
    en: manifest("en"),
    cn: manifest("cn"),
    jp: manifest("jp"),
    kr: manifest("kr"),
  });
  const audioIndex = buildAudioIndex(readJson("extracted/audio_manifest.json"));
  const tables = {
    character: readJson("metadata/tables/item_definition/character.json"),
    skin: readJson("metadata/tables/item_definition/skin.json"),
    characterEmoji: readJson("metadata/tables/character/emoji.json"),
    voiceSound: readJson("metadata/tables/voice/sound.json"),
    voiceSpot: readJson("metadata/tables/voice/spot.json"),
    spot: readJson("metadata/tables/spot/spot.json"),
    spotRewards: readJson("metadata/tables/spot/rewards.json"),
  };
  return transformCharacters(tables, assetIndex, audioIndex, buildFixtureItemsCollection());
}

export function buildFixtureItemsCollection() {
  const assetIndex = buildAssetIndex({
    en: manifest("en"),
    cn: manifest("cn"),
    jp: manifest("jp"),
    kr: manifest("kr"),
  });
  const audioIndex = buildAudioIndex(readJson("extracted/audio_manifest.json"));
  const tables = {
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
  return transformItems(tables, assetIndex, audioIndex);
}

export function buildFixtureAchievementsCollection() {
  return transformAchievements(
    {
      achievement: readJson("metadata/tables/achievement/achievement.json"),
      achievementGroup: readJson("metadata/tables/achievement/achievement_group.json"),
    },
    buildFixtureItemsCollection(),
  );
}

export function buildFixtureActivitiesCollection() {
  const assetIndex = buildAssetIndex({
    en: manifest("en"),
    cn: manifest("cn"),
    jp: manifest("jp"),
    kr: manifest("kr"),
  });
  // Discover the legacy manifest exactly as ingest does: cheap version pointer ->
  // resversion<version>.json, both carried inline by the fixture mirror.
  const version = readText("last_downloaded_version.txt").trim();
  const legacyBannerVersions = buildLegacyVersionsByFile(
    readJson(`resversion${version}.json`),
    LEGACY_ACTIVITY_BANNER_DIR,
  );
  return transformActivities(
    {
      activity: readJson("metadata/tables/activity/activity.json"),
      activityBanner: readJson("metadata/tables/activity/activity_banner.json"),
    },
    assetIndex,
    legacyBannerVersions,
  );
}

export function buildFixtureStoriesCollection() {
  const contentPath = "yiji/100004";
  const dictionaries = {
    en: parseStoryBytesMap(readText("extracted/MyAssets/docs/spots/yiji/100004_en.bytes")),
    jp: parseStoryBytesMap(readText("extracted/MyAssets/docs/spots/yiji/100004_jp.bytes")),
    chs: new Map(),
    chs_t: parseStoryBytesMap(readText("extracted/MyAssets/docs/spots/yiji/100004_chs_t.bytes")),
    kr: new Map(),
    map: parseStoryMapJson(readJson("extracted/MyAssets/docs/spots/yiji/100004_map.json")),
  };
  return {
    [contentPath]: buildStoryEntry(
      contentPath,
      readJson("extracted/MyAssets/docs/spots/yiji/100004.json"),
      dictionaries,
      readJson("metadata/tables/spot/rewards.json"),
      buildFixtureItemsCollection(),
    ),
  };
}

export function buildFixtureCatChatCollection() {
  const assetIndex = buildAssetIndex({
    en: manifest("en"),
    cn: manifest("cn"),
    jp: manifest("jp"),
    kr: manifest("kr"),
  });
  const version = readText("last_downloaded_version.txt").trim();
  const snsActivity = readJson("metadata/tables/activity/sns_activity.json");
  const legacyCatChatVersionsByFile = buildLegacyVersionsByFile(
    readJson(`resversion${version}.json`),
    LEGACY_CATCHAT_DIR,
  );
  const legacyCatChatVersionsByActivity = buildLegacyCatChatVersionsByActivity(
    snsActivity,
    legacyCatChatVersionsByFile,
  );
  return transformCatChat(
    {
      snsActivity,
      activity: readJson("metadata/tables/activity/activity.json"),
      strEvent: readJson("metadata/tables/str/event.json"),
    },
    assetIndex,
    legacyCatChatVersionsByFile,
    legacyCatChatVersionsByActivity,
    buildFixtureCollection(),
    buildFixtureItemsCollection(),
  );
}
