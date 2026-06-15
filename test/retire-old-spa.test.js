import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const REMOVED_PATHS = [
  "main.cjs",
  "web",
  "web/index.html",
  "web/js/main.js",
  "web/js/core/http.js",
  "web/js/core/router.js",
  "web/js/features",
  "web/js/services",
  "web/data",
  "web/resources.json",
];

const SCAN_ROOTS = ["lib", "pipeline", "scripts", "src", "test", ".github"];
const TEXT_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".json", ".njk", ".yml", ".yaml"]);
const STALE_PATTERNS = [
  /web\/data/,
  /web\/resources\.json/,
  /\.\.\/web\/js/,
  /\.\.\/\.\.\/web\/js/,
  /from\s+["'][^"']*web\/js/,
  /import\([^)]*["'][^"']*web\/js/,
  /src=["'][^"']*js\/main\.js/,
];

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git" || entry === ".direnv" || entry === "_site") continue;
      yield* walk(full);
    } else if (stat.isFile()) {
      yield full;
    }
  }
}

test("legacy SPA files and generated artifacts are retired", () => {
  for (const filePath of REMOVED_PATHS) {
    assert.equal(existsSync(filePath), false, `${filePath} should be removed`);
  }
});

test("active code has no stale references to retired SPA artifacts", () => {
  const matches = [];
  for (const root of SCAN_ROOTS) {
    for (const filePath of walk(root)) {
      if (filePath === path.join("test", "retire-old-spa.test.js")) continue;
      if (!TEXT_EXTENSIONS.has(path.extname(filePath))) continue;
      const text = readFileSync(filePath, "utf8");
      for (const pattern of STALE_PATTERNS) {
        if (pattern.test(text)) matches.push(`${filePath} matches ${pattern}`);
      }
    }
  }
  assert.deepEqual(matches, []);
});
