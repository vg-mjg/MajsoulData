import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/assets/js/tab-toggle.js", import.meta.url), "utf8");

function element(dataset = {}, role = "") {
  const listeners = new Map();
  const classes = new Set(["btn-outline-secondary"]);
  return {
    dataset,
    hidden: false,
    attrs: role ? new Map([["role", role]]) : new Map(),
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      has(name) {
        return classes.has(name);
      },
    },
    setAttribute(name, value) {
      this.attrs.set(name, value);
    },
    getAttribute(name) {
      return this.attrs.get(name) || "";
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get("click")?.();
    },
  };
}

function runHelper({ param = "tab", search = "", role = "" } = {}) {
  const buttons = [
    element({ tabToggleButton: "all" }, role),
    element({ tabToggleButton: "standard" }, role),
    element({ tabToggleButton: "limited" }, role),
  ];
  const cards = [
    element({ tabToggleKey: "standard" }),
    element({ tabToggleKey: "limited" }),
  ];
  const root = {
    dataset: { tabToggleParam: param },
    querySelectorAll(selector) {
      if (selector === "[data-tab-toggle-button]") return buttons;
      if (selector === "[data-tab-toggle-card]") return cards;
      return [];
    },
  };
  const calls = [];
  const listeners = new Map();
  const window = {
    location: {
      href: `https://example.test/en/characters/${search}`,
      search,
    },
    history: {
      replaceState(_state, _title, url) {
        calls.push(url.toString());
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
  };
  const document = {
    readyState: "complete",
    querySelectorAll(selector) {
      return selector === "[data-tab-toggle-root]" ? [root] : [];
    },
    addEventListener() {},
  };

  new Function("window", "document", source)(window, document);
  return { buttons, cards, calls, window, listeners };
}

test("tab toggle selects the deep-linked key on load", () => {
  const { buttons, cards } = runHelper({ search: "?tab=limited", role: "tab" });

  assert.equal(cards[0].hidden, true);
  assert.equal(cards[1].hidden, false);
  assert.equal(buttons[2].classList.has("btn-secondary"), true);
  assert.equal(buttons[2].attrs.get("aria-pressed"), "true");
  assert.equal(buttons[2].attrs.get("aria-selected"), "true");
});

test("tab toggle writes the configured query param and restores on popstate", () => {
  const { buttons, cards, calls, window, listeners } = runHelper({ param: "filter", search: "?view=grid" });

  buttons[1].click();
  assert.equal(calls.at(-1), "https://example.test/en/characters/?view=grid&filter=standard");
  assert.equal(cards[0].hidden, false);
  assert.equal(cards[1].hidden, true);

  window.location.search = "?view=grid&filter=limited";
  window.location.href = "https://example.test/en/characters/?view=grid&filter=limited";
  listeners.get("popstate")();
  assert.equal(cards[0].hidden, true);
  assert.equal(cards[1].hidden, false);
});
