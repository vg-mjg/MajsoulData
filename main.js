'use strict';

/*
 * Idempotent build step for the Mahjong Soul data viewer.
 *
 *   <SOURCE>/meta_<region>.json                         per-region versions
 *   <SOURCE>/metadata/index.json                        list of data tables
 *   <SOURCE>/metadata/tables/<table>/<sheet>.json       snake_case data tables
 *   <SOURCE>/extracted/extracted_manifest_<region>.json physical asset paths
 *   <SOURCE>/extracted/audio_manifest.json              audio paths (EN, complete)
 *
 * This script mirrors the data tables verbatim into `web/data/` and resolves an
 * app-scoped `web/resources.json` map (logical reference -> mirror URL) for every
 * asset the viewer renders, so the browser no longer has to guess URLs.
 *
 * Reads from $MJS_SOURCE (an http(s) base or a local directory); defaults to the
 * public mirror. Emitted asset URLs always point at the public mirror. Set
 * $MJS_FORCE=1 to rebuild even when the mirror is unchanged.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const MIRROR = 'https://files.riichi.moe/mjg/game%20resources%20and%20tools/Mahjong%20Soul/unity_raw';
const SOURCE = (process.env.MJS_SOURCE || MIRROR).replace(/\/+$/, '');
const FORCE = process.env.MJS_FORCE === '1';

const ROOT = __dirname;
const WEB_DIR = path.join(ROOT, 'web');
const DATA_DIR = path.join(WEB_DIR, 'data');
const STATE_FILE = path.join(WEB_DIR, '.fetch-state.json');
const METADATA_TABLE_SELECTION_VERSION = 1;

const REQUIRED_METADATA_TABLES = new Set([
  'achievement/achievement',
  'achievement/achievement_group',
  'achievement/badge',
  'achievement/badge_group',
  'audio/bgm',
  'character/cutin',
  'character/emoji',
  'character/skin',
  'compose/characompose',
  'events/base_task',
  'exchange/exchange',
  'exchange/fushiquanexchange',
  'exchange/searchexchange',
  'item_definition/character',
  'item_definition/currency',
  'item_definition/item',
  'item_definition/item_package',
  'item_definition/loading_image',
  'item_definition/skin',
  'item_definition/source_limit',
  'item_definition/title',
  'level_definition/character',
  'mall/goods',
  'shops/goods',
  'spot/character_spot',
  'spot/rewards',
  'spot/skin_spot',
  'spot/spot',
  'str/event',
  'str/str',
  'voice/sound',
  'voice/spot',
]);

// Mirror regions. `cn` carries the issuer `chs_t`; the web app maps both the
// `chs` and `chs_t` UI languages onto it. `en` is the complete base; the others
// only list paths exclusive to that region.
const REGIONS = [
  { key: 'en', meta: 'meta_en.json', manifest: 'extracted/extracted_manifest_en.json' },
  { key: 'cn', meta: 'meta_cn.json', manifest: 'extracted/extracted_manifest_cn.json' },
  { key: 'jp', meta: 'meta_jp.json', manifest: 'extracted/extracted_manifest_jp.json' },
  { key: 'kr', meta: 'meta_kr.json', manifest: 'extracted/extracted_manifest_kr.json' },
];
const REGION_KEYS = REGIONS.map((r) => r.key);

const SPRITE_VARIANTS = ['bighead', 'smallhead', 'full', 'half', 'waitingroom'];
const SKELETON_EXTS = ['.skel.txt', '.skel', '.json'];
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];
const LEGACY_RAW_ASSETS_BASE = 'https://files.riichi.moe/mjg/game%20resources%20and%20tools/Mahjong%20Soul/raw%20assets';
const LEGACY_CATCHAT_VERSIONS_BY_ACTIVITY = {
  1244: { jp: 'v0.10.89.w' },
  220902: 'v0.10.150.w',
  221007: 'v0.10.167.w',
  221114: 'v0.10.177.w',
  230508: 'v0.10.228.w',
  230707: 'v0.10.251.w',
  231022: 'v0.10.287.w',
  231221: 'v0.11.1.w',
  240613: 'v0.11.48.w',
  250860: 'v0.11.172.w',
};
const LEGACY_RAW_ASSET_PATH_BY_REGION = {
  en: 'en',
  cn: 'chs_t',
  jp: 'jp',
  kr: 'kr',
};

const isHttp = /^https?:/i.test(SOURCE);

async function readText(relPath) {
  if (isHttp) {
    const url = `${SOURCE}/${relPath}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.text();
  }
  return fsp.readFile(path.join(SOURCE, relPath), 'utf8');
}

async function readJson(relPath) {
  return JSON.parse(await readText(relPath));
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, worker));
  return results;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key]);
    return out;
  }
  return value;
}

async function writeJsonStable(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(sortKeysDeep(value), null, 2) + '\n');
}

async function writeJsonVerbatim(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

function metadataKey(entry) {
  return `${entry.TableName}/${entry.SheetName}`;
}

function selectMetadataIndex(index) {
  const seen = new Set();
  const selected = [];

  for (const entry of index) {
    if (!entry || !entry.TableName || !entry.SheetName) continue;
    const key = metadataKey(entry);
    if (seen.has(key)) continue;
    if (entry.TableName === 'activity' || REQUIRED_METADATA_TABLES.has(key)) {
      seen.add(key);
      selected.push(entry);
    }
  }

  const missing = Array.from(REQUIRED_METADATA_TABLES)
    .filter((key) => !seen.has(key))
    .sort();
  if (missing.length > 0) {
    throw new Error(`Required metadata tables missing from source index: ${missing.join(', ')}`);
  }

  return selected;
}

async function listJsonFiles(dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(fullPath);
    }
  }

  return out;
}

async function removeEmptyDirs(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  });

  for (const entry of entries) {
    if (entry.isDirectory()) await removeEmptyDirs(path.join(dir, entry.name));
  }

  if (dir !== DATA_DIR) {
    const remaining = await fsp.readdir(dir).catch((error) => {
      if (error && error.code === 'ENOENT') return [];
      throw error;
    });
    if (remaining.length === 0) await fsp.rmdir(dir);
  }
}

async function pruneUnselectedDataTables(selectedIndex) {
  const keep = new Set([
    'index.json',
    ...selectedIndex.map((entry) => `${metadataKey(entry)}.json`),
  ]);
  const files = await listJsonFiles(DATA_DIR);
  let removed = 0;

  for (const filePath of files) {
    const rel = path.relative(DATA_DIR, filePath).replace(/\\/g, '/');
    if (keep.has(rel)) continue;
    await fsp.unlink(filePath);
    removed += 1;
  }

  await removeEmptyDirs(DATA_DIR);
  return removed;
}

function stripExt(p) {
  if (p.endsWith('.skel.txt')) return p.slice(0, -'.skel.txt'.length);
  if (p.endsWith('.atlas.txt')) return p.slice(0, -'.atlas.txt'.length);
  const slash = p.lastIndexOf('/');
  const dot = p.lastIndexOf('.');
  return dot > slash ? p.slice(0, dot) : p;
}

function baseName(p) {
  const slash = p.lastIndexOf('/');
  return slash >= 0 ? p.slice(slash + 1) : p;
}

function dirName(p) {
  const slash = p.lastIndexOf('/');
  return slash >= 0 ? p.slice(0, slash) : '';
}

function logicalOf(outputPath) {
  return outputPath.replace(/^MyAssets\//, '');
}

function normalizeRef(ref) {
  return String(ref || '').trim().replace(/^\/+|\/+$/g, '').replace(/^MyAssets\//, '');
}

function rowsOf(data) {
  if (!Array.isArray(data)) return [];
  if (data.length && Array.isArray(data[0])) return data.flat();
  return data;
}

function buildAssetIndex(manifestsByRegion) {
  const exact = new Map();
  const noext = new Map();
  const byBase = new Map();

  const add = (logical, region) => {
    let rec = exact.get(logical);
    if (!rec) {
      rec = { path: logical, regions: new Set() };
      exact.set(logical, rec);
      const ne = stripExt(logical);
      if (!noext.has(ne)) noext.set(ne, rec);
      const base = stripExt(baseName(logical)).toLowerCase();
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(rec);
    }
    rec.regions.add(region);
  };

  // EN first so it becomes the "first seen" base.
  for (const { key } of REGIONS) {
    const entries = manifestsByRegion[key];
    if (!entries) continue;
    for (const entry of entries) {
      const out = entry && entry.outputPath;
      if (typeof out !== 'string' || !out.startsWith('MyAssets/')) continue;
      add(logicalOf(out), key);
    }
  }

  return { exact, noext, byBase };
}

function scoreCandidate(candDir, refDir) {
  if (candDir === refDir) return 1000;
  if (candDir.startsWith(refDir + '/')) {
    const extra = candDir.slice(refDir.length + 1).split('/').length;
    return 500 - extra + (candDir.includes('/common') ? 1 : 0);
  }
  if (refDir.startsWith(candDir + '/')) return 300;
  const a = candDir.split('/');
  const b = refDir.split('/');
  let shared = 0;
  while (shared < a.length && shared < b.length && a[a.length - 1 - shared] === b[b.length - 1 - shared]) {
    shared += 1;
  }
  return shared;
}

// Resolve a metadata reference to a manifest record (or null). Tolerates the
// extension changes (.jpg -> .png) and inserted directories (items/common/, etc.)
// that the extractor introduces relative to the logical paths stored in tables.
function resolveRecord(index, ref) {
  const r = normalizeRef(ref);
  if (!r) return null;
  if (index.exact.has(r)) return index.exact.get(r);
  const ne = stripExt(r);
  if (index.noext.has(ne)) return index.noext.get(ne);

  const candidates = index.byBase.get(stripExt(baseName(r)).toLowerCase());
  if (!candidates || candidates.length === 0) return null;
  const refDir = dirName(r);
  let best = null;
  let bestScore = -1;
  for (const rec of candidates) {
    const score = scoreCandidate(dirName(rec.path), refDir);
    if (score > bestScore || (score === bestScore && best && rec.path.length < best.path.length)) {
      best = rec;
      bestScore = score;
    }
  }
  return best;
}

function isImagePath(p) {
  const lower = String(p || '').toLowerCase();
  return IMAGE_EXTS.some((ext) => lower.endsWith(ext));
}

// CatChat table paths refer to logical image names while the extracted mirror
// inserts locale/common subdirectories and may convert jpg sources to png. Keep
// this resolver image-only and require a strong directory match so short numeric
// filenames do not bind to unrelated assets with the same basename.
function resolveImageRecordStrict(index, ref, minFuzzyScore = 400) {
  const r = normalizeRef(ref);
  if (!r) return null;

  const exact = index.exact.get(r);
  if (exact && isImagePath(exact.path)) return exact;

  const noext = index.noext.get(stripExt(r));
  if (noext && isImagePath(noext.path)) return noext;

  const candidates = index.byBase.get(stripExt(baseName(r)).toLowerCase());
  if (!candidates || candidates.length === 0) return null;

  const refDir = dirName(r);
  let best = null;
  let bestScore = -1;
  for (const rec of candidates) {
    if (!isImagePath(rec.path)) continue;
    const score = scoreCandidate(dirName(rec.path), refDir);
    if (score > bestScore || (score === bestScore && best && rec.path.length < best.path.length)) {
      best = rec;
      bestScore = score;
    }
  }

  return best && bestScore >= minFuzzyScore ? best : null;
}

// The common mirror prefix is stored once as `resources.base`
// entries hold only the path relative to it to keep the file small.
const RESOURCE_BASE = `${MIRROR}/extracted/`;

// A record's path is identical across regions (single shared asset tree).
// We emit a bare string when EN has the asset (available to every UI language via
// fallback) and a sparse `{region: path}` object only for region-exclusive assets.
function recordToPath(rec) {
  return `MyAssets/${rec.path}`;
}

function recordToValue(rec) {
  const relative = recordToPath(rec);
  if (rec.regions.has('en')) return relative;
  const value = {};
  for (const key of REGION_KEYS) if (rec.regions.has(key)) value[key] = relative;
  return value;
}

function resolveImages(images, index, ref, key) {
  if (images[key] !== undefined) return;
  const rec = resolveRecord(index, ref);
  if (rec) images[key] = recordToValue(rec);
}

function resolveStrictImages(images, index, ref, key) {
  if (images[key] !== undefined) return;
  const rec = resolveImageRecordStrict(index, ref);
  if (rec) images[key] = recordToValue(rec);
}

function legacyCatChatVersionMap(activityId) {
  const versions = LEGACY_CATCHAT_VERSIONS_BY_ACTIVITY[Number(activityId) || 0];
  if (!versions) return null;
  if (typeof versions === 'string') {
    return Object.fromEntries(REGION_KEYS.map((key) => [key, versions]));
  }
  return versions;
}

function legacyCatChatImageValue(activityId, ref) {
  const filename = baseName(normalizeRef(ref));
  if (!filename || !isImagePath(filename)) return null;
  const versions = legacyCatChatVersionMap(activityId);
  if (!versions) return null;

  const value = {};
  for (const region of REGION_KEYS) {
    const version = versions[region];
    const rawRegion = LEGACY_RAW_ASSET_PATH_BY_REGION[region];
    if (!version || !rawRegion) continue;
    value[region] = `${LEGACY_RAW_ASSETS_BASE}/${version}/${rawRegion}/myres/sns/${filename}`;
  }

  if (Object.keys(value).length === 0) return null;
  if (REGION_KEYS.every((region) => value[region] === value.en)) return value.en;
  return value;
}

function resolveCatChatImage(images, index, activityId, ref, key) {
  if (images[key] !== undefined) return;
  const rec = resolveImageRecordStrict(index, ref);
  if (rec) {
    images[key] = recordToValue(rec);
    return;
  }
  const legacyValue = legacyCatChatImageValue(activityId, ref);
  if (legacyValue) images[key] = legacyValue;
}

function buildEmojiDirIndex(index) {
  // emoDir (e.g. "deco/emo/e20000100") -> Map<basename, record>
  const dirs = new Map();
  const pattern = /^(deco\/emo\/[^/]+)\/(?:.*\/)?([^/]+)\.png$/i;
  for (const [logical, rec] of index.exact) {
    if (!logical.startsWith('deco/emo/')) continue;
    const match = logical.match(pattern);
    if (!match) continue;
    const dir = match[1];
    const base = match[2];
    if (/^atlas_/i.test(base)) continue; // skip packed-atlas textures/configs
    if (!dirs.has(dir)) dirs.set(dir, new Map());
    const byBase = dirs.get(dir);
    if (!byBase.has(base)) byBase.set(base, rec);
  }
  return dirs;
}

function buildSpineSkinIndex(index) {
  // skinid -> [records under spine/<skinid>/...]
  const bySkin = new Map();
  for (const [logical, rec] of index.exact) {
    const match = logical.match(/^spine\/(\d+)\//);
    if (!match) continue;
    const id = match[1];
    if (!bySkin.has(id)) bySkin.set(id, []);
    bySkin.get(id).push(rec);
  }
  return bySkin;
}

function isSkeletonPath(p) {
  return SKELETON_EXTS.some((ext) => p.endsWith(ext));
}

function spineLayerName(skinId, dir) {
  const tail = baseName(dir);
  if (tail === skinId) return 'plain';
  return /^\d+$/.test(tail) ? tail : 'plain';
}

function resolveSpine(records, skinId) {
  const byDir = new Map();
  for (const rec of records) {
    const dir = dirName(rec.path);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(rec);
  }

  const layers = [];
  for (const [dir, recs] of byDir) {
    const skeleton = recs.find((r) => isSkeletonPath(r.path));
    const atlas = recs.find((r) => r.path.endsWith('.atlas.txt') || r.path.endsWith('.atlas'));
    if (!skeleton || !atlas) continue;
    const textures = recs
      .filter((r) => r.path.endsWith('.png'))
      .sort((a, b) => a.path.localeCompare(b.path))
      .map(recordToValue);
    if (textures.length === 0) continue;
    layers.push({
      name: spineLayerName(skinId, dir),
      skeleton: recordToValue(skeleton),
      atlas: recordToValue(atlas),
      textures,
    });
  }

  layers.sort((a, b) => a.name.localeCompare(b.name));
  return layers.length ? { layers } : null;
}

async function main() {
  console.log(`Source: ${SOURCE}`);

  // Versions + manifests
  const metas = {};
  for (const region of REGIONS) {
    metas[region.key] = await readJson(region.meta);
  }
  const manifestsRaw = {};
  for (const region of REGIONS) {
    manifestsRaw[region.key] = await readJson(region.manifest);
  }
  const audioManifest = await readJson('extracted/audio_manifest.json');

  const manifestsByRegion = {};
  for (const region of REGIONS) {
    const m = manifestsRaw[region.key];
    manifestsByRegion[region.key] = Array.isArray(m) ? m : (m && m.entries) || [];
  }

  // Idempotency check
  const newState = { regions: {} };
  for (const region of REGIONS) {
    const meta = metas[region.key];
    const manifest = manifestsRaw[region.key];
    newState.regions[region.key] = {
      resource_version: meta.resource_version,
      bundle_hash: meta.bundle_hash,
      manifest_generated_at: (manifest && manifest.generatedAt) || null,
    };
  }
  newState.audio_count = Array.isArray(audioManifest) ? audioManifest.length : 0;
  newState.metadata_tables = {
    selection_version: METADATA_TABLE_SELECTION_VERSION,
    include_activity: true,
    required: Array.from(REQUIRED_METADATA_TABLES).sort(),
  };

  const oldState = await fsp.readFile(STATE_FILE, 'utf8').then(JSON.parse).catch(() => null);
  const resourcesExist = fs.existsSync(path.join(WEB_DIR, 'resources.json'));
  if (!FORCE && resourcesExist && JSON.stringify(oldState) === JSON.stringify(newState)) {
    console.log('Mirror unchanged; nothing to do (set MJS_FORCE=1 to rebuild).');
    return;
  }

  // Download the metadata tables consumed by the app.
  const sourceIndex = await readJson('metadata/index.json');
  const index = selectMetadataIndex(sourceIndex);
  console.log(`Downloading ${index.length} of ${sourceIndex.length} data tables...`);
  const tablesByName = new Map();
  await mapLimit(index, 16, async (entry) => {
    const rel = `metadata/tables/${entry.TableName}/${entry.SheetName}.json`;
    const data = await readJson(rel);
    tablesByName.set(`${entry.TableName}/${entry.SheetName}`, data);
    await writeJsonVerbatim(path.join(DATA_DIR, `${entry.TableName}/${entry.SheetName}.json`), data);
  });
  await writeJsonVerbatim(path.join(DATA_DIR, 'index.json'), index);
  const prunedDataTables = await pruneUnselectedDataTables(index);
  console.log(`Data tables written; pruned ${prunedDataTables} stale tables.`);

  // Build asset indexes
  const assetIndex = buildAssetIndex(manifestsByRegion);
  const emojiDirIndex = buildEmojiDirIndex(assetIndex);
  const spineSkinIndex = buildSpineSkinIndex(assetIndex);
  console.log(`Indexed ${assetIndex.exact.size} unique asset paths.`);

  const resources = {
    generated_at: metas.en.generated_at,
    base: RESOURCE_BASE,
    images: {},
    audio: {},
    spine: {},
  };
  const table = (name) => tablesByName.get(name);

  //  Character/skin sprites (key: "<skin.path>/<variant>")
  const skins = rowsOf(table('item_definition/skin'));
  for (const skin of skins) {
    const skinPath = normalizeRef(skin.path);
    if (!skinPath) continue;
    for (const variant of SPRITE_VARIANTS) {
      resolveImages(resources.images, assetIndex, `${skinPath}/${variant}/${variant}.png`, `${skinPath}/${variant}`);
    }
  }

  // Item & currency icons (key: the table's logical icon path)
  for (const name of ['item_definition/item', 'item_definition/currency']) {
    for (const row of rowsOf(table(name))) {
      for (const field of ['icon', 'icon_transparent']) {
        const ref = normalizeRef(row[field]);
        if (ref) resolveImages(resources.images, assetIndex, ref, ref);
      }
    }
  }

  // 5c. Loading images (key: the img/thumb path).
  for (const row of rowsOf(table('item_definition/loading_image'))) {
    for (const field of ['img_path', 'thumb_path']) {
      const ref = normalizeRef(row[field]);
      if (ref) resolveImages(resources.images, assetIndex, ref, ref);
    }
  }

  // Emoji (key: "<character.emo>/<sub_id>")
  const characters = rowsOf(table('item_definition/character'));
  for (const character of characters) {
    const emo = normalizeRef(character.emo);
    if (!emo) continue;
    const merged = new Map();
    for (const [dir, byBase] of emojiDirIndex) {
      if (dir === emo) {
        for (const [base, rec] of byBase) if (!merged.has(base)) merged.set(base, rec);
      }
    }
    for (const [base, rec] of merged) {
      const key = `${emo}/${base}`;
      if (resources.images[key] === undefined) resources.images[key] = recordToValue(rec);
    }
  }

  // Activity banners (key: the table's logical banner path)
  for (const row of rowsOf(table('activity/activity_banner'))) {
    for (const field of ['banner_big', 'banner_left', 'banner_left_selected', 'enter_icon', 'banner_left_icon']) {
      const ref = normalizeRef(row[field]);
      if (ref) resolveImages(resources.images, assetIndex, ref, ref);
    }
  }

  // CatChat post images and custom heads (key: the table's logical path).
  for (const row of rowsOf(table('activity/sns_activity'))) {
    const activityId = row.activity_id;
    const contentImages = Array.isArray(row.content_image) ? row.content_image : [];
    for (const imageRef of contentImages) {
      const ref = normalizeRef(imageRef);
      if (ref) resolveCatChatImage(resources.images, assetIndex, activityId, ref, ref);
    }

    const headRef = normalizeRef(row.content_head);
    if (headRef) resolveCatChatImage(resources.images, assetIndex, activityId, headRef, headRef);
  }

  // Spine (key: skinid)
  for (const [skinId, records] of spineSkinIndex) {
    const resolved = resolveSpine(records, skinId);
    if (resolved) resources.spine[skinId] = resolved;
  }

  // Audio: emit the full (EN) audio set by logical path
  for (const entry of audioManifest) {
    if (!entry || typeof entry.path !== 'string' || !entry.path.startsWith('MyAssets/')) continue;
    const logical = logicalOf(entry.path);
    if (resources.audio[logical] === undefined) {
      // entry.path already starts with "MyAssets/"; relative to RESOURCE_BASE.
      resources.audio[logical] = entry.path;
    }
  }

  // Write outputs
  await writeJsonStable(path.join(WEB_DIR, 'resources.json'), resources);

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
  await writeJsonVerbatim(path.join(WEB_DIR, 'version.json'), version);
  await writeJsonVerbatim(STATE_FILE, newState);

  console.log(
    `Resolved ${Object.keys(resources.images).length} images, ` +
    `${Object.keys(resources.audio).length} audio, ` +
    `${Object.keys(resources.spine).length} spine sets.`,
  );
  console.log('Done.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exitCode = 1;
});
