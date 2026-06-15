// Mirror I/O for the ingest pipeline. Reads from $MJS_SOURCE, which is either an
// http(s) base (the public mirror, the default) or a local directory (a dump or
// a test fixture). The same code path serves both, so no test ever touches the
// live mirror — point MJS_SOURCE at a fixture directory instead.

import { promises as fsp } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Public asset mirror. Emitted asset URLs always point here regardless of source.
export const MIRROR =
  "https://files.riichi.moe/mjg/game%20resources%20and%20tools/Mahjong%20Soul/unity_raw";

// The common prefix every emitted asset URL is built on (mirror + extracted/).
export const RESOURCE_BASE = `${MIRROR}/extracted/`;

// Frozen legacy `raw assets` archive (sibling of unity_raw). Holds the banners
// that have since dropped out of unity_raw, plus the version manifest discovered
// via `last_downloaded_version.txt`. Legacy asset URLs always point here.
export const LEGACY_RAW_ASSETS_BASE =
  "https://files.riichi.moe/mjg/game%20resources%20and%20tools/Mahjong%20Soul/raw%20assets";

const SOURCE = (process.env.MJS_SOURCE || MIRROR).replace(/\/+$/, "");
export const FORCE = process.env.MJS_FORCE === "1";

const isHttp = /^https?:/i.test(SOURCE);

// The legacy archive is a separate mirror over http; a local source (a dump or a
// test fixture) carries its `last_downloaded_version.txt` + resversion slice
// inline, so reads come from the same directory.
const LEGACY_SOURCE = isHttp ? LEGACY_RAW_ASSETS_BASE : SOURCE;

export function sourceLabel() {
  return SOURCE;
}

async function readFrom(base, relPath) {
  if (isHttp) {
    const url = `${base}/${relPath}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`GET ${url} -> ${res.status}`);
    }
    return res.text();
  }
  return fsp.readFile(path.join(base, relPath), "utf8");
}

export async function readText(relPath) {
  return readFrom(SOURCE, relPath);
}

export async function readOptionalText(relPath) {
  try {
    return await readText(relPath);
  } catch (error) {
    if (isMissingOptionalRead(error)) return null;
    throw error;
  }
}

export async function readJson(relPath) {
  return JSON.parse(await readText(relPath));
}

// Read from the legacy `raw assets` archive (see LEGACY_SOURCE).
export async function readLegacyText(relPath) {
  return readFrom(LEGACY_SOURCE, relPath);
}

export async function readLegacyJson(relPath) {
  return JSON.parse(await readLegacyText(relPath));
}

function isMissingOptionalRead(error) {
  const message = String((error && error.message) || "");
  if (error && error.code === "ENOENT") return true;
  if (/-> 404\b/.test(message)) return true;
  if (/-> (401|403)\b/.test(message)) return true;
  return false;
}

// Read a file that may legitimately be absent (a region without a manifest, an
// optional table). Returns null when missing; re-throws anything else.
export async function readOptionalJson(relPath) {
  try {
    return await readJson(relPath);
  } catch (error) {
    if (isMissingOptionalRead(error)) return null;
    throw error;
  }
}

// Read an optional legacy-archive text file (e.g. the version pointer). Returns
// null when missing so a source without the legacy slice still ingests.
export async function readOptionalLegacyText(relPath) {
  try {
    return await readLegacyText(relPath);
  } catch (error) {
    if (isMissingOptionalRead(error)) return null;
    throw error;
  }
}

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
