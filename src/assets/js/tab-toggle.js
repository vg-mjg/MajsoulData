// Shared query-param tab/filter toggle for static index pages.
// Roots opt in with:
//   data-tab-toggle-root
//   data-tab-toggle-param="tab|filter"
// Buttons use data-tab-toggle-button="key" and filterable cards use
// data-tab-toggle-card data-tab-toggle-key="key". The "all" key shows every card.

const DEFAULT_KEY = "all";

function keyFromUrl(param, keys) {
  const key = new URLSearchParams(window.location.search).get(param) || DEFAULT_KEY;
  return keys.has(key) ? key : DEFAULT_KEY;
}

function writeKeyToUrl(param, key) {
  const url = new URL(window.location.href);
  if (key === DEFAULT_KEY) url.searchParams.delete(param);
  else url.searchParams.set(param, key);
  window.history.replaceState({}, "", url);
}

function setButtonState(button, active) {
  button.classList.toggle("btn-secondary", active);
  button.classList.toggle("btn-outline-secondary", !active);
  button.setAttribute("aria-pressed", active ? "true" : "false");
  if (button.getAttribute("role") === "tab") {
    button.setAttribute("aria-selected", active ? "true" : "false");
  }
}

function initRoot(root) {
  const param = root.dataset.tabToggleParam || "tab";
  const buttons = Array.from(root.querySelectorAll("[data-tab-toggle-button]"));
  const cards = Array.from(root.querySelectorAll("[data-tab-toggle-card]"));
  const keys = new Set(buttons.map((button) => button.dataset.tabToggleButton));

  if (buttons.length === 0 || cards.length === 0) return;
  if (!keys.has(DEFAULT_KEY)) keys.add(DEFAULT_KEY);

  const activate = (key, persist = false) => {
    const nextKey = keys.has(key) ? key : DEFAULT_KEY;
    for (const card of cards) {
      card.hidden = nextKey !== DEFAULT_KEY && card.dataset.tabToggleKey !== nextKey;
    }
    for (const button of buttons) {
      setButtonState(button, button.dataset.tabToggleButton === nextKey);
    }
    if (persist) writeKeyToUrl(param, nextKey);
  };

  for (const button of buttons) {
    button.addEventListener("click", () => activate(button.dataset.tabToggleButton, true));
  }

  window.addEventListener("popstate", () => activate(keyFromUrl(param, keys)));
  activate(keyFromUrl(param, keys));
}

function init() {
  document.querySelectorAll("[data-tab-toggle-root]").forEach(initRoot);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
