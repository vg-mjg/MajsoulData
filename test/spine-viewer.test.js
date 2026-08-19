import test from "node:test";
import assert from "node:assert/strict";

import { installDom, installSpineRuntime, makeElement } from "./helpers/spine-stubs.js";

const BACKGROUND_SKEL = "https://mirror.test/spine/1/bg.skel.txt";
const OVERLAY_SKEL = "https://mirror.test/spine/2/overlay.skel.txt";

// A composite model: layer 1 is a background holding a single long idle, layer 2
// carries the real animation set.
const COMPOSITE = {
  [BACKGROUND_SKEL]: [{ name: "idle", duration: 8 }],
  [OVERLAY_SKEL]: [
    { name: "idle", duration: 6 },
    { name: "attack", duration: 4 },
    { name: "greeting", duration: 5 },
    { name: "click", duration: 3 },
    { name: "celebrate", duration: 7 },
  ],
};

// Deliberately out of draw order, so the viewer's own sort has to fix it.
const LAYERS = [
  { name: "2", skeletonUrl: OVERLAY_SKEL, atlasUrl: "https://mirror.test/spine/2/overlay.atlas.txt" },
  { name: "1", skeletonUrl: BACKGROUND_SKEL, atlasUrl: "https://mirror.test/spine/1/bg.atlas.txt" },
];

async function mount(layerAnimations, layers = LAYERS) {
  installDom();
  const runtime = installSpineRuntime(layerAnimations);
  const { mountCharacterSpinePreview } = await import("../src/assets/js/spine-viewer.js");

  const host = makeElement("div");
  const preview = await mountCharacterSpinePreview({ host, layers });

  const controls = host.querySelector(".spine-viewer-controls");
  const select = controls.querySelector(".spine-viewer-animation-select");
  const fill = controls.querySelector(".spine-viewer-timeline-fill");
  const timeline = controls.querySelector(".spine-viewer-timeline");
  const canvas = runtime.lastCanvas;

  return {
    preview,
    runtime,
    select,
    fill,
    timeline,
    canvas,
    // Layers are pushed in draw order, so state 0 is the background.
    background: runtime.states[0],
    overlay: runtime.states[1],
    choose(name) {
      select.value = name;
      select.dispatch("change", { target: select });
    },
  };
}

test("animation list is the union across layers, in draw order", async () => {
  const { select } = await mount(COMPOSITE);

  assert.deepEqual(
    select.options.map((option) => option.value),
    ["idle", "attack", "greeting", "click", "celebrate"],
  );
  assert.equal(select.disabled, false);
  assert.equal(select.value, "idle");
});

test("a layer-only animation plays on that layer and leaves the background looping", async () => {
  const { choose, background, overlay } = await mount(COMPOSITE);

  choose("attack");

  assert.equal(overlay.getCurrent().animation.name, "attack");
  assert.equal(background.getCurrent().animation.name, "idle");
});

test("timeline duration comes from the layer holding the selected animation", async () => {
  const { choose, canvas, fill } = await mount(COMPOSITE);

  choose("attack");
  canvas.app.update(canvas, 1);
  canvas.app.render(canvas);

  // 1s of a 4s attack — not 1s of the background's 8s idle.
  assert.equal(fill.style.width, `${(1 / 4) * 100}%`);
});

test("a background lacking the default animation falls back to its own", async () => {
  const backgroundOnlyLoop = {
    [BACKGROUND_SKEL]: [{ name: "bg_loop", duration: 12 }],
    [OVERLAY_SKEL]: [
      { name: "idle", duration: 6 },
      { name: "attack", duration: 4 },
    ],
  };

  const { select, background, overlay } = await mount(backgroundOnlyLoop);

  assert.deepEqual(
    select.options.map((option) => option.value),
    ["bg_loop", "idle", "attack"],
  );
  assert.equal(select.value, "idle");
  assert.equal(overlay.getCurrent().animation.name, "idle");
  // Without the fallback this layer would hold a setup pose and never animate.
  assert.equal(background.getCurrent().animation.name, "bg_loop");
});

test("scrubbing seeks only the layers holding the selected animation", async () => {
  const { choose, timeline, background, overlay } = await mount(COMPOSITE);

  choose("attack");
  background.time = 0;

  // Half way along a 400px timeline: the overlay seeks to 2s of its 4s attack,
  // the background is skipped rather than throwing "Animation not found".
  timeline.dispatch("mousedown", { clientX: 200 });

  assert.equal(overlay.time, 2);
  assert.equal(background.time, 0);
  assert.equal(background.getCurrent().animation.name, "idle");
});
