// One-shot recovery of asset references that were lost BEFORE the preserve
// feature existed. The steady-state preserve mechanism seeds the asset index
// from the CURRENT committed output, so a reference that already regressed to
// "" has nothing to re-seed from. This script widens the seed source once: it
// mines every git-history version of src/_data/*.json for baked MyAssets image
// and audio URLs (the mirror is additive, so they still serve), keeps the ones
// absent from the current committed output, and re-runs the ingest with them
// pre-loaded into the ordinary low-priority seed tier via MJS_SEED_URLS_FILE.
//
// Safety is inherited from the preserve mechanism, untouched here:
//   - live-wins: a ref the live manifest still resolves keeps its live URL;
//   - current-tables gating: a deleted table row emits nothing, so genuinely
//     removed content stays removed regardless of what history holds.
// Re-running is idempotent — the seed only ever fills refs nothing live
// resolves, so a second run reproduces the same output byte for byte.
//
// Run it once (npm run recover), review the src/_data diff, commit. From then
// on the steady-state harvest keeps the recovered URLs alive with no further
// history mining.
//
// LIMITATION: recovery is bounded by URLs that appear somewhere in git
// history. A reference pruned before it was ever committed WITH a URL leaves
// no historical record — the file may still exist on the mirror, but the
// ref -> URL mapping is gone (manifests are not committed) and is not
// reconstructed here.

import { execFileSync } from "node:child_process";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectBakedSeeds } from "../pipeline/assets.js";
import { RESOURCE_BASE } from "../pipeline/mirror.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HISTORY_PATH = "src/_data";

const HELP = `Usage: node scripts/recover-pruned-assets-from-git-history.mjs [options]
       npm run recover [-- options]

One-time recovery of asset references lost before the preserve feature existed.
Mines every git-history version of ${HISTORY_PATH}/*.json for baked MyAssets
image and audio URLs (legacy \`raw assets\` URLs are never collected), keeps the
ones absent from the current committed output, and re-runs the ingest with them
pre-loaded into the ordinary low-priority seed tier. Live manifests always win
and only refs current table rows still hold get baked, so deleted rows stay
gone and live resolutions are never clobbered. Re-running is idempotent.

Options:
  --repo <dir>    Git repository to mine (default: this project).
  --no-liveness   Skip the one-time HEAD sweep that drops recovered URLs the
                  mirror no longer serves. The sweep logs every drop; with the
                  mirror being additive it is expected to drop ~nothing.
  --help, -h      Show this help.

Limitation: recovery is bounded by URLs that appear somewhere in git history.
A reference pruned before it was ever committed WITH a URL leaves no historical
record and cannot be recovered this way — the file may still serve on the
mirror, but the ref -> URL mapping is gone (manifests are not committed).`;

function git(repoDir, args) {
  return execFileSync("git", ["-C", repoDir, ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

function bakedUrlsOf(json) {
  const seeds = collectBakedSeeds(json);
  return [...seeds.imageSeeds.map((seed) => seed.path), ...seeds.audioSeeds].map(
    (logical) => `${RESOURCE_BASE}MyAssets/${logical}`,
  );
}

// Union of every baked MyAssets URL across all git-history versions of the
// committed collections. collectBakedSeeds already excludes legacy `raw assets`
// URLs and routes image vs audio by extension.
export function harvestHistoricalUrls(repoDir) {
  const commits = git(repoDir, ["rev-list", "HEAD", "--", HISTORY_PATH])
    .split("\n")
    .filter(Boolean);
  const urls = new Set();
  for (const commit of commits) {
    const files = git(repoDir, ["ls-tree", "-r", "--name-only", commit, "--", HISTORY_PATH])
      .split("\n")
      .filter((name) => name.endsWith(".json"));
    for (const file of files) {
      let json;
      try {
        json = JSON.parse(git(repoDir, ["show", `${commit}:${file}`]));
      } catch {
        console.warn(`Warning: skipping unparseable blob ${commit.slice(0, 12)}:${file}`);
        continue;
      }
      for (const url of bakedUrlsOf(json)) urls.add(url);
    }
  }
  return { urls, commitCount: commits.length };
}

// Baked URLs in the CURRENT committed collections — everything the steady-state
// harvest will seed by itself. Recovery only carries the historical URLs beyond
// this set, which is exactly the already-lost-but-maybe-still-referenced data.
export async function harvestCurrentUrls(dataDir) {
  const urls = new Set();
  const names = await fsp.readdir(dataDir).catch(() => []);
  for (const name of names.filter((n) => n.endsWith(".json"))) {
    const json = await fsp
      .readFile(path.join(dataDir, name), "utf8")
      .then(JSON.parse)
      .catch(() => null);
    if (json) for (const url of bakedUrlsOf(json)) urls.add(url);
  }
  return urls;
}

// HEAD every recovered URL and drop the ones the mirror no longer serves,
// logging each drop — no silent truncation. Off the steady-state ingest path;
// only this one-shot may touch the network per URL.
export async function sweepLiveness(urls, { fetchImpl = fetch, log = console.log, concurrency = 8 } = {}) {
  const kept = [];
  const dropped = [];
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      let reason;
      try {
        const res = await fetchImpl(url, { method: "HEAD" });
        if (res.ok) {
          kept.push(url);
          continue;
        }
        reason = `HTTP ${res.status}`;
      } catch (error) {
        reason = String((error && error.message) || error);
      }
      dropped.push(url);
      log(`Dropped ${url} — ${reason}`);
    }
  });
  await Promise.all(workers);
  return { kept, dropped };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const repoIndex = args.indexOf("--repo");
  const repoDir = repoIndex >= 0 ? path.resolve(args[repoIndex + 1]) : ROOT;
  // The data dir the ingest rebuild reads and writes; forced to match the mined
  // repo so history and current output always describe the same collections.
  const dataDir = process.env.MJS_DATA_DIR
    ? path.resolve(process.env.MJS_DATA_DIR)
    : path.join(repoDir, ...HISTORY_PATH.split("/"));

  const { urls: historical, commitCount } = harvestHistoricalUrls(repoDir);
  const current = await harvestCurrentUrls(dataDir);
  let recovered = [...historical].filter((url) => !current.has(url)).sort();
  console.log(
    `Mined ${commitCount} commits touching ${HISTORY_PATH}: ${historical.size} distinct ` +
      `baked URLs, ${recovered.length} absent from the current committed output.`,
  );
  if (recovered.length === 0) {
    console.log("Nothing to recover; current output already carries every historical URL.");
    return;
  }

  if (args.includes("--no-liveness")) {
    console.log("Liveness sweep skipped (--no-liveness).");
  } else {
    const { kept, dropped } = await sweepLiveness(recovered);
    console.log(
      `Liveness sweep: ${kept.length} of ${recovered.length} recovered URLs still serve ` +
        `(${dropped.length} dropped).`,
    );
    recovered = kept.sort();
    if (recovered.length === 0) {
      console.log("Nothing left to recover after the sweep.");
      return;
    }
  }

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "mjs-recovery-"));
  const seedFile = path.join(tmpDir, "seed-urls.json");
  await fsp.writeFile(seedFile, JSON.stringify(recovered, null, 2) + "\n");
  try {
    console.log(`Rebuilding with ${recovered.length} historical URLs pre-loaded into the seed tier...`);
    execFileSync(process.execPath, [path.join(ROOT, "pipeline", "ingest.js")], {
      env: {
        ...process.env,
        MJS_FORCE: "1",
        MJS_DATA_DIR: dataDir,
        MJS_SEED_URLS_FILE: seedFile,
      },
      stdio: "inherit",
    });
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
  console.log(
    `Recovery rebuild complete. Review the ${HISTORY_PATH} diff and commit; from then on ` +
      "the steady-state harvest keeps the recovered URLs alive with no further history mining.",
  );
}

// Importable for tests (sweepLiveness and the harvests); runs only as a CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  });
}
