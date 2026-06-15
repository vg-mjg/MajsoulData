// Localization helpers: the documented text and asset fallback chains. These
// run in both the ingest pipeline and the Eleventy build filters, so getting the
// chains right here guarantees text/asset resolution is identical in both stages.

import test from "node:test";
import assert from "node:assert/strict";

import { localizeText, resolveResourceUrl, textMap } from "../lib/localization.js";

test("localizeText returns the preferred language when present", () => {
  const map = { en: "Hello", jp: "こんにちは", chs: "", chs_t: "", kr: "" };
  assert.equal(localizeText(map, "en"), "Hello");
  assert.equal(localizeText(map, "jp"), "こんにちは");
});

test("localizeText falls back past blank/whitespace columns", () => {
  const map = { en: "", jp: "  ", chs: "", chs_t: "繁", kr: "" };
  // en chain: en -> jp -> chs_t -> ... ; en and jp are blank, chs_t wins.
  assert.equal(localizeText(map, "en"), "繁");
});

test("localizeText uses the Simplified Chinese chain chs -> chs_t -> en", () => {
  assert.equal(localizeText({ chs: "", chs_t: "T", en: "E" }, "chs"), "T");
  assert.equal(localizeText({ chs: "", chs_t: "", en: "E" }, "chs"), "E");
});

test("localizeText returns empty string for an all-blank or missing map", () => {
  assert.equal(localizeText({ en: "", jp: "" }, "en"), "");
  assert.equal(localizeText(undefined, "en"), "");
});

test("resolveResourceUrl returns a bare string URL for every language", () => {
  const url = "https://example/img.png";
  for (const code of ["en", "jp", "chs", "chs_t", "kr"]) {
    assert.equal(resolveResourceUrl(url, code), url);
  }
});

test("resolveResourceUrl applies the region/locale fallback chain", () => {
  // chs_t resolves cn (its issuer); chs prefers its own split then cn.
  assert.equal(resolveResourceUrl({ chs: "s", cn: "c" }, "chs_t"), "c");
  assert.equal(resolveResourceUrl({ chs: "s", cn: "c" }, "chs"), "s");
  // jp/kr fall back to the EN base.
  assert.equal(resolveResourceUrl({ jp: "j", en: "e" }, "kr"), "e");
});

test("resolveResourceUrl falls back to any remaining region for an exclusive asset", () => {
  // A cn-only asset is still shown (best effort) to a language with no entry.
  assert.equal(resolveResourceUrl({ cn: "c" }, "en"), "c");
  assert.equal(resolveResourceUrl({ cn: "c" }, "jp"), "c");
});

test("resolveResourceUrl returns empty string for empty values", () => {
  assert.equal(resolveResourceUrl("", "en"), "");
  assert.equal(resolveResourceUrl(null, "en"), "");
  assert.equal(resolveResourceUrl({}, "en"), "");
});

test("textMap reads <stem>_<code> columns into a language-agnostic map", () => {
  const row = { name_en: "A", name_jp: "B", name_chs: "C", name_chs_t: "D", name_kr: "E" };
  assert.deepEqual(textMap(row, "name"), {
    en: "A",
    jp: "B",
    chs: "C",
    chs_t: "D",
    kr: "E",
  });
  // Missing columns become empty strings, not undefined.
  assert.deepEqual(textMap({ desc_stature_en: "152cm" }, "desc_stature"), {
    en: "152cm",
    jp: "",
    chs: "",
    chs_t: "",
    kr: "",
  });
});
