// Voice audio player island. The detail page bakes each voice clip's resolved
// mirror audio URL onto a play/pause button (data-audio); this wires those
// buttons to one shared <audio> element and one shared volume slider per page.
// Only one clip plays at a time, and nothing is fetched but the mirror audio
// files themselves — no data tables, no asset map.

const PLAY = "Play";
const PAUSE = "Pause";
const VOLUME_KEY = "mj-voice-volume";
// Game voice files are mastered loud; the original SPA defaulted to 0.7.
const DEFAULT_VOLUME = 0.7;

function readStoredVolume() {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw === null || raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
  } catch {
    return null;
  }
}

function storeVolume(value) {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(value));
  } catch {
    // Private mode or disabled storage: volume just won't persist.
  }
}

function labelFor(button, verb) {
  const name = button.dataset.label || "voice clip";
  return `${verb} ${name}`;
}

function initIsland(root) {
  const buttons = Array.from(root.querySelectorAll(".cv-voice-play[data-audio]"));
  const slider = root.querySelector(".cv-volume-slider");
  if (buttons.length === 0) return;

  const audio = new Audio();
  audio.preload = "none";

  const stored = readStoredVolume();
  audio.volume = stored === null ? DEFAULT_VOLUME : stored;
  if (slider) {
    slider.value = String(audio.volume);
    slider.addEventListener("input", () => {
      const value = Number(slider.value);
      if (!Number.isFinite(value)) return;
      audio.volume = value;
      storeVolume(value);
    });
  }

  let current = null;

  // Mirror the original SPA: outline-secondary "Play" at rest, solid-secondary
  // "Pause" while this clip is the one playing.
  const setState = (button, playing) => {
    if (!button) return;
    button.textContent = playing ? PAUSE : PLAY;
    button.classList.toggle("btn-secondary", playing);
    button.classList.toggle("btn-outline-secondary", !playing);
    button.setAttribute("aria-label", labelFor(button, playing ? PAUSE : PLAY));
  };

  const clear = () => setState(current, false);
  const markPlaying = () => setState(current, true);

  audio.addEventListener("play", markPlaying);
  audio.addEventListener("pause", clear);
  audio.addEventListener("ended", clear);
  audio.addEventListener("error", clear);

  for (const button of buttons) {
    button.setAttribute("aria-label", labelFor(button, PLAY));
    button.addEventListener("click", () => {
      if (button === current) {
        if (audio.paused) void audio.play();
        else audio.pause();
        return;
      }
      clear();
      current = button;
      audio.src = button.dataset.audio;
      void audio.play();
    });
  }
}

function init() {
  document.querySelectorAll("[data-voice-island]").forEach(initIsland);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
