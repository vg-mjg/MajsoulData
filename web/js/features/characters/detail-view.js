import { loadCharacterDetail } from "../../services/character-detail-data.js";
import { loadCharacterImageSource } from "../../services/asset-image-loader.js";
import { loadAudioSource } from "../../services/asset-audio-loader.js";
import { loadCharacterStoryContent } from "../../services/character-story-loader.js";
import { mountCharacterSpinePreview } from "../../services/spine-viewer.js";
import { scheduleVisibleTask } from "../../services/lazy-hydration.js";
import { makeInitials } from "../../../utils.js";

const APP_TITLE = "Mahjong Soul Data";

let stopActiveVoicePlayback = null;

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

function createSection(title) {
  const section = createElement("section", "card border-0 shadow-sm detail-section");
  const body = createElement("div", "card-body");
  const heading = createElement("h6", "detail-section-title", title);
  body.append(heading);
  section.append(body);
  return { section, body, heading };
}

function appendProfileGrid(container, items) {
  const grid = createElement("div", "detail-profile-grid");
  for (const item of items) {
    const cell = createElement("div", "detail-profile-item");
    cell.append(
      createElement("div", "detail-profile-label", item.label),
      createElement("div", "detail-profile-value", textOrDash(item.value)),
    );
    grid.append(cell);
  }
  container.append(grid);
}

function hydrateImage(placeholder, imageCandidates, altText, imageClassName) {
  if (!imageCandidates || imageCandidates.length === 0) return;

  scheduleVisibleTask(placeholder, async () => {
    if (!placeholder.isConnected) return;

    const source = await loadCharacterImageSource(imageCandidates);
    if (!source || !placeholder.isConnected) return;

    const image = createElement("img", imageClassName);
    image.src = source;
    image.alt = altText;
    image.loading = "lazy";
    image.decoding = "async";
    placeholder.replaceWith(image);
  });
}

function pickStandCandidatesFromDetail(detail) {
  if (detail.assets.full.length > 0) return detail.assets.full;
  if (detail.assets.half.length > 0) return detail.assets.half;
  if (detail.assets.bighead.length > 0) return detail.assets.bighead;
  return detail.assets.smallhead;
}

function pickStandCandidatesFromSkin(skin) {
  if (skin.previewFull && skin.previewFull.length > 0) return skin.previewFull;
  if (skin.previewHalf && skin.previewHalf.length > 0) return skin.previewHalf;
  if (skin.previewBighead && skin.previewBighead.length > 0) return skin.previewBighead;
  if (skin.previewSmallhead && skin.previewSmallhead.length > 0) return skin.previewSmallhead;
  return skin.previewWaitingRoom || [];
}

function pickSkinThumbCandidates(skin) {
  if (skin.previewSmallhead && skin.previewSmallhead.length > 0) return skin.previewSmallhead;
  if (skin.previewBighead && skin.previewBighead.length > 0) return skin.previewBighead;
  if (skin.previewHalf && skin.previewHalf.length > 0) return skin.previewHalf;
  if (skin.previewFull && skin.previewFull.length > 0) return skin.previewFull;
  return skin.previewWaitingRoom || [];
}

function canRenderSkinLive2D(skin) {
  return Boolean(
    skin &&
    Number(skin.spineType) > 0 &&
    Array.isArray(skin.spineAssetPairs) &&
    skin.spineAssetPairs.length > 0,
  );
}

function renderContractItems(body, contractItems, onOpenItemDetail) {
  const entries = Array.isArray(contractItems) ? contractItems : [];
  if (entries.length === 0) {
    body.append(createElement("p", "text-secondary small mb-0", "No contract items."));
    return;
  }

  const grid = createElement("div", "detail-contract-grid");
  for (const entry of entries) {
    const itemId = Number(entry.itemId || 0);
    const nameText = String(entry.itemName || `#${entry.itemId || "?"}`);
    const button = createElement("button", "detail-contract-item");
    button.type = "button";
    button.title = nameText;
    button.disabled = itemId <= 0;
    button.addEventListener("click", () => {
      if (itemId <= 0) return;
      if (typeof onOpenItemDetail === "function") {
        onOpenItemDetail(itemId);
        return;
      }
      window.location.hash = `#/items/${itemId}`;
    });

    const thumbWrap = createElement("div", "detail-contract-thumb-wrap");

    const iconPlaceholder = createElement(
      "div",
      "detail-contract-icon placeholder",
      makeInitials(nameText),
    );
    hydrateImage(
      iconPlaceholder,
      entry.imageCandidates || [],
      `${nameText} icon`,
      "detail-contract-icon",
    );

    const name = createElement("div", "detail-contract-name", nameText);
    name.title = nameText;
    const countBadge = createElement("div", "detail-contract-count-badge", `x${Number(entry.count || 0)}`);

    thumbWrap.append(iconPlaceholder, countBadge);
    button.append(thumbWrap, name);
    grid.append(button);
  }

  body.append(grid);
}

function renderSkinSelector(body, detail, onSelectSkin) {
  const skins = Array.isArray(detail.skins) ? detail.skins : [];
  if (skins.length === 0) {
    body.append(createElement("p", "text-secondary small mb-0", "No skins."));
    return;
  }

  const grid = createElement("div", "detail-skin-grid");
  const buttons = [];

  const activeSkinId = Number(detail.profile.initSkin || skins[0].id || 0);
  const initialSkin = skins.find((skin) => Number(skin.id) === activeSkinId) || skins[0];

  for (const skin of skins) {
    const button = createElement("button", "detail-skin-card");
    button.type = "button";
    button.dataset.skinId = String(skin.id);
    if (Number(skin.id) === activeSkinId) {
      button.classList.add("active");
    }

    const thumbWrap = createElement("div", "detail-skin-thumb-wrap");
    const thumbPlaceholder = createElement("div", "detail-skin-thumb placeholder", makeInitials(skin.name));
    thumbWrap.append(thumbPlaceholder);
    hydrateImage(thumbPlaceholder, pickSkinThumbCandidates(skin), `${skin.name} thumbnail`, "detail-skin-thumb");
    if (Number(skin.spineType) > 0) {
      thumbWrap.append(createElement("span", "detail-skin-tag", "Live2D"));
    }
    button.append(thumbWrap);

    const name = createElement("div", "detail-skin-name", skin.name);
    button.append(name);

    button.addEventListener("click", () => {
      for (const target of buttons) {
        target.classList.toggle("active", target === button);
      }
      onSelectSkin(skin);
    });

    buttons.push(button);
    grid.append(button);
  }

  body.append(grid);
  if (typeof onSelectSkin === "function" && initialSkin) {
    onSelectSkin(initialSkin);
  }
}

function skinDescriptionText(skin) {
  if (!skin) return "No skin description.";
  const description = String(skin.description || "").trim();
  if (description) return description;
  const lockTips = String(skin.lockTips || "").trim();
  if (lockTips) return lockTips;
  return "No skin description.";
}

function renderStampGrid(body, stamps) {
  const entries = Array.isArray(stamps) ? stamps : [];
  if (entries.length === 0) {
    body.append(createElement("p", "text-secondary small mb-0", "No stamps."));
    return;
  }

  const grid = createElement("div", "detail-stamp-grid");
  for (const stamp of entries) {
    const placeholder = createElement("div", "detail-stamp-image placeholder", String(stamp.subId || "?"));
    placeholder.title = textOrDash(stamp.unlockDescription || `Stamp ${stamp.subId}`);
    hydrateImage(
      placeholder,
      stamp.imageCandidates || [],
      `Stamp ${stamp.subId}`,
      "detail-stamp-image",
    );

    grid.append(placeholder);
  }

  body.append(grid);
}

function createVoicePlaybackController() {
  const audio = new Audio();
  let activeButton = null;
  let activeKey = "";

  function setButtonState(button, state) {
    if (!button) return;
    const normalized = state === "playing" ? "playing" : "idle";
    button.dataset.state = normalized;
    button.textContent = normalized === "playing" ? "Pause" : "Play";
    button.classList.toggle("btn-secondary", normalized === "playing");
    button.classList.toggle("btn-outline-secondary", normalized !== "playing");
  }

  function clearActive() {
    if (activeButton) {
      setButtonState(activeButton, "idle");
    }
    activeButton = null;
    activeKey = "";
  }

  audio.addEventListener("ended", clearActive);

  async function toggle({ button, audioCandidates, key, label }) {
    if (!button || !Array.isArray(audioCandidates) || audioCandidates.length === 0) return;

    const normalizedKey = String(key || "");

    if (activeButton === button && !audio.paused) {
      audio.pause();
      setButtonState(button, "idle");
      return;
    }

    if (activeButton === button && audio.paused && audio.src) {
      try {
        await audio.play();
        setButtonState(button, "playing");
      } catch {
        setButtonState(button, "idle");
      }
      return;
    }

    if (activeButton && activeButton !== button) {
      setButtonState(activeButton, "idle");
    }

    activeButton = button;
    activeKey = normalizedKey;

    const source = await loadAudioSource(audioCandidates);
    if (activeButton !== button || activeKey !== normalizedKey) {
      return;
    }

    if (!source) {
      clearActive();
      return;
    }

    audio.src = source;
    audio.currentTime = 0;
    if (label) {
      audio.setAttribute("aria-label", label);
    }
    try {
      await audio.play();
      setButtonState(button, "playing");
    } catch {
      clearActive();
    }
  }

  return {
    toggle,
    stop() {
      audio.pause();
      clearActive();
    },
  };
}

function createPlayButton(disabled) {
  const button = createElement("button", "btn btn-sm btn-outline-secondary detail-audio-play-btn", "Play");
  button.type = "button";
  if (disabled) {
    button.disabled = true;
  }
  return button;
}

function isLobbyVoice(voice) {
  return String((voice && voice.path) || "").toLowerCase().includes("lobby");
}

function renderVoiceSubsection(body, titleText, entries, player, mode = "voice") {
  const title = createElement("h6", "detail-section-title detail-voice-subtitle", titleText);
  body.append(title);

  if (!entries || entries.length === 0) {
    body.append(createElement("p", "detail-voice-empty", "No data."));
    return;
  }

  const list = createElement("div", "detail-voice-list");
  for (const entry of entries) {
    const item = createElement("article", "detail-voice-item");
    const header = createElement("div", "detail-voice-header");
    const titleWrap = createElement("div", "detail-voice-title-wrap");

    let itemTitle = textOrDash(entry.name || entry.type);
    let itemDescription = textOrDash(entry.words);
    let keyPrefix = "voice";

    if (mode === "spot") {
      itemTitle = `Spot Voice ${textOrDash(entry.type)}`;
      itemDescription = textOrDash(entry.typeDescription || "Spot interaction voice");
      keyPrefix = "spot";
    }

    const name = createElement("h6", "detail-voice-title", itemTitle);
    const description = createElement("p", "detail-voice-words detail-preline", itemDescription);
    titleWrap.append(name, description);

    const playButton = createPlayButton(!entry.audioCandidates || entry.audioCandidates.length === 0);
    playButton.addEventListener("click", () => {
      void player.toggle({
        button: playButton,
        audioCandidates: entry.audioCandidates || [],
        key: `${keyPrefix}:${entry.type}:${entry.path}`,
        label: itemTitle,
      });
    });

    header.append(titleWrap, playButton);
    item.append(header);
    list.append(item);
  }

  body.append(list);
}

function renderCombinedVoiceSection(body, voices, spotVoices, player) {
  const voiceEntries = Array.isArray(voices) ? voices : [];
  const spotEntries = Array.isArray(spotVoices) ? spotVoices : [];
  const lobbyVoices = voiceEntries.filter((voice) => isLobbyVoice(voice));
  const inGameVoices = voiceEntries.filter((voice) => !isLobbyVoice(voice));

  renderVoiceSubsection(body, "Lobby", lobbyVoices, player, "voice");
  renderVoiceSubsection(body, "In-game", inGameVoices, player, "voice");
  renderVoiceSubsection(body, "Spot Voices", spotEntries, player, "spot");
}

function storyTypeLabel(story) {
  if (Number(story && story.type) === 1) return "Text";
  if (Number(story && story.type) === 2) return "Scenario";
  return `Type ${textOrDash(story && story.type)}`;
}

function storyUnlockLabel(story) {
  const levelLimit = Number(story && story.levelLimit);
  if (levelLimit > 0) {
    return `Bond Lv ${levelLimit}`;
  }
  return "Unlock Condition";
}

function renderStoryEndings(container, story, onOpenItemDetail) {
  const endings = Array.isArray(story && story.endings) ? story.endings : [];
  if (endings.length === 0) return;

  const heading = createElement("h6", "detail-story-subtitle", "Possible Endings");
  const list = createElement("div", "detail-story-endings");

  for (const ending of endings) {
    const item = createElement("div", "detail-story-ending");
    const title = createElement(
      "div",
      "detail-story-ending-title",
      textOrDash(ending.text || `Ending #${ending.id}`),
    );
    const rewardEntries = Array.isArray(ending.rewards) ? ending.rewards : [];
    if (rewardEntries.length > 0) {
      const rewardList = createElement("div", "detail-story-ending-reward-list");
      for (const reward of rewardEntries) {
        const itemId = Number(reward.itemId || 0);
        const chip = createElement(
          "button",
          "detail-story-reward-chip",
          `${textOrDash(reward.itemName || `#${itemId}`)} x${Number(reward.count || 0)}`,
        );
        chip.type = "button";
        chip.disabled = itemId <= 0;
        chip.addEventListener("click", () => {
          if (itemId <= 0) return;
          if (typeof onOpenItemDetail === "function") {
            onOpenItemDetail(itemId);
            return;
          }
          window.location.hash = `#/items/${itemId}`;
        });
        rewardList.append(chip);
      }
      item.append(title, rewardList);
    } else {
      const rewards = createElement("div", "detail-story-ending-reward", textOrDash(ending.rewardSummary));
      item.append(title, rewards);
    }
    list.append(item);
  }

  container.append(heading, list);
}

function renderStoryScenarioEntries(container, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    container.append(createElement("p", "detail-story-empty", "No script lines found."));
    return;
  }

  const script = createElement("div", "detail-story-script");
  for (const entry of entries) {
    const line = createElement("article", "detail-story-line");
    const top = createElement("div", "detail-story-line-top");
    top.append(
      createElement("span", "detail-story-line-id", `#${entry.sceneId}`),
      createElement("span", "detail-story-line-spot", `Spot ${entry.spotId}`),
    );
    line.append(top);

    if (entry.speaker) {
      line.append(createElement("div", "detail-story-speaker", entry.speaker));
    }

    if (entry.text) {
      line.append(createElement("p", "detail-story-text detail-preline", entry.text));
    }

    if (Array.isArray(entry.options) && entry.options.length > 0) {
      const optionsWrap = createElement("div", "detail-story-options");
      for (const option of entry.options) {
        const optionText = option.text || `Choice #${textOrDash(option.textId)}`;
        const optionMeta = option.eventParam > 0
          ? ` -> Spot ${option.eventParam}`
          : "";
        optionsWrap.append(createElement("div", "detail-story-option", `${optionText}${optionMeta}`));
      }
      line.append(optionsWrap);
    }

    if (Array.isArray(entry.conditionRewards) && entry.conditionRewards.length > 0) {
      const rewardsText = entry.conditionRewards.map((rewardId) => `Ending ${rewardId}`).join(", ");
      line.append(createElement("div", "detail-story-condition", rewardsText));
    }

    script.append(line);
  }

  container.append(script);
}

function renderStoryBrowser(body, stories, language, onOpenItemDetail) {
  const entries = Array.isArray(stories) ? stories : [];
  if (entries.length === 0) {
    body.append(createElement("p", "detail-voice-empty", "No story data."));
    return;
  }

  const layout = createElement("div", "detail-story-layout");
  const storyList = createElement("div", "list-group detail-story-list");
  const storyView = createElement("div", "detail-story-view");
  layout.append(storyList, storyView);
  body.append(layout);

  const buttons = [];
  let renderToken = 0;

  const openStory = async (story, button) => {
    for (const target of buttons) {
      target.classList.toggle("active", target === button);
    }

    const token = ++renderToken;
    storyView.innerHTML = "";

    const title = createElement("h5", "detail-story-title", textOrDash(story.name));
    const meta = createElement("div", "detail-story-meta");
    meta.append(
      createElement("span", "badge text-bg-light", storyTypeLabel(story)),
      createElement("span", "badge text-bg-light", storyUnlockLabel(story)),
    );
    if (Number(story.isMarried) > 0) {
      meta.append(createElement("span", "badge text-bg-light", "Oath"));
    }

    const lockTips = createElement("p", "detail-story-locktips", textOrDash(story.lockTips));
    storyView.append(title, meta, lockTips);

    if (story.hasInlineContent) {
      storyView.append(createElement("p", "detail-story-inline detail-preline", textOrDash(story.content)));
    }

    renderStoryEndings(storyView, story, onOpenItemDetail);

    if (!story.hasScenarioContent) {
      return;
    }

    const remoteTitle = createElement("h6", "detail-story-subtitle", "Scenario Script");
    const loading = createElement("p", "detail-story-empty", "Loading script...");
    storyView.append(remoteTitle, loading);

    const remoteStory = await loadCharacterStoryContent(story.contentPath, language);
    if (token !== renderToken || !storyView.isConnected) {
      return;
    }

    loading.remove();
    if (!remoteStory || !Array.isArray(remoteStory.entries)) {
      storyView.append(createElement("p", "detail-story-empty", "Failed to load scenario script."));
      return;
    }

    const summary = remoteStory.summary || {};
    const summaryText = `Spots ${textOrDash(summary.spotCount)}, Scenes ${textOrDash(summary.sceneCount)}, Choices ${textOrDash(summary.chooseSceneCount)}, Endings ${textOrDash(summary.endSceneCount)}`;
    storyView.append(createElement("p", "detail-story-summary", summaryText));
    renderStoryScenarioEntries(storyView, remoteStory.entries);
  };

  for (const story of entries) {
    const label = `${textOrDash(story.queue)}. ${textOrDash(story.name)}`;
    const button = createElement("button", "list-group-item list-group-item-action detail-story-item", label);
    button.type = "button";
    button.addEventListener("click", () => {
      void openStory(story, button);
    });
    buttons.push(button);
    storyList.append(button);
  }

  if (buttons.length > 0) {
    void openStory(entries[0], buttons[0]);
  }
}

function renderVoicesStorySection(body, detail, voicePlayer, language, onOpenItemDetail) {
  const switchWrap = createElement("div", "detail-content-switch");
  const voicesButton = createElement("button", "btn btn-sm btn-secondary", "Voices");
  voicesButton.type = "button";
  const storyButton = createElement("button", "btn btn-sm btn-outline-secondary", "Story");
  storyButton.type = "button";
  switchWrap.append(voicesButton, storyButton);

  const panel = createElement("div", "detail-content-switch-panel");
  body.append(switchWrap, panel);

  const setMode = (mode) => {
    const showVoices = mode === "voices";
    voicesButton.className = `btn btn-sm ${showVoices ? "btn-secondary" : "btn-outline-secondary"}`;
    storyButton.className = `btn btn-sm ${showVoices ? "btn-outline-secondary" : "btn-secondary"}`;
    voicesButton.disabled = showVoices;
    storyButton.disabled = !showVoices;

    panel.innerHTML = "";
    if (showVoices) {
      renderCombinedVoiceSection(panel, detail.voices, detail.spotVoices, voicePlayer);
      return;
    }

    voicePlayer.stop();
    renderStoryBrowser(panel, detail.stories, language, onOpenItemDetail);
  };

  voicesButton.addEventListener("click", () => setMode("voices"));
  storyButton.addEventListener("click", () => setMode("story"));
  setMode("voices");
}

export async function renderCharacterDetailPage({
  viewRoot,
  getLanguage,
  characterId,
  goToCharacters,
  onOpenItemDetail,
}) {
  if (typeof stopActiveVoicePlayback === "function") {
    stopActiveVoicePlayback();
    stopActiveVoicePlayback = null;
  }

  viewRoot.innerHTML = `<div class="empty-result">Loading character detail...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const detail = await loadCharacterDetail(characterId, language);

    if (!detail) {
      document.title = `Character Not Found · Characters · ${APP_TITLE}`;
      viewRoot.innerHTML = `<div class="empty-result">Character not found.</div>`;
      return;
    }

    document.title = `${detail.localized.name} · Characters · ${APP_TITLE}`;

    const voicePlayer = createVoicePlaybackController();

    const page = createElement("div", "character-detail-page");

    const topRow = createElement("div", "d-flex flex-wrap align-items-center gap-2 mb-1");
    const backButton = createElement("button", "btn btn-sm btn-outline-secondary character-filter-btn", "Back to characters");
    backButton.type = "button";
    backButton.addEventListener("click", () => goToCharacters());
    topRow.append(backButton);
    page.append(topRow);

    const topLayout = createElement("section", "detail-top-layout");
    const illustrationColumn = createElement("div", "detail-illustration-column");
    const illustrationWrapper = createElement("div", "detail-full-image-wrap");
    const illustrationPlaceholder = createElement(
      "div",
      "detail-full-image placeholder",
      makeInitials(detail.localized.name),
    );
    const spineHost = createElement("div", "detail-spine-host d-none");
    const illustrationImage = createElement("img", "detail-full-image d-none");
    illustrationWrapper.append(illustrationPlaceholder, spineHost, illustrationImage);
    const live2dControls = createElement("div", "detail-live2d-controls d-none");
    const live2dToggleButton = createElement(
      "button",
      "btn btn-sm btn-outline-secondary detail-live2d-toggle",
      "Play Live2D",
    );
    live2dToggleButton.type = "button";
    live2dControls.append(live2dToggleButton);
    illustrationColumn.append(illustrationWrapper, live2dControls);
    topLayout.append(illustrationColumn);

    let illustrationRequestToken = 0;
    let activeSpinePreview = null;
    let selectedSkin = null;
    let live2dActive = false;
    let live2dBusy = false;

    const clearSpinePreview = () => {
      if (activeSpinePreview && typeof activeSpinePreview.destroy === "function") {
        activeSpinePreview.destroy();
      }
      activeSpinePreview = null;
      spineHost.classList.add("d-none");
      spineHost.replaceChildren();
    };

    const setStaticIllustration = async (
      candidates,
      label,
      token = ++illustrationRequestToken,
      resetSpinePreview = true,
    ) => {
      if (resetSpinePreview) {
        clearSpinePreview();
      }
      const source = await loadCharacterImageSource(candidates);
      if (token !== illustrationRequestToken) return false;

      if (!source) {
        illustrationImage.removeAttribute("src");
        illustrationImage.classList.add("d-none");
        illustrationPlaceholder.classList.remove("d-none");
        return true;
      }

      illustrationImage.src = source;
      illustrationImage.alt = label;
      illustrationImage.classList.remove("d-none");
      illustrationPlaceholder.classList.add("d-none");
      return true;
    };

    const setSpineIllustration = async (skin, token) => {
      spineHost.classList.remove("d-none");
      try {
        const preview = await mountCharacterSpinePreview({
          host: spineHost,
          spineAssetPairs: Array.isArray(skin && skin.spineAssetPairs) ? skin.spineAssetPairs : [],
          resourceManifest: skin && skin.spineResourceManifest ? skin.spineResourceManifest : null,
        });

        if (token !== illustrationRequestToken) {
          if (preview && typeof preview.destroy === "function") {
            preview.destroy();
          }
          return null;
        }

        if (!preview) {
          spineHost.classList.add("d-none");
          return false;
        }

        activeSpinePreview = preview;
        spineHost.classList.remove("d-none");
        illustrationPlaceholder.classList.add("d-none");
        return true;
      } catch (error) {
        console.warn("Failed to mount spine preview.", error);
        if (token !== illustrationRequestToken) {
          return null;
        }
        spineHost.classList.add("d-none");
        return false;
      }
    };

    const updateLive2dControls = () => {
      if (!canRenderSkinLive2D(selectedSkin)) {
        live2dControls.classList.add("d-none");
        live2dToggleButton.disabled = true;
        live2dToggleButton.className = "btn btn-sm btn-outline-secondary detail-live2d-toggle";
        live2dToggleButton.textContent = "Play Live2D";
        return;
      }

      live2dControls.classList.remove("d-none");
      if (live2dBusy) {
        live2dToggleButton.disabled = true;
        live2dToggleButton.className = "btn btn-sm btn-outline-secondary detail-live2d-toggle";
        live2dToggleButton.textContent = "Loading Live2D...";
        return;
      }

      live2dToggleButton.disabled = false;
      if (live2dActive) {
        live2dToggleButton.className = "btn btn-sm btn-secondary detail-live2d-toggle";
        live2dToggleButton.textContent = "Show Illustration";
      } else {
        live2dToggleButton.className = "btn btn-sm btn-outline-secondary detail-live2d-toggle";
        live2dToggleButton.textContent = "Play Live2D";
      }
    };

    const renderStaticIllustration = async (skin) => {
      const token = ++illustrationRequestToken;
      clearSpinePreview();
      illustrationImage.removeAttribute("src");
      illustrationImage.classList.add("d-none");
      illustrationPlaceholder.classList.remove("d-none");

      const skinName = skin && skin.name ? skin.name : detail.localized.name;
      const label = `${detail.localized.name} - ${skinName}`;
      const staticCandidates = skin
        ? pickStandCandidatesFromSkin(skin)
        : pickStandCandidatesFromDetail(detail);

      await setStaticIllustration(staticCandidates, label, token, false);
    };

    const playLive2dIllustration = async (skin) => {
      if (!canRenderSkinLive2D(skin)) return false;

      const token = ++illustrationRequestToken;
      clearSpinePreview();
      illustrationImage.removeAttribute("src");
      illustrationImage.classList.add("d-none");
      illustrationPlaceholder.classList.remove("d-none");

      const mounted = await setSpineIllustration(skin, token);
      if (mounted === null) return false;
      if (mounted) return true;

      await setStaticIllustration(
        pickStandCandidatesFromSkin(skin),
        `${detail.localized.name} - ${skin.name || detail.localized.name}`,
        token,
        false,
      );
      return false;
    };

    const setIllustrationFromSkin = async (skin) => {
      selectedSkin = skin || null;
      live2dActive = false;
      updateLive2dControls();
      await renderStaticIllustration(selectedSkin);
    };

    live2dToggleButton.addEventListener("click", () => {
      if (!canRenderSkinLive2D(selectedSkin) || live2dBusy) return;

      void (async () => {
        const skinSnapshot = selectedSkin;
        if (!skinSnapshot) return;

        live2dBusy = true;
        updateLive2dControls();
        try {
          if (live2dActive) {
            await renderStaticIllustration(skinSnapshot);
            if (selectedSkin && Number(selectedSkin.id) === Number(skinSnapshot.id)) {
              live2dActive = false;
            }
            return;
          }

          const mounted = await playLive2dIllustration(skinSnapshot);
          if (selectedSkin && Number(selectedSkin.id) === Number(skinSnapshot.id)) {
            live2dActive = mounted;
          }
        } finally {
          live2dBusy = false;
          updateLive2dControls();
        }
      })();
    });

    stopActiveVoicePlayback = () => {
      voicePlayer.stop();
      illustrationRequestToken += 1;
      clearSpinePreview();
      live2dActive = false;
      live2dBusy = false;
      updateLive2dControls();
      stopActiveVoicePlayback = null;
    };

    void setStaticIllustration(
      pickStandCandidatesFromDetail(detail),
      `${detail.localized.name} stand illustration`,
    );

    const infoColumn = createElement("div", "detail-info-column");

    const profileSection = createSection("Profile");
    profileSection.section.classList.add("detail-profile-section");
    const profileName = createElement("h1", "detail-character-name mb-2", detail.localized.name);
    const profileDescription = createElement(
      "p",
      "detail-character-description detail-preline",
      textOrDash(detail.localized.description),
    );
    profileSection.body.insertBefore(profileName, profileSection.heading);
    profileSection.body.insertBefore(profileDescription, profileSection.heading);
    appendProfileGrid(profileSection.body, [
      { label: "Stature", value: detail.localized.stature },
      { label: "Birth", value: detail.localized.birth },
      { label: "Age", value: detail.localized.age },
      { label: "Blood Type", value: detail.localized.bloodType },
      { label: "CV", value: detail.localized.cv },
      { label: "Hobby", value: detail.localized.hobby },
    ]);
    const skinsTitle = createElement("h6", "detail-section-title detail-skins-title", "Skins");
    profileSection.body.append(skinsTitle);
    const skinDescription = createElement("p", "detail-skin-description detail-preline", "No skin description.");
    renderSkinSelector(profileSection.body, detail, (skin) => {
      void setIllustrationFromSkin(skin);
      skinDescription.textContent = skinDescriptionText(skin);
    });
    profileSection.body.append(skinDescription);
    const stampsTitle = createElement("h6", "detail-section-title detail-stamps-title", "Stamps");
    profileSection.body.append(stampsTitle);
    renderStampGrid(profileSection.body, detail.emojis);
    const contractTitle = createElement("h6", "detail-section-title detail-contract-title", "Bond Requirements");
    profileSection.body.append(contractTitle);
    renderContractItems(profileSection.body, detail.profile.contractItems || [], onOpenItemDetail);
    infoColumn.append(profileSection.section);

    topLayout.append(infoColumn);
    page.append(topLayout);

    const voicesSection = createSection("");
    voicesSection.heading.remove();
    renderVoicesStorySection(voicesSection.body, detail, voicePlayer, language, onOpenItemDetail);
    page.append(voicesSection.section);

    viewRoot.innerHTML = "";
    viewRoot.append(page);
  } catch (error) {
    console.error(error);
    if (typeof stopActiveVoicePlayback === "function") {
      stopActiveVoicePlayback();
    }
    document.title = `Character Detail · Characters · ${APP_TITLE}`;
    viewRoot.innerHTML = `<div class="empty-result">Failed to load character detail.</div>`;
  }
}
