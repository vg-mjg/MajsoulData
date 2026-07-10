// One-shot git-history recovery, exercised end to end: a sandbox git repo holds
// committed collections whose HISTORY contains baked URLs the CURRENT version
// has lost (regressed to "" before the preserve feature existed — simulated by
// ingesting with an empty harvest and committing that regressed state). The
// recovery script mines the history and re-runs the real ingest with the
// historical URLs seeded; current-tables gating and live-wins are inherited
// from the preserve mechanism, so a deleted table row stays gone.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sweepLiveness } from "../scripts/recover-pruned-assets-from-git-history.mjs";

const RECOVER = fileURLToPath(
  new URL("../scripts/recover-pruned-assets-from-git-history.mjs", import.meta.url),
);
const INGEST = fileURLToPath(new URL("../pipeline/ingest.js", import.meta.url));
const FIXTURE_MIRROR = fileURLToPath(new URL("./fixtures/mirror", import.meta.url));
const REGIONS = ["en", "cn", "jp", "kr"];
const COLLECTIONS = [
  "characters.json",
  "items.json",
  "achievements.json",
  "activities.json",
  "catchat.json",
  "stories.json",
  "version.json",
];

function git(repo, args) {
  execFileSync("git", ["-C", repo, ...args], {
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_AUTHOR_NAME: "test",
      GIT_AUTHOR_EMAIL: "test@example.invalid",
      GIT_COMMITTER_NAME: "test",
      GIT_COMMITTER_EMAIL: "test@example.invalid",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function makeSandbox(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "mjs-recover-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const mirror = path.join(dir, "mirror");
  cpSync(FIXTURE_MIRROR, mirror, { recursive: true });
  const repo = path.join(dir, "repo");
  const dataDir = path.join(repo, "src", "_data");
  mkdirSync(dataDir, { recursive: true });
  git(repo, ["init", "-q"]);
  return { dir, mirror, repo, dataDir };
}

function pipelineEnv(sandbox, dataDir) {
  return {
    ...process.env,
    MJS_SOURCE: sandbox.mirror,
    MJS_DATA_DIR: dataDir,
    MJS_STATE_FILE: path.join(sandbox.dir, "state.json"),
    MJS_FORCE: "1",
  };
}

function runIngest(sandbox, dataDir = sandbox.dataDir) {
  execFileSync(process.execPath, [INGEST], {
    env: pipelineEnv(sandbox, dataDir),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// The sweep is skipped so the test never touches the network; its logic is
// covered by the injected-fetch unit test below.
function runRecovery(sandbox) {
  execFileSync(process.execPath, [RECOVER, "--repo", sandbox.repo, "--no-liveness"], {
    env: pipelineEnv(sandbox, sandbox.dataDir),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function commit(sandbox, message) {
  git(sandbox.repo, ["add", "-A"]);
  git(sandbox.repo, ["commit", "-q", "-m", message]);
}

function read(dataDir, name) {
  return readFileSync(path.join(dataDir, name), "utf8");
}

function activityById(dataDir, id) {
  return JSON.parse(read(dataDir, "activities.json")).find((activity) => activity.id === id);
}

function editJson(filePath, edit) {
  const value = JSON.parse(readFileSync(filePath, "utf8"));
  writeFileSync(filePath, JSON.stringify(edit(value), null, 2));
}

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

test("recovery restores history-only URLs; deleted rows stay gone; reruns are idempotent", (t) => {
  const sandbox = makeSandbox(t);

  // v1: everything resolves live and the baked URLs land in git history.
  runIngest(sandbox);
  const summerImage = activityById(sandbox.dataDir, 250101).image;
  assert.match(summerImage, /summer_b\.png$/);
  const clip = "MyAssets/audio/sound/yiji/act_rich.mp3";
  assert.ok(read(sandbox.dataDir, "characters.json").includes(clip));
  assert.ok(read(sandbox.dataDir, "activities.json").includes("qingyun_b"));
  commit(sandbox, "v1");

  // The mirror prunes both banners and the audio clip; activity 250501 is also
  // retired from the tables entirely (the deleted-row case).
  pruneManifests(sandbox, "summer_b");
  pruneManifests(sandbox, "qingyun_b");
  editJson(path.join(sandbox.mirror, "extracted", "audio_manifest.json"), (entries) =>
    entries.filter((entry) => !entry.path.includes("yiji/act_rich")),
  );
  const tables = path.join(sandbox.mirror, "metadata", "tables", "activity");
  for (const file of ["activity.json", "activity_banner.json"]) {
    editJson(path.join(tables, file), (rows) => rows.filter((row) => row.id !== 250501));
  }

  // v2 simulates the pre-preserve loss: an ingest with NO prior output (empty
  // harvest) regresses the references, and that state becomes the current
  // committed version.
  const freshDataDir = path.join(sandbox.dir, "fresh-data");
  runIngest(sandbox, freshDataDir);
  cpSync(freshDataDir, sandbox.dataDir, { recursive: true, force: true });
  assert.equal(activityById(sandbox.dataDir, 250101).image, "");
  assert.equal(activityById(sandbox.dataDir, 250501), undefined);
  assert.ok(!read(sandbox.dataDir, "characters.json").includes(clip));
  commit(sandbox, "v2");

  // Recovery mines v1's URLs out of history and folds them back in: the image
  // returns byte-identical to v1, the audio clip returns, and the deleted row
  // stays gone even though its URL is in history.
  runRecovery(sandbox);
  assert.deepEqual(activityById(sandbox.dataDir, 250101).image, summerImage);
  assert.ok(read(sandbox.dataDir, "characters.json").includes(clip));
  assert.equal(activityById(sandbox.dataDir, 250501), undefined);
  assert.ok(!read(sandbox.dataDir, "activities.json").includes("qingyun_b"));

  // Re-running the recovery (even before committing) changes nothing.
  const recovered = COLLECTIONS.map((name) => read(sandbox.dataDir, name));
  runRecovery(sandbox);
  COLLECTIONS.forEach((name, i) => {
    assert.equal(read(sandbox.dataDir, name), recovered[i], `${name} changed on rerun`);
  });

  // After committing, the ordinary steady-state ingest keeps the recovered URLs
  // alive with no further history mining.
  commit(sandbox, "recovered");
  runIngest(sandbox);
  COLLECTIONS.forEach((name, i) => {
    assert.equal(read(sandbox.dataDir, name), recovered[i], `${name} changed on steady-state ingest`);
  });
});

test("liveness sweep drops non-serving URLs and logs every drop", async () => {
  const urls = ["https://x/a.png", "https://x/b.png", "https://x/c.mp3"];
  const statuses = { "https://x/a.png": 200, "https://x/b.png": 404 };
  const logs = [];
  const fetchImpl = async (url, init) => {
    assert.equal(init.method, "HEAD");
    if (!(url in statuses)) throw new Error("connection reset");
    return { ok: statuses[url] === 200, status: statuses[url] };
  };
  const { kept, dropped } = await sweepLiveness(urls, {
    fetchImpl,
    log: (line) => logs.push(line),
  });
  assert.deepEqual(kept, ["https://x/a.png"]);
  assert.deepEqual(dropped.sort(), ["https://x/b.png", "https://x/c.mp3"]);
  assert.equal(logs.length, 2);
  assert.ok(logs.some((line) => line.includes("b.png") && line.includes("404")));
  assert.ok(logs.some((line) => line.includes("c.mp3") && line.includes("connection reset")));
});

test("--help documents the git-history-bounded limitation", () => {
  const output = execFileSync(process.execPath, [RECOVER, "--help"], { encoding: "utf8" });
  assert.match(output, /bounded by URLs that appear somewhere in git history/);
});
