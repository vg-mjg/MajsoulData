import { makeInitials } from "../../../utils.js";
import { loadCharacterImageSource } from "../../services/asset-image-loader.js";
import { loadAudioSource } from "../../services/asset-audio-loader.js";
import { scheduleVisibleTask } from "../../services/lazy-hydration.js";
import { loadItemDetail } from "../../services/item-detail-data.js";

const APP_TITLE = "Mahjong Soul Data";

let activeItemAudioElement = null;
let itemAudioRouteStopBound = false;

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function textOrDash(value) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
}

function hydrateIcon(placeholder, candidates, altText) {
  if (!Array.isArray(candidates) || candidates.length === 0) return;

  scheduleVisibleTask(placeholder, async () => {
    if (!placeholder.isConnected) return;

    const source = await loadCharacterImageSource(candidates);
    if (!source || !placeholder.isConnected) return;

    const image = createElement("img", "item-detail-icon");
    image.src = source;
    image.alt = altText;
    image.loading = "lazy";
    image.decoding = "async";
    placeholder.replaceWith(image);
  });
}

function hydrateOriginalImage(placeholder, candidates, altText) {
  if (!Array.isArray(candidates) || candidates.length === 0) return;
  scheduleVisibleTask(placeholder, async () => {
    if (!placeholder.isConnected) return;

    const source = await loadCharacterImageSource(candidates);
    if (!source || !placeholder.isConnected) return;

    const image = createElement("img", "item-detail-original-image");
    image.src = source;
    image.alt = altText;
    image.loading = "lazy";
    image.decoding = "async";
    placeholder.replaceWith(image);
  });
}

function stopActiveItemAudio() {
  if (!activeItemAudioElement) return;
  activeItemAudioElement.pause();
  activeItemAudioElement.removeAttribute("src");
  activeItemAudioElement.load();
  activeItemAudioElement = null;
}

function ensureItemAudioRouteStop() {
  if (itemAudioRouteStopBound) return;
  window.addEventListener("hashchange", stopActiveItemAudio);
  itemAudioRouteStopBound = true;
}

async function hydrateAudioPlayer(audioElement, audioCandidates) {
  if (!audioElement || !Array.isArray(audioCandidates) || audioCandidates.length === 0) return;
  const source = await loadAudioSource(audioCandidates);
  if (!source || !audioElement.isConnected) return;
  audioElement.src = source;
}

export async function renderItemDetailPage({
  viewRoot,
  getLanguage,
  itemId,
  goToItems,
}) {
  stopActiveItemAudio();
  ensureItemAudioRouteStop();

  viewRoot.innerHTML = `<div class="empty-result">Loading item detail...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const detail = await loadItemDetail(itemId, language);

    if (!detail) {
      document.title = `Item Not Found · Items · ${APP_TITLE}`;
      viewRoot.innerHTML = `<div class="empty-result">Item not found.</div>`;
      return;
    }

    document.title = `${detail.localized.name} · Items · ${APP_TITLE}`;

    const page = createElement("div", "item-detail-page");
    const topRow = createElement("div", "d-flex flex-wrap align-items-center gap-2 mb-1");
    const backButton = createElement("button", "btn btn-sm btn-outline-secondary character-filter-btn", "Back to items");
    backButton.type = "button";
    backButton.addEventListener("click", () => goToItems());
    topRow.append(backButton);
    page.append(topRow);

    const topLayout = createElement("section", "item-detail-top-layout");
    const imageColumn = createElement("div", "item-detail-illustration-column");
    const iconWrap = createElement("div", "item-detail-image-wrap");
    const iconPlaceholder = createElement("div", "item-detail-icon placeholder", makeInitials(detail.localized.name));
    iconWrap.append(iconPlaceholder);
    hydrateIcon(iconPlaceholder, detail.assets.icon, `${detail.localized.name} icon`);
    imageColumn.append(iconWrap);

    const infoColumn = createElement("section", "card border-0 shadow-sm detail-section item-detail-info-column");
    const infoBody = createElement("div", "card-body");
    infoBody.append(
      createElement("h1", "item-detail-name", detail.localized.name),
      createElement("p", "item-detail-description detail-preline", textOrDash(detail.localized.description)),
    );
    infoColumn.append(infoBody);

    topLayout.append(imageColumn, infoColumn);
    page.append(topLayout);

    const originalImageCandidates = Array.isArray(detail.assets.loadingOriginalImage) && detail.assets.loadingOriginalImage.length > 0
      ? detail.assets.loadingOriginalImage
      : (Array.isArray(detail.assets.portraitFrameOriginalImage) && detail.assets.portraitFrameOriginalImage.length > 0
        ? detail.assets.portraitFrameOriginalImage
        : (Array.isArray(detail.assets.tableclothOriginalImage) && detail.assets.tableclothOriginalImage.length > 0
          ? detail.assets.tableclothOriginalImage
          : (Array.isArray(detail.assets.backgroundOriginalImage) && detail.assets.backgroundOriginalImage.length > 0
            ? detail.assets.backgroundOriginalImage
            : (Array.isArray(detail.assets.tileFaceOriginalImage) && detail.assets.tileFaceOriginalImage.length > 0
              ? detail.assets.tileFaceOriginalImage
              : (Array.isArray(detail.assets.titleOriginalImage) ? detail.assets.titleOriginalImage : [])))));

    if (originalImageCandidates.length > 0) {
      const originalSection = createElement("section", "card border-0 shadow-sm item-detail-original-section" + (detail.kind === "loading_sprite" ? " loading-sprite-original-section" : ""));
      const originalBody = createElement("div", "card-body item-detail-original-body");
      const originalPlaceholder = createElement(
        "div",
        "item-detail-original-image placeholder",
        makeInitials(detail.localized.name),
      );
      originalBody.append(originalPlaceholder);
      hydrateOriginalImage(
        originalPlaceholder,
        originalImageCandidates,
        `${detail.localized.name} original image`,
      );
      originalSection.append(originalBody);
      page.append(originalSection);
    }

    if (Array.isArray(detail.assets.musicAudio) && detail.assets.musicAudio.length > 0) {
      const audioSection = createElement("section", "item-detail-audio-section");
      const player = createElement("audio", "item-detail-audio-player");
      player.controls = true;
      player.preload = "none";
      audioSection.append(player);
      void hydrateAudioPlayer(player, detail.assets.musicAudio);
      activeItemAudioElement = player;
      page.append(audioSection);
    }

    viewRoot.innerHTML = "";
    viewRoot.append(page);
  } catch (error) {
    stopActiveItemAudio();
    console.error(error);
    document.title = `Item Detail · Items · ${APP_TITLE}`;
    viewRoot.innerHTML = `<div class="empty-result">Failed to load item detail.</div>`;
  }
}
