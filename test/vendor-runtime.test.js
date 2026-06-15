import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const spineViewer = readFileSync("src/assets/js/spine-viewer.js", "utf8");

test("spine viewer loads the vendored runtime from the site origin", () => {
  assert.match(spineViewer, /\.\.\/vendor\/spine-player\/spine-player\.min\.js/);
  assert.doesNotMatch(spineViewer, /cdn\.jsdelivr|unpkg\.com/);
});
