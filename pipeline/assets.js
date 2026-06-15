// Asset resolution for the ingest pipeline. Turns the per-region extracted
// manifests into a lookup that resolves a table's logical asset reference to a
// concrete, baked mirror URL — folded inline into collection entries as either a
// bare string (the EN base, shared by every language) or a sparse `{region: url}`
// value-map for region-exclusive assets. The asset index is a pipeline-internal
// intermediate; nothing about it ships to the browser.

import { RESOURCE_BASE } from "./mirror.js";

// Mirror regions. `cn` carries the issuer chs_t; the site maps both the `chs`
// and `chs_t` UI languages onto it. `en` is the complete base; the others only
// list paths exclusive to that region.
export const REGION_KEYS = ["en", "cn", "jp", "kr"];

// Preference order over the locale sub-folders an asset dir keeps (banners and
// emotes store `<dir>/<locale>/<file>` variants, or `<dir>/<file>` = "common").
// Lower index wins. Keyed by output target: `cn` is Traditional Chinese (the cn
// dump's issuer) and `chs` is Simplified Chinese; both pull from the cn dump but
// prefer their own script. The render side resolves chs_t -> cn and chs -> cn.
const LOCALE_PRIORITY_BY_TARGET = {
  en: ["en_en", "en", "common", "en_kr", "en_chs_t"],
  cn: ["chs_t", "en_chs_t", "common"],
  chs: ["chs", "common"],
  jp: ["jp", "common"],
  kr: ["kr", "en_kr", "common"],
};

// Output keys the locale resolvers emit: the mirror regions plus the Simplified
// Chinese (`chs`) split that shares the cn dump with Traditional (`cn`).
export const LOCALE_TARGETS = Object.keys(LOCALE_PRIORITY_BY_TARGET);

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
const SKELETON_EXTS = [".skel.txt", ".skel", ".json"];

function stripExt(p) {
  if (p.endsWith(".skel.txt")) return p.slice(0, -".skel.txt".length);
  if (p.endsWith(".atlas.txt")) return p.slice(0, -".atlas.txt".length);
  const slash = p.lastIndexOf("/");
  const dot = p.lastIndexOf(".");
  return dot > slash ? p.slice(0, dot) : p;
}

export function baseName(p) {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(slash + 1) : p;
}

function dirName(p) {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(0, slash) : "";
}

function logicalOf(outputPath) {
  return outputPath.replace(/^MyAssets\//, "");
}

export function normalizeRef(ref) {
  return String(ref || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^MyAssets\//, "");
}

export function isImagePath(p) {
  const lower = String(p || "").toLowerCase();
  return IMAGE_EXTS.some((ext) => lower.endsWith(ext));
}

function bestScored(items, scoreFn) {
  let best = null;
  let bestScore = -Infinity;
  for (const item of items || []) {
    const score = scoreFn(item);
    if (score === null || score === undefined) continue;
    if (
      !best ||
      score > bestScore ||
      (score === bestScore && item.path && best.path && item.path.length < best.path.length)
    ) {
      best = item;
      bestScore = score;
    }
  }
  return best ? { item: best, score: bestScore } : null;
}

// Build the asset index from `{region: manifestEntries[]}`. EN is added first so
// it becomes the "first seen" base record; later regions only add their key to a
// record's region set (or create region-exclusive records).
export function buildAssetIndex(manifestsByRegion) {
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

  for (const region of REGION_KEYS) {
    const entries = manifestsByRegion[region];
    if (!entries) continue;
    for (const entry of entries) {
      const out = entry && entry.outputPath;
      if (typeof out !== "string" || !out.startsWith("MyAssets/")) continue;
      add(logicalOf(out), region);
    }
  }

  return { exact, noext, byBase };
}

function scoreCandidate(candDir, refDir) {
  if (candDir === refDir) return 1000;
  if (candDir.startsWith(refDir + "/")) {
    const extra = candDir.slice(refDir.length + 1).split("/").length;
    return 500 - extra + (candDir.includes("/common") ? 1 : 0);
  }
  if (refDir.startsWith(candDir + "/")) return 300;
  const a = candDir.split("/");
  const b = refDir.split("/");
  let shared = 0;
  while (
    shared < a.length &&
    shared < b.length &&
    a[a.length - 1 - shared] === b[b.length - 1 - shared]
  ) {
    shared += 1;
  }
  return shared;
}

// Resolve a metadata reference to a manifest record (or null). Tolerates the
// extension changes (.jpg -> .png) and inserted directories the extractor
// introduces relative to the logical paths stored in the tables.
export function resolveRecord(index, ref) {
  const r = normalizeRef(ref);
  if (!r) return null;
  if (index.exact.has(r)) return index.exact.get(r);
  const ne = stripExt(r);
  if (index.noext.has(ne)) return index.noext.get(ne);

  const candidates = index.byBase.get(stripExt(baseName(r)).toLowerCase());
  if (!candidates || candidates.length === 0) return null;
  const refDir = dirName(r);
  const best = bestScored(candidates, (rec) => scoreCandidate(dirName(rec.path), refDir));
  return best ? best.item : null;
}

// A record's path is identical across regions (one shared asset tree). Emit a
// bare full URL when EN has the asset (reachable from every UI language via
// fallback) and a sparse `{region: url}` object only for region-exclusive assets.
export function recordToUrl(rec) {
  const url = `${RESOURCE_BASE}MyAssets/${rec.path}`;
  if (rec.regions.has("en")) return url;
  const value = {};
  for (const key of REGION_KEYS) {
    if (rec.regions.has(key)) value[key] = url;
  }
  return value;
}

// Resolve a single logical reference straight to a baked value-map (or "" when
// the asset is absent from every region's manifest).
export function resolveAssetUrl(index, ref) {
  const rec = resolveRecord(index, ref);
  if (!rec || !isImagePath(rec.path)) return "";
  return recordToUrl(rec);
}

// Resolve a reference WITHOUT the cross-directory byBase fuzzy fallback: only an
// exact path or the extension swap (.jpg -> .png) the extractor introduces within
// the SAME logical path. Use this for deterministic layouts like skin sprites
// (`<skinPath>/<variant>/<variant>.png`), where a miss means the variant genuinely
// doesn't exist for that skin — never another character's same-named sprite.
export function resolveAssetUrlExact(index, ref) {
  const r = normalizeRef(ref);
  if (!r) return "";
  const rec = index.exact.get(r) || index.noext.get(stripExt(r));
  if (!rec || !isImagePath(rec.path)) return "";
  return recordToUrl(rec);
}

// --- Tablecloth full-size texture resolution ---------------------------------
//
// Cosmetic tablecloth items (item_definition category 5 / type 6) reference an icon
// under `deco/tablecloth/<folder>/pic/…`. Their full-size texture lives at
// `<folder>/3d/texture/Table_Dif.png` and a preview at
// `<folder>/preview/[<locale>/]preview.png`.
//
// Some items' icon folder is a MISSPELLING of the real asset folder (e.g. the icon
// says `tablecloth_25achievement4` but the texture lives under the typo'd
// `tablecloth_25achivement4`). A plain exact lookup misses those; the generic
// `byBase` fuzzy fallback in resolveRecord OVER-corrects — with every tablecloth's
// `Table_Dif.png` sharing the `…/3d/texture` tail, its directory score ties and an
// arbitrary unrelated folder wins (the "wrong texture" bug). This resolver threads
// the needle: a folder without its own texture borrows from a sibling only when
// that sibling is the SINGLE candidate within edit-distance 1 AND has identical
// numeric runs — enough to bridge a typo, never enough to grab an unrelated cloth.
const TABLECLOTH_FULL_RE = /^deco\/tablecloth\/([^/]+)\/3d\/texture\/Table_Dif\.[^.]+$/i;
const TABLECLOTH_PREVIEW_RE = /^deco\/tablecloth\/([^/]+)\/preview\/(?:[^/]+\/)?preview\.[^.]+$/i;
const TABLECLOTH_ICON_RE = /^deco\/tablecloth\/([^/]+)\/pic\/[^/]+\.[^.]+$/i;

function editDistance(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const current = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      current[j + 1] = Math.min(current[j] + 1, previous[j + 1] + 1, previous[j] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

function numericRuns(value) {
  return String(value || "").match(/\d+/g) || [];
}

// Two folder suffixes "match numerically" only when their digit groups are
// identical in order and value: bridges `25achievement4` -> `25achivement4` but
// rejects `24summer` -> `25summer` (the season number must not drift).
function hasMatchingNumericRuns(left, right) {
  const a = numericRuns(left);
  const b = numericRuns(right);
  return a.length > 0 && a.length === b.length && a.every((value, i) => value === b[i]);
}

function tableclothSuffix(folder) {
  const match = String(folder || "").toLowerCase().match(/^tablecloth_([a-z0-9_]+)$/);
  return match ? match[1] : "";
}

// Group every tablecloth full-texture / preview record by its folder, lowercased.
// Built once per ingest and threaded through the item transformer.
export function buildTableclothFolderIndex(index) {
  const folders = new Map();
  const add = (folder, kind, rec) => {
    const key = folder.toLowerCase();
    let entry = folders.get(key);
    if (!entry) {
      entry = { full: [], preview: [] };
      folders.set(key, entry);
    }
    entry[kind].push(rec);
  };
  for (const rec of index.exact.values()) {
    if (!isImagePath(rec.path)) continue;
    const full = rec.path.match(TABLECLOTH_FULL_RE);
    if (full) {
      add(full[1], "full", rec);
      continue;
    }
    const preview = rec.path.match(TABLECLOTH_PREVIEW_RE);
    if (preview) add(preview[1], "preview", rec);
  }
  return folders;
}

function tableclothRecordScore(rec, kind) {
  const p = rec.path.toLowerCase();
  let score = 0;
  if (p.endsWith(".png")) score += 20;
  if (kind === "preview" && p.includes("/preview/common/")) score += 100;
  if (kind === "preview" && p.includes("/preview/en/")) score += 80;
  if (rec.regions.has("en")) score += 10;
  return score;
}

function bestTableclothRecord(records, kind) {
  let best = null;
  let bestScore = -1;
  for (const rec of records || []) {
    const score = tableclothRecordScore(rec, kind);
    if (score > bestScore || (score === bestScore && best && rec.path.length < best.path.length)) {
      best = rec;
      bestScore = score;
    }
  }
  return best;
}

// The folder to read `kind` (full|preview) records from: the canonical folder when
// it has its own, otherwise the lone edit-distance≤1 / numeric-matching sibling
// that does. "" when nothing safe to borrow from.
function derivedTableclothFolder(folders, canonical, kind) {
  const own = folders.get(canonical);
  if (own && own[kind].length > 0) return canonical;

  const canonicalSuffix = tableclothSuffix(canonical);
  if (!canonicalSuffix) return "";

  const candidates = [];
  for (const [folder, entry] of folders) {
    if (folder === canonical || entry[kind].length === 0) continue;
    const suffix = tableclothSuffix(folder);
    if (!suffix || !hasMatchingNumericRuns(canonicalSuffix, suffix)) continue;
    if (editDistance(canonicalSuffix, suffix) <= 1) candidates.push(folder);
  }
  return candidates.length === 1 ? candidates[0] : "";
}

// Resolve a tablecloth item's icon ref to its best full-size image: the full
// texture (own folder or a typo'd sibling) when available, else the folder's own
// preview. "" when the ref isn't a tablecloth icon or nothing resolves.
export function resolveTableclothImage(folders, iconRef) {
  const ref = normalizeRef(iconRef);
  const match = ref.match(TABLECLOTH_ICON_RE);
  if (!match) return "";
  const canonical = match[1].toLowerCase();

  const fullFolder = derivedTableclothFolder(folders, canonical, "full");
  if (fullFolder) {
    const rec = bestTableclothRecord(folders.get(fullFolder).full, "full");
    if (rec) return recordToUrl(rec);
  }

  const previewFolder = derivedTableclothFolder(folders, canonical, "preview");
  if (previewFolder) {
    const rec = bestTableclothRecord(folders.get(previewFolder).preview, "preview");
    if (rec) return recordToUrl(rec);
  }

  return "";
}

// Full baked URL for one concrete record path (no region collapsing). Used when a
// resolver has already chosen a specific locale-folder variant.
function recordUrl(rec) {
  return `${RESOURCE_BASE}MyAssets/${rec.path}`;
}

// Locale folder for a record stored as `<dir>/<locale?>/<file>`: the segment
// between `dir` and the filename, "common" when the file sits directly in `dir`,
// or null when the path isn't under `dir` (or nests any deeper). This is what
// keeps resolution inside the ref's own directory — no cross-directory borrow.
function localeUnderDir(p, dir) {
  if (!p.startsWith(`${dir}/`)) return null;
  const tail = p.slice(dir.length + 1).split("/");
  if (tail.length < 1 || tail.length > 2) return null;
  return tail.length === 1 ? "common" : tail[0].toLowerCase();
}

function localeScore(target, locale) {
  const priority = LOCALE_PRIORITY_BY_TARGET[target] || [];
  const i = priority.indexOf(locale);
  return i >= 0 ? i : null;
}

// Build a target-keyed URL map by choosing, for each output target, the candidate
// whose locale folder ranks highest (ties broken by shorter path). `localeOf(rec)`
// returns the rec's locale folder, or null to exclude it. Uncompressed — only the
// targets that resolved are present.
function localeValueFromCandidates(candidates, localeOf) {
  const bestByTarget = {};
  const bestScoreByTarget = {};
  for (const rec of candidates) {
    if (!isImagePath(rec.path)) continue;
    const locale = localeOf(rec);
    if (locale === null) continue;
    for (const target of LOCALE_TARGETS) {
      const score = localeScore(target, locale);
      if (score === null) continue;
      const previous = bestScoreByTarget[target];
      if (
        previous === undefined ||
        score < previous ||
        (score === previous && rec.path.length < bestByTarget[target].path.length)
      ) {
        bestByTarget[target] = rec;
        bestScoreByTarget[target] = score;
      }
    }
  }

  const value = {};
  for (const target of LOCALE_TARGETS) {
    if (bestByTarget[target]) value[target] = recordUrl(bestByTarget[target]);
  }
  return value;
}

// Resolve a logical image ref to a per-locale `{target: url}` map, selecting only
// variants that live INSIDE the ref's own directory (or exactly one locale
// subfolder beneath it). Tolerates the extractor's `.jpg -> .png` swap (basename
// match) but never borrows a same-named asset from another directory. Uncompressed
// (callers may fold in further fallbacks before compressing); `{}` when nothing
// under the ref's dir matches.
export function resolveLocaleValueWithinDir(index, ref) {
  const r = normalizeRef(ref);
  if (!r) return {};
  const refDir = dirName(r);
  const candidates = index.byBase.get(stripExt(baseName(r)).toLowerCase());
  if (!candidates || candidates.length === 0) return {};
  return localeValueFromCandidates(candidates, (rec) =>
    localeUnderDir(rec.path, refDir),
  );
}

// Collapse a per-locale `{target: url}` map: drop a Simplified (`chs`) entry that
// equals Traditional (`cn`) — render falls back chs -> cn — then collapse to a bare
// string when every present target resolves to the EN base. Returns "" when empty.
export function compressLocaleValue(value) {
  const out = { ...(value || {}) };
  if (out.chs && out.chs === out.cn) delete out.chs;
  const keys = Object.keys(out);
  if (keys.length === 0) return "";
  if (out.en && keys.every((key) => out[key] === out.en)) return out.en;
  return out;
}

// Enumerate image records under a logical manifest prefix, grouped by numeric
// filename. Used for character emotes, whose base stamps exist only as files
// under the character's `emo` prefix, often nested in common/language folders.
export function enumerateImageUrlsByNumericPrefix(index, prefix) {
  const normalizedPrefix = normalizeRef(prefix);
  if (!normalizedPrefix) return [];
  const root = `${normalizedPrefix}/`;
  const bySubId = new Map();
  for (const [logical, rec] of index.exact) {
    if (!logical.startsWith(root) || !isImagePath(logical)) continue;
    const rest = logical.slice(root.length);
    const stem = stripExt(baseName(rest));
    if (!/^\d+$/.test(stem)) continue;
    const subId = Number(stem);
    if (!bySubId.has(subId)) bySubId.set(subId, []);
    bySubId.get(subId).push(rec);
  }

  const languageKeyOf = (rec) => {
    const parts = rec.path.slice(root.length).split("/");
    if (parts.length < 2) return "";
    const dir = parts[parts.length - 2];
    if (dir === "en" || dir === "en_en") return "en";
    if (dir === "jp") return "jp";
    if (dir === "kr") return "kr";
    if (dir === "chs") return "chs";
    if (dir === "chs_t") return "cn";
    return "";
  };

  const imageForRecords = (records) => {
    const ordered = records.slice().sort((a, b) => a.path.localeCompare(b.path));
    const shared = ordered.find((rec) => {
      const rest = rec.path.slice(root.length);
      return !rest.includes("/") || rest.startsWith("common/");
    });
    if (shared) return recordToUrl(shared);

    const localized = {};
    for (const rec of ordered) {
      const key = languageKeyOf(rec);
      if (key) localized[key] = recordUrl(rec);
    }
    if (Object.keys(localized).length > 0) return localized;

    const first = ordered[0];
    return first ? recordToUrl(first) : "";
  };

  return Array.from(bySubId.entries())
    .map(([subId, records]) => ({ subId, image: imageForRecords(records) }))
    .filter((entry) => entry.image)
    .sort((a, b) => a.subId - b.subId);
}

function isSkeletonPath(p) {
  return SKELETON_EXTS.some((ext) => p.endsWith(ext));
}

function isAtlasPath(p) {
  return p.endsWith(".atlas.txt") || p.endsWith(".atlas");
}

// A spine layer's display name is the tail of its directory: a bare numeric
// folder (a stacked layer) keeps its number; the skin's own root folder (or any
// non-numeric tail) is the single "plain" layer.
function spineLayerName(skinId, dir) {
  const tail = baseName(dir);
  if (tail === skinId) return "plain";
  return /^\d+$/.test(tail) ? tail : "plain";
}

// Group every spine record by the skin id embedded in its `spine/<skinId>/…`
// path. A pipeline-internal intermediate consumed by resolveSpineLayers, built
// once per ingest so per-skin resolution is a cheap map lookup.
export function buildSpineIndex(index) {
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

// Resolve one skin's spine records into ordered layer sets, each carrying baked
// skeleton/atlas/texture value-maps (a layer is dropped unless it has a skeleton,
// an atlas, and at least one texture). Returns [] when the skin has no usable
// spine set. The atlas references its textures by relative path, so the viewer
// only needs the skeleton and atlas URLs; textures are carried for completeness.
export function resolveSpineLayers(records, skinId) {
  const byDir = new Map();
  for (const rec of records || []) {
    const dir = dirName(rec.path);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(rec);
  }

  const layers = [];
  for (const [dir, recs] of byDir) {
    const skeleton = recs.find((r) => isSkeletonPath(r.path));
    const atlas = recs.find((r) => isAtlasPath(r.path));
    if (!skeleton || !atlas) continue;
    const textures = recs
      .filter((r) => r.path.endsWith(".png"))
      .sort((a, b) => a.path.localeCompare(b.path))
      .map(recordToUrl);
    if (textures.length === 0) continue;
    layers.push({
      name: spineLayerName(String(skinId), dir),
      skeleton: recordToUrl(skeleton),
      atlas: recordToUrl(atlas),
      textures,
    });
  }

  layers.sort((a, b) => a.name.localeCompare(b.name));
  return layers;
}

// Build the audio lookup: logical path -> baked full URL. Audio is EN-only and
// shared across every region, so values are always plain strings.
export function buildAudioIndex(audioManifest) {
  const audio = new Map();
  for (const entry of audioManifest || []) {
    if (!entry || typeof entry.path !== "string" || !entry.path.startsWith("MyAssets/")) {
      continue;
    }
    const logical = logicalOf(entry.path);
    if (!audio.has(logical)) audio.set(logical, `${RESOURCE_BASE}${entry.path}`);
  }
  return audio;
}

// Try several candidate audio keys, returning the baked URL for the first one
// present in the audio index (or "" when none resolve).
export function resolveAudioUrl(audioIndex, keys) {
  for (const key of keys || []) {
    if (audioIndex.has(key)) return audioIndex.get(key);
  }
  return "";
}
