// Legacy raw-asset resolution, shared by the activities banner pipeline and (later)
// CatChat (issue 06). The frozen `raw assets` archive (version 0.11.252.w, never
// updated) holds banners and post images that have since dropped out of the live
// unity_raw extraction. Each file is addressed by the per-region version recorded
// in `resversion<version>.json`, discovered via `last_downloaded_version.txt`.
//
// This module owns the manifest read, the per-file version lookup, the region
// mapping, and the raw-asset URL construction. The big manifest (~12.7 MB) is only
// fetched on a real rebuild — see ingest.js, which gates it on the cheap version
// string folded into the fetch-state.

import {
  LEGACY_RAW_ASSETS_BASE,
  readLegacyJson,
  readOptionalLegacyText,
} from "./mirror.js";
import {
  LOCALE_TARGETS,
  baseName,
  compressLocaleValue,
  isImagePath,
  normalizeRef,
} from "./assets.js";

// Resource directories under the legacy archive, per consumer.
export const LEGACY_ACTIVITY_BANNER_DIR = "myres2/activity_banner";
export const LEGACY_CATCHAT_DIR = "myres/sns";

// Output region -> the region folder it lives under in the legacy archive. `cn`
// (the cn dump's issuer, Traditional Chinese) reads from the `chs_t` folder.
const LEGACY_RAW_ASSET_PATH_BY_REGION = {
  en: "en",
  chs: "chs",
  cn: "chs_t",
  jp: "jp",
  kr: "kr",
};

// Cheap version pointer at the legacy archive root. Always reads (a few bytes);
// the heavy manifest below is only fetched when a rebuild actually needs it.
export const LEGACY_VERSION_FILE = "last_downloaded_version.txt";

export async function readLegacyVersion() {
  const text = await readOptionalLegacyText(LEGACY_VERSION_FILE);
  return text === null ? null : text.trim();
}

export function legacyManifestPath(version) {
  return `resversion${version}.json`;
}

export async function loadLegacyManifest(version) {
  if (!version) return null;
  return readLegacyJson(legacyManifestPath(version));
}

// Map a legacy resource path's region segment to the output regions it feeds and
// a priority (lower wins). The archive stores both bare per-region copies
// (`en/...`, `chs_t/...`) and shared `lang/...`/region-less copies; the bare
// per-region ones are the most specific and win.
function appRegionsForLegacyResourcePath(regionPath) {
  if (regionPath === "") {
    return LOCALE_TARGETS.map((region) => ({ region, priority: 40 }));
  }
  if (regionPath === "en") return [{ region: "en", priority: 0 }];
  if (regionPath === "jp") return [{ region: "jp", priority: 0 }];
  if (regionPath === "kr") return [{ region: "kr", priority: 0 }];
  if (regionPath === "chs") return [{ region: "chs", priority: 0 }];
  if (regionPath === "chs_t") return [{ region: "cn", priority: 0 }];
  if (regionPath === "lang/base") {
    return LOCALE_TARGETS.map((region) => ({ region, priority: 60 }));
  }
  if (regionPath === "lang/base_q7") {
    return LOCALE_TARGETS.map((region) => ({ region, priority: 70 }));
  }

  const langMatch = regionPath.match(/^lang\/(.+?)(?:_q7)?$/);
  if (!langMatch) return [];

  const lang = langMatch[1];
  const priority = regionPath.endsWith("_q7") ? 30 : 20;
  if (lang === "en") return [{ region: "en", priority }];
  if (lang === "jp") return [{ region: "jp", priority }];
  if (lang === "kr") return [{ region: "kr", priority }];
  if (lang === "chs") return [{ region: "chs", priority }];
  if (lang === "chs_t") return [{ region: "cn", priority }];
  return [];
}

// Split a legacy resource path into `{regionPath, filename}` relative to the
// consumer's resource dir, or null when the path isn't a flat file under it.
function legacyResourceMatch(resourcePath, resourceDir) {
  if (resourcePath.startsWith(`${resourceDir}/`)) {
    const filename = resourcePath.slice(resourceDir.length + 1);
    if (filename.includes("/")) return null;
    return { regionPath: "", filename };
  }

  const marker = `/${resourceDir}/`;
  const markerIndex = resourcePath.lastIndexOf(marker);
  if (markerIndex < 0) return null;

  const filename = resourcePath.slice(markerIndex + marker.length);
  if (filename.includes("/")) return null;

  return {
    regionPath: resourcePath.slice(0, markerIndex),
    filename,
  };
}

// Build `{ filename: {en?, cn?, jp?, kr?} }` from the legacy manifest, keeping the
// highest-priority (most specific) version per file per region. `resourceDir`
// selects the archive sub-tree (activity banners vs CatChat sns posts).
export function buildLegacyVersionsByFile(legacyManifest, resourceDir) {
  const resources =
    legacyManifest && legacyManifest.res && typeof legacyManifest.res === "object"
      ? legacyManifest.res
      : {};
  const bestByFile = new Map();

  for (const [rawResourcePath, info] of Object.entries(resources)) {
    const resourcePath = normalizeRef(rawResourcePath);
    const match = legacyResourceMatch(resourcePath, resourceDir);
    if (!match) continue;

    const { regionPath, filename } = match;
    if (!isImagePath(filename)) continue;

    const prefix = String((info && info.prefix) || "").trim();
    if (!prefix) continue;

    const appRegions = appRegionsForLegacyResourcePath(regionPath);
    if (appRegions.length === 0) continue;

    let fileEntry = bestByFile.get(filename);
    if (!fileEntry) {
      fileEntry = {};
      bestByFile.set(filename, fileEntry);
    }
    for (const { region, priority } of appRegions) {
      const current = fileEntry[region];
      if (!current || priority < current.priority) {
        fileEntry[region] = { prefix, priority };
      }
    }
  }

  const versionsByFile = {};
  for (const [filename, fileEntry] of bestByFile) {
    const regionVersions = {};
    for (const region of LOCALE_TARGETS) {
      if (fileEntry[region]) regionVersions[region] = fileEntry[region].prefix;
    }
    if (Object.keys(regionVersions).length > 0) {
      versionsByFile[filename] = regionVersions;
    }
  }
  return versionsByFile;
}

// Per-region raw-asset URLs for one file given its `{region: version}` map and the
// archive resource dir. Returns a sparse `{en?, cn?, chs?, jp?, kr?}` of full URLs
// (`{}` when nothing resolves).
export function legacyRawUrls(filename, versionsByRegion, resourceDir) {
  const urls = {};
  if (!filename || !versionsByRegion) return urls;
  for (const region of LOCALE_TARGETS) {
    const version = versionsByRegion[region];
    const rawRegion = LEGACY_RAW_ASSET_PATH_BY_REGION[region];
    if (version && rawRegion) {
      urls[region] =
        `${LEGACY_RAW_ASSETS_BASE}/${version}/${rawRegion}/${resourceDir}/${filename}`;
    }
  }
  return urls;
}

// Resolve a single banner/post ref straight to its legacy `{region: url}` map
// (`{}` when the file isn't in the archive). Convenience over baseName + lookup.
export function legacyRefUrls(ref, versionsByFile, resourceDir) {
  const filename = baseName(normalizeRef(ref));
  return legacyRawUrls(filename, (versionsByFile || {})[filename], resourceDir);
}

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function isLegacyCatChatRef(ref) {
  const normalized = normalizeRef(ref);
  return normalized.startsWith("ui/activity/extend/catchat/main/pic_scattered/");
}

function legacyCatChatRefsOfRow(row) {
  const refs = [];
  const contentImages = Array.isArray(row && row.content_image) ? row.content_image : [];
  for (const imageRef of contentImages) {
    const ref = normalizeRef(imageRef);
    if (isLegacyCatChatRef(ref)) refs.push(ref);
  }

  const headRef = normalizeRef(row && row.content_head);
  if (isLegacyCatChatRef(headRef)) refs.push(headRef);
  return refs;
}

function incrementVersionCount(countsByRegion, region, version) {
  if (!countsByRegion[region]) countsByRegion[region] = new Map();
  const counts = countsByRegion[region];
  counts.set(version, (counts.get(version) || 0) + 1);
}

function mostCommonVersion(counts) {
  let bestVersion = null;
  let bestCount = -1;
  for (const [version, count] of counts || []) {
    if (count > bestCount) {
      bestVersion = version;
      bestCount = count;
    }
  }
  return bestVersion;
}

export function buildLegacyCatChatVersionsByActivity(rows, versionsByFile) {
  const countsByActivity = new Map();
  for (const row of rows || []) {
    const activityId = num(row && row.activity_id);
    if (activityId <= 0) continue;

    let countsByRegion = countsByActivity.get(activityId);
    if (!countsByRegion) {
      countsByRegion = {};
      countsByActivity.set(activityId, countsByRegion);
    }

    for (const ref of legacyCatChatRefsOfRow(row)) {
      const versionsByRegion = (versionsByFile || {})[baseName(ref)];
      if (!versionsByRegion) continue;
      for (const region of LOCALE_TARGETS) {
        const version = versionsByRegion[region];
        if (version) incrementVersionCount(countsByRegion, region, version);
      }
    }
  }

  const versionsByActivity = {};
  for (const [activityId, countsByRegion] of countsByActivity) {
    const versionsByRegion = {};
    for (const region of LOCALE_TARGETS) {
      const version = mostCommonVersion(countsByRegion[region]);
      if (version) versionsByRegion[region] = version;
    }
    if (Object.keys(versionsByRegion).length > 0) {
      versionsByActivity[String(activityId)] = versionsByRegion;
    }
  }
  return versionsByActivity;
}

export function legacyCatChatRefUrls(
  activityId,
  ref,
  versionsByFile,
  versionsByActivity,
) {
  const filename = baseName(normalizeRef(ref));
  if (!filename || !isImagePath(filename)) return {};
  const versionsByRegion =
    (versionsByFile || {})[filename] || (versionsByActivity || {})[String(activityId)];
  return legacyRawUrls(filename, versionsByRegion, LEGACY_CATCHAT_DIR);
}

export function mergeAndCompressLocaleUrls(primary, fallback) {
  const value = { ...(primary || {}) };
  for (const region of LOCALE_TARGETS) {
    if (value[region] === undefined && fallback && fallback[region]) {
      value[region] = fallback[region];
    }
  }
  return compressLocaleValue(value);
}
