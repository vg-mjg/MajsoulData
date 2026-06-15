import test from "node:test";
import assert from "node:assert/strict";

import { gameVersionLabel } from "../eleventy.config.js";

const versions = {
  cn: { product_version: "4.cn", resource_version: "0.cn" },
  en: { product_version: "4.en", resource_version: "0.en" },
  jp: { product_version: "4.jp", resource_version: "0.jp" },
  kr: { product_version: "4.kr", resource_version: "0.kr" },
};

test("gameVersionLabel maps UI locales to mirror regions", () => {
  assert.equal(gameVersionLabel(versions, "en"), "4.en (0.en)");
  assert.equal(gameVersionLabel(versions, "jp"), "4.jp (0.jp)");
  assert.equal(gameVersionLabel(versions, "kr"), "4.kr (0.kr)");
  assert.equal(gameVersionLabel(versions, "chs"), "4.cn (0.cn)");
  assert.equal(gameVersionLabel(versions, "chs_t"), "4.cn (0.cn)");
});

test("gameVersionLabel falls back through EN to the placeholder", () => {
  assert.equal(
    gameVersionLabel(
      {
        cn: { product_version: "4.cn" },
        en: { product_version: "4.en", resource_version: "0.en" },
      },
      "chs",
    ),
    "4.en (0.en)",
  );
  assert.equal(gameVersionLabel({ jp: { product_version: "4.jp" } }, "jp"), "-");
  assert.equal(gameVersionLabel(undefined, "en"), "-");
});
