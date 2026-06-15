// Activities domain transformer. Pure seam: the activity + activity-banner tables,
// the unity_raw asset index, and the legacy raw-asset version lookup in; a
// denormalized, language-agnostic activities collection out. Each entry carries its
// inline five-language name and one baked banner image value-map.
//
// Banner resolution runs per banner field in priority order (banner_big ->
// banner_left -> enter_icon -> banner_left_icon); the first field that yields any
// URL wins. For each field we build a per-locale `{en, cn, chs, jp, kr}` map from
// the unity_raw variants that live INSIDE the ref's own directory (never a
// same-named asset elsewhere), then fill any still-missing locale from the frozen
// legacy `raw assets` archive. The map collapses to a bare string when every locale
// resolves to the same asset.
//
// Activities are kept when they carry any localized name OR any non-empty banner
// path; an entry with no resolvable image renders as a non-interactive placeholder
// (its `image` is ""). Only activities with neither a name nor a banner path drop.
// A `fallbackName` derived from the banner filename covers blank-named rows.

import { localizeText, rowsOf, textMap } from "../lib/localization.js";
import {
  LOCALE_TARGETS,
  compressLocaleValue,
  resolveLocaleValueWithinDir,
} from "./assets.js";
import { LEGACY_ACTIVITY_BANNER_DIR, legacyRefUrls } from "./legacy.js";

// Banner art priority for the displayed/lightboxed image: the big lobby art first,
// then the smaller tab/enter variants.
const BANNER_IMAGE_FIELDS = ["banner_big", "banner_left", "enter_icon", "banner_left_icon"];

// Banner field priority for deriving a name from the asset filename. The legacy
// SPA tried the enter icon first; preserved here so blank-named rows read the same.
const BANNER_NAME_FIELDS = ["enter_icon", "banner_big", "banner_left", "banner_left_icon"];

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function str(value) {
  return value === null || value === undefined ? "" : String(value);
}

// "ui/.../25lunhuan_b.jpg" -> "25lunhuan b": the asset's bare filename with the
// extension dropped and separators spaced, a last-resort label for a blank name.
function bannerPathLabel(rawPath) {
  const path = str(rawPath).trim();
  if (!path) return "";
  const filename = path.split("/").pop() || path;
  const stem = filename.replace(/\.[^.]+$/, "");
  return stem.replace(/[_-]+/g, " ").trim();
}

// Resolve one banner field to a value-map (string | {region: url}) or "". The
// unity_raw per-locale variants within the ref's own directory take precedence;
// legacy raw-asset URLs backfill any locale they leave unresolved.
function resolveBannerField(banner, field, assetIndex, legacyVersions) {
  const ref = str(banner[field]).trim();
  if (!ref) return "";

  const value = resolveLocaleValueWithinDir(assetIndex, ref);
  const legacy = legacyRefUrls(ref, legacyVersions, LEGACY_ACTIVITY_BANNER_DIR);
  for (const region of LOCALE_TARGETS) {
    if (value[region] === undefined && legacy[region]) value[region] = legacy[region];
  }
  return compressLocaleValue(value);
}

function resolveBannerImage(banner, assetIndex, legacyVersions) {
  for (const field of BANNER_IMAGE_FIELDS) {
    const value = resolveBannerField(banner, field, assetIndex, legacyVersions);
    if (value) return value;
  }
  return "";
}

function bannerHasPath(banner) {
  return BANNER_IMAGE_FIELDS.some((field) => str(banner[field]).trim());
}

function bannerFallbackName(banner) {
  for (const field of BANNER_NAME_FIELDS) {
    const label = bannerPathLabel(banner[field]);
    if (label) return label;
  }
  return "";
}

// A banner row's `id` IS its activity id (the special daily/weekly banner slots
// 1–7 have no activity row and are simply skipped at join time). Keep the first
// banner seen per id.
function bannerByActivityId(bannerRows) {
  const byId = new Map();
  for (const row of rowsOf(bannerRows)) {
    const id = num(row.id);
    if (id > 0 && !byId.has(id)) byId.set(id, row);
  }
  return byId;
}

export function transformActivities(tables, assetIndex, legacyBannerVersions) {
  const banners = bannerByActivityId(tables.activityBanner);

  const activities = [];
  for (const row of rowsOf(tables.activity)) {
    const id = num(row.id);
    if (id <= 0) continue;

    const banner = banners.get(id);
    const nameMap = textMap(row, "name");
    const hasName = localizeText(nameMap) !== "";
    const hasBannerPath = banner ? bannerHasPath(banner) : false;
    // Keep anything with a name or a banner path; drop only the truly empty rows.
    if (!hasName && !hasBannerPath) continue;

    activities.push({
      id,
      type: str(row.type).trim() || "unknown",
      text: { name: nameMap },
      fallbackName: banner ? bannerFallbackName(banner) : "",
      image: banner ? resolveBannerImage(banner, assetIndex, legacyBannerVersions) : "",
    });
  }

  return activities.sort((a, b) => b.id - a.id);
}
