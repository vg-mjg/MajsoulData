// Preservation of manifest-pruned asset references, exercised through the real
// ingest orchestrator: each test copies the fixture mirror into a sandbox, runs
// `pipeline/ingest.js` as a subprocess (MJS_SOURCE -> sandbox mirror,
// MJS_DATA_DIR/MJS_STATE_FILE -> sandbox, MJS_FORCE=1 so the rebuild always
// executes), then mutates the mirror and re-runs. The previously-committed
// collections in MJS_DATA_DIR are the persistence the harvest reads — a pruned
// reference must keep its last-known URL, a still-live one must stay
// byte-identical, and a removed table row must drop its preserved URL.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INGEST = fileURLToPath(new URL("../pipeline/ingest.js", import.meta.url));
const FIXTURE_MIRROR = fileURLToPath(new URL("./fixtures/mirror", import.meta.url));
const REGIONS = ["en", "cn", "jp", "kr"];

function makeSandbox(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "mjs-preserve-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const mirror = path.join(dir, "mirror");
  cpSync(FIXTURE_MIRROR, mirror, { recursive: true });
  return { dir, mirror, dataDir: path.join(dir, "data") };
}

// Run the real ingest against the sandbox mirror. `dataDir` defaults to the
// sandbox's persistent one; pass a fresh dir to simulate a checkout with no
// previously-committed collections (an empty harvest).
function runIngest(sandbox, dataDir = sandbox.dataDir) {
  execFileSync(process.execPath, [INGEST], {
    env: {
      ...process.env,
      MJS_SOURCE: sandbox.mirror,
      MJS_DATA_DIR: dataDir,
      MJS_STATE_FILE: path.join(sandbox.dir, "state.json"),
      MJS_FORCE: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readCollection(dataDir, name) {
  return readFileSync(path.join(dataDir, name), "utf8");
}

function activityById(dataDir, id) {
  return JSON.parse(readCollection(dataDir, "activities.json")).find(
    (activity) => activity.id === id,
  );
}

function editJson(filePath, edit) {
  const value = JSON.parse(readFileSync(filePath, "utf8"));
  writeFileSync(filePath, JSON.stringify(edit(value), null, 2));
}

// Drop every manifest entry whose outputPath contains `needle`, in all regions.
function pruneManifests(sandbox, needle) {
  for (const region of REGIONS) {
    const file = path.join(sandbox.mirror, "extracted", `extracted_manifest_${region}.json`);
    editJson(file, (manifest) => {
      manifest.entries = manifest.entries.filter(
        (entry) => !entry.outputPath.includes(needle),
      );
      return manifest;
    });
  }
}

test("a fully pruned banner keeps its last-known URL from the committed output", (t) => {
  const sandbox = makeSandbox(t);
  runIngest(sandbox);
  const before = activityById(sandbox.dataDir, 250101).image;
  assert.match(before, /banner_tab\/pic\/summer_b\.png$/);

  pruneManifests(sandbox, "summer_b");

  // Without prior output the reference genuinely regresses: banner_big no longer
  // resolves, no other banner field is live, and there is no legacy entry.
  const freshDataDir = path.join(sandbox.dir, "fresh-data");
  runIngest(sandbox, freshDataDir);
  assert.equal(activityById(freshDataDir, 250101).image, "");

  // With the committed output present, the harvest seeds the pruned path and the
  // banner resolves to exactly the URL baked the run before.
  runIngest(sandbox);
  assert.deepEqual(activityById(sandbox.dataDir, 250101).image, before);
});

test("a partial-locale prune heals per-locale: live locales stay live, pruned ones seed", (t) => {
  const sandbox = makeSandbox(t);
  runIngest(sandbox);
  const before = activityById(sandbox.dataDir, 250501).image;
  assert.match(before.en, /pic\/en_en\/qingyun_b\.png$/);
  assert.match(before.cn, /pic\/chs_t\/qingyun_b\.png$/);
  assert.match(before.chs, /pic\/chs\/qingyun_b\.png$/);

  // Only the Traditional Chinese variant drops out of the live manifests.
  pruneManifests(sandbox, "chs_t/qingyun_b");
  runIngest(sandbox);

  // en/chs still come from the live manifest, cn from the seed — one merged map,
  // byte-identical to the pre-prune value (and jp/kr stay absent as before).
  assert.deepEqual(activityById(sandbox.dataDir, 250501).image, before);
});

test("a pruned audio clip keeps its last-known URL via the audio index", (t) => {
  const sandbox = makeSandbox(t);
  runIngest(sandbox);
  const clip = "MyAssets/audio/sound/yiji/act_rich.mp3";
  assert.ok(readCollection(sandbox.dataDir, "characters.json").includes(clip));

  editJson(path.join(sandbox.mirror, "extracted", "audio_manifest.json"), (entries) =>
    entries.filter((entry) => !entry.path.includes("yiji/act_rich")),
  );

  // Fresh checkout: the clip is gone. With prior output: preserved.
  const freshDataDir = path.join(sandbox.dir, "fresh-data");
  runIngest(sandbox, freshDataDir);
  assert.ok(!readCollection(freshDataDir, "characters.json").includes(clip));

  runIngest(sandbox);
  assert.ok(readCollection(sandbox.dataDir, "characters.json").includes(clip));
});

test("removing the table row GCs the preserved URL on the next run", (t) => {
  const sandbox = makeSandbox(t);
  runIngest(sandbox);
  pruneManifests(sandbox, "summer_b");
  runIngest(sandbox);
  assert.match(activityById(sandbox.dataDir, 250101).image, /summer_b\.png$/);

  // The game retires the activity entirely: its rows leave the tables, so the
  // transform stops emitting the entry and the harvest no longer re-seeds it.
  const tables = path.join(sandbox.mirror, "metadata", "tables", "activity");
  for (const file of ["activity.json", "activity_banner.json"]) {
    editJson(path.join(tables, file), (rows) => rows.filter((row) => row.id !== 250101));
  }
  runIngest(sandbox);

  assert.equal(activityById(sandbox.dataDir, 250101), undefined);
  assert.ok(!readCollection(sandbox.dataDir, "activities.json").includes("summer_b"));
});

test("an unchanged-manifest rerun is byte-identical: seeds never displace live resolution", (t) => {
  const sandbox = makeSandbox(t);
  const files = [
    "characters.json",
    "items.json",
    "achievements.json",
    "activities.json",
    "catchat.json",
    "stories.json",
    "version.json",
  ];

  // First run harvests nothing (fresh checkout); the second harvests every URL
  // the first baked. All of them still resolve live, so nothing may change.
  runIngest(sandbox);
  const before = files.map((name) => readCollection(sandbox.dataDir, name));
  runIngest(sandbox);
  files.forEach((name, i) => {
    assert.equal(readCollection(sandbox.dataDir, name), before[i], `${name} changed`);
  });
});
