// Character skin query-param helper. The page remains CSS-driven: this only maps
// ?skin={id} to the matching skin radio, then keeps the URL in sync with radio
// changes.

const PARAM = "skin";
const RADIO_PREFIX = "skinRadio-";

function skinIdFromUrl() {
  return new URLSearchParams(window.location.search).get(PARAM) || "";
}

function findRadio(radios, skinId) {
  if (!skinId) return null;
  const radioId = `${RADIO_PREFIX}${skinId}`;
  return radios.find((radio) => radio.id === radioId) || null;
}

function replaceUrlFor(radio) {
  const skinId = radio.id.startsWith(RADIO_PREFIX) ? radio.id.slice(RADIO_PREFIX.length) : "";
  const url = new URL(window.location.href);
  url.hash = "";
  if (skinId) url.searchParams.set(PARAM, skinId);
  else url.searchParams.delete(PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function initRoot(root) {
  const radios = Array.from(root.querySelectorAll(".detail-skin-radio"));
  if (radios.length <= 1) return;

  const linkedRadio = findRadio(radios, skinIdFromUrl());
  if (linkedRadio) linkedRadio.checked = true;

  for (const radio of radios) {
    radio.addEventListener("change", () => {
      if (radio.checked) replaceUrlFor(radio);
    });
  }
}

function init() {
  document.querySelectorAll("[data-skin-linker]").forEach(initRoot);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
