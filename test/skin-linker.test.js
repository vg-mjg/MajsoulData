import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/assets/js/skin-linker.js", import.meta.url), "utf8");

function radio(id, checked = false) {
  return {
    id,
    checked,
    listeners: new Map(),
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
  };
}

function runHelper({ search, hash = "", radios, initSkin = "400101" }) {
  const calls = [];
  const root = {
    dataset: { initSkin },
    querySelectorAll(selector) {
      return selector === ".detail-skin-radio" ? radios : [];
    },
  };
  const window = {
    location: {
      href: `https://example.test/en/characters/200001/${search}${hash}`,
      pathname: "/en/characters/200001/",
      search,
      hash,
    },
    history: {
      replaceState(_state, _title, url) {
        calls.push(url);
      },
    },
  };
  const document = {
    readyState: "complete",
    querySelectorAll(selector) {
      return selector === "[data-skin-linker]" ? [root] : [];
    },
    addEventListener() {},
  };

  new Function("window", "document", source)(window, document);
  return { calls };
}

test("skin linker checks the linked skin from the query param", () => {
  const init = radio("skinRadio-400101", true);
  const linked = radio("skinRadio-400107", false);

  const { calls } = runHelper({ search: "?skin=400107", radios: [init, linked] });

  assert.equal(linked.checked, true);
  assert.deepEqual(calls, []);
});

test("skin linker writes selected skins to the query param", () => {
  const init = radio("skinRadio-400101", false);
  const alt = radio("skinRadio-400107", true);

  const { calls } = runHelper({ search: "?view=full&skin=400101", hash: "#ignored", radios: [init, alt] });
  assert.equal(init.checked, true);
  assert.deepEqual(calls, []);

  alt.checked = true;
  alt.listeners.get("change")();
  assert.equal(calls.at(-1), "/en/characters/200001/?view=full&skin=400107");

  init.checked = true;
  init.listeners.get("change")();
  assert.equal(calls.at(-1), "/en/characters/200001/?view=full&skin=400101");
});
