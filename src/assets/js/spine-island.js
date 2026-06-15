// Per-skin Spine viewer island. The detail page bakes a single JSON object keyed
// by skin id into the hero stack. Each Live2D skin button lazily mounts that
// skin's layers into the selected hero frame, then skin radio changes tear the
// preview down and reveal the static image again.

import { mountCharacterSpinePreview } from "./spine-viewer.js";

const ACTIVATE_LABEL = "View animated model";
const HIDE_LABEL = "Hide animated model";
const LOADING_LABEL = "Loading…";

function parseSkinLayers(dataEl) {
  try {
    const sets = JSON.parse(dataEl.textContent || "{}");
    return sets && typeof sets === "object" && !Array.isArray(sets) ? sets : {};
  } catch {
    return {};
  }
}

function findBySkin(root, attr, skinId) {
  return Array.from(root.querySelectorAll(`[${attr}]`)).find(
    (element) => element.getAttribute(attr) === String(skinId),
  );
}

function initSkinStack(root) {
  const dataEl = root.querySelector(".detail-spine-data");
  if (!dataEl) return;

  const layersBySkin = parseSkinLayers(dataEl);
  const buttons = Array.from(root.querySelectorAll("[data-spine-play]"));
  if (buttons.length === 0) return;

  const article = root.closest(".character-detail-page");
  let active = null;
  let mountToken = 0;

  const resetButtons = () => {
    for (const button of buttons) {
      button.textContent = ACTIVATE_LABEL;
      button.disabled = false;
    }
  };

  const teardown = () => {
    mountToken += 1;
    if (active?.preview && typeof active.preview.destroy === "function") {
      active.preview.destroy();
    }
    active = null;
    for (const host of root.querySelectorAll("[data-spine-host]")) {
      host.replaceChildren();
      host.classList.remove("detail-spine-host-active");
    }
    for (const frame of root.querySelectorAll(".detail-skin-hero-frame-spine-active")) {
      frame.classList.remove("detail-skin-hero-frame-spine-active");
    }
    resetButtons();
  };

  const mount = async (skinId, button) => {
    const layers = Array.isArray(layersBySkin[String(skinId)]) ? layersBySkin[String(skinId)] : [];
    const host = findBySkin(root, "data-spine-host", skinId);
    const frame = findBySkin(root, "data-skin-hero", skinId);
    if (!host || !frame || layers.length === 0) return;

    teardown();
    const token = ++mountToken;
    host.classList.add("detail-spine-host-active");
    frame.classList.add("detail-skin-hero-frame-spine-active");
    button.textContent = LOADING_LABEL;
    button.disabled = true;

    try {
      const preview = await mountCharacterSpinePreview({ host, layers });
      if (token !== mountToken) {
        if (preview && typeof preview.destroy === "function") preview.destroy();
        return;
      }
      active = { skinId: String(skinId), preview };
      button.textContent = HIDE_LABEL;
      button.disabled = false;
    } catch (error) {
      console.warn("Failed to mount spine viewer.", error);
      if (token === mountToken) teardown();
    }
  };

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const skinId = String(button.dataset.spinePlay || "");
      if (active?.skinId === skinId) {
        teardown();
        return;
      }
      void mount(skinId, button);
    });
  }

  if (article) {
    article.querySelectorAll(".detail-skin-radio").forEach((radio) => {
      radio.addEventListener("change", teardown);
    });
  }
}

function init() {
  document.querySelectorAll("[data-spine-skins]").forEach(initSkinStack);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
