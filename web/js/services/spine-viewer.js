const SPINE_SCRIPT_URLS = [
  "https://cdn.jsdelivr.net/npm/@esotericsoftware/spine-player@4.2.102/dist/iife/spine-player.min.js",
  "https://unpkg.com/@esotericsoftware/spine-player@4.2.102/dist/iife/spine-player.min.js",
];

const SPINE_PREMULTIPLIED_ALPHA = false;
const SPINE_ATLAS_METADATA_TIMEOUT_MS = 2500;

let runtimePromise = null;
const atlasPremultipliedAlphaCache = new Map();

function hasSpineRuntime() {
  return Boolean(window.spine && window.spine.SpineCanvas);
}

function hasScriptTag(source) {
  return Array.from(document.querySelectorAll("script")).some((script) => script.src === source);
}

function loadScript(source) {
  if (hasScriptTag(source)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error(`Failed to load script: ${source}`)));
    document.head.append(script);
  });
}

async function loadFirstAvailable(loader, sources) {
  let lastError = null;
  for (const source of sources || []) {
    try {
      await loader(source);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  throw new Error("No source configured.");
}

async function ensureSpineRuntime() {
  if (hasSpineRuntime()) {
    return window.spine;
  }

  if (!runtimePromise) {
    runtimePromise = (async () => {
      await loadFirstAvailable(loadScript, SPINE_SCRIPT_URLS);
      if (!hasSpineRuntime()) {
        throw new Error("Spine runtime is unavailable after script load.");
      }
      return window.spine;
    })().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }

  return runtimePromise;
}

function layerDrawWeight(name) {
  const numeric = Number(name);
  return Number.isFinite(numeric) ? numeric : 99;
}

async function readAtlasPremultipliedAlpha(atlasUrl) {
  if (!atlasUrl) return SPINE_PREMULTIPLIED_ALPHA;
  if (atlasPremultipliedAlphaCache.has(atlasUrl)) {
    return atlasPremultipliedAlphaCache.get(atlasUrl);
  }

  let result = SPINE_PREMULTIPLIED_ALPHA;
  try {
    const response = await Promise.race([
      fetch(atlasUrl, { cache: "force-cache", mode: "cors" }),
      new Promise((resolve) => window.setTimeout(() => resolve(null), SPINE_ATLAS_METADATA_TIMEOUT_MS)),
    ]);
    if (response && response.ok) {
      const text = await response.text();
      const top = String(text || "").split(/\r?\n/).slice(0, 32).join("\n");
      const match = top.match(/\bpma\s*:\s*(true|false)\b/i);
      if (match) result = String(match[1]).toLowerCase() === "true";
    }
  } catch {
    result = SPINE_PREMULTIPLIED_ALPHA;
  }

  atlasPremultipliedAlphaCache.set(atlasUrl, result);
  return result;
}

async function createWebGLSpineViewer(host, resolvedLayers) {
  const runtime = window.spine;
  if (!runtime || !runtime.SpineCanvas) throw new Error("Spine runtime unavailable.");

  const loadingEl = document.createElement("div");
  loadingEl.className = "spine-viewer-loading";
  loadingEl.innerHTML = '<div class="spine-viewer-spinner"></div>';
  host.replaceChildren(loadingEl);

  if (resolvedLayers.length === 0) throw new Error("No accessible spine layers found.");
  const premultipliedAlpha = resolvedLayers[0].pma;

  const wrapper = document.createElement("div");
  wrapper.className = "spine-viewer-wrapper";

  const canvasContainer = document.createElement("div");
  canvasContainer.className = "spine-viewer-canvas-container";

  const canvas = document.createElement("canvas");

  const loadingOverlay = document.createElement("div");
  loadingOverlay.className = "spine-viewer-loading-overlay";
  loadingOverlay.innerHTML = '<div class="spine-viewer-spinner"></div>';

  const controlsEl = document.createElement("div");
  controlsEl.className = "spine-viewer-controls";
  controlsEl.innerHTML = `
    <div class="spine-viewer-timeline">
      <div class="spine-viewer-timeline-fill"></div>
    </div>
    <div class="spine-viewer-controls-row">
      <button class="spine-viewer-button spine-viewer-play-button">&#9646;&#9646;</button>
      <select class="spine-viewer-animation-select" disabled><option>Loading...</option></select>
      <button class="spine-viewer-button spine-viewer-fullscreen-button" title="Toggle fullscreen">&#x26F6;</button>
    </div>
  `;

  canvasContainer.append(canvas, loadingOverlay);
  wrapper.append(canvasContainer, controlsEl);
  host.replaceChildren(wrapper);

  const timelineEl = controlsEl.querySelector(".spine-viewer-timeline");
  const timelineFillEl = controlsEl.querySelector(".spine-viewer-timeline-fill");
  const btnPlay = controlsEl.querySelector(".spine-viewer-play-button");
  const animSelect = controlsEl.querySelector(".spine-viewer-animation-select");
  const btnFullscreen = controlsEl.querySelector(".spine-viewer-fullscreen-button");

  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });
  wrapper.addEventListener("fullscreenchange", () => {
    btnFullscreen.classList.toggle("spine-viewer-button-active", !!document.fullscreenElement);
  });

  return new Promise((resolve, reject) => {
    let playing = true;
    let layers = [];
    let playTime = 0;
    let initialCamX = 0, initialCamY = 0, initialCamZoom = 1;
    let spineCanvasInstance = null;

    const controller = {
      destroy() {
        if (spineCanvasInstance) {
          spineCanvasInstance.dispose();
          spineCanvasInstance = null;
        }
        host.replaceChildren();
      },
    };

    function setAnimation(name) {
      for (const layer of layers) {
        try { layer.state.setAnimation(0, name, true); } catch (_) { }
      }
    }

    function getAnimDuration() {
      return layers[0]?.state.getCurrent(0)?.animation?.duration ?? 0;
    }

    function seekToFraction(fraction) {
      const duration = getAnimDuration();
      if (!duration) return;
      fraction = Math.max(0, Math.min(1, fraction));
      const targetTime = fraction * duration;
      const name = animSelect.value;
      for (const layer of layers) {
        layer.state.setAnimation(0, name, true);
        layer.state.update(targetTime);
        layer.state.apply(layer.skeleton);
        layer.skeleton.updateWorldTransform(runtime.Physics.update);
      }
      playTime = targetTime;
    }

    function resetCamera(cam) {
      cam.position.set(initialCamX, initialCamY, 0);
      cam.zoom = initialCamZoom;
      cam.update();
    }

    function setupTimeline() {
      let scrubbing = false;
      function scrubAt(clientX) {
        seekToFraction((clientX - timelineEl.getBoundingClientRect().left) / timelineEl.clientWidth);
      }
      timelineEl.addEventListener("mousedown", (e) => { scrubbing = true; scrubAt(e.clientX); });
      window.addEventListener("mousemove", (e) => { if (scrubbing) scrubAt(e.clientX); });
      window.addEventListener("mouseup", () => { scrubbing = false; });
      timelineEl.addEventListener("touchstart", (e) => { e.preventDefault(); scrubbing = true; scrubAt(e.touches[0].clientX); }, { passive: false });
      window.addEventListener("touchmove", (e) => { if (scrubbing) scrubAt(e.touches[0].clientX); });
      window.addEventListener("touchend", () => { scrubbing = false; });
    }

    function setupCameraControls(el, cam) {
      const ZOOM_FACTOR = 1.1;
      let dragging = false;
      let dragStartX = 0, dragStartY = 0, dragStartCamX = 0, dragStartCamY = 0, pinchDist = 0;

      function zoomAt(screenX, screenY, factor) {
        const w = el.clientWidth, h = el.clientHeight;
        const before = cam.screenToWorld(new runtime.Vector3(screenX, screenY), w, h);
        cam.zoom /= factor;
        cam.update();
        const after = cam.screenToWorld(new runtime.Vector3(screenX, screenY), w, h);
        cam.position.add(before.sub(after));
        cam.update();
      }

      el.addEventListener("wheel", (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
        const rect = el.getBoundingClientRect();
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
      }, { passive: false });

      el.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        dragging = true;
        dragStartX = e.clientX; dragStartY = e.clientY;
        dragStartCamX = cam.position.x; dragStartCamY = cam.position.y;
        el.style.cursor = "grabbing";
      });
      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const w = el.clientWidth, h = el.clientHeight;
        const origin = cam.screenToWorld(new runtime.Vector3(0, 0), w, h);
        const delta = cam.screenToWorld(
          new runtime.Vector3(e.clientX - dragStartX, e.clientY - dragStartY), w, h,
        ).sub(origin);
        cam.position.set(dragStartCamX - delta.x, dragStartCamY - delta.y, 0);
        cam.update();
      });
      window.addEventListener("mouseup", () => {
        dragging = false;
        el.style.cursor = "";
      });

      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          dragging = true;
          dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
          dragStartCamX = cam.position.x; dragStartCamY = cam.position.y;
        } else if (e.touches.length === 2) {
          dragging = false;
          pinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
        }
      }, { passive: false });

      el.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        if (dragging && e.touches.length === 1) {
          const w = el.clientWidth, h = el.clientHeight;
          const origin = cam.screenToWorld(new runtime.Vector3(0, 0), w, h);
          const delta = cam.screenToWorld(
            new runtime.Vector3(e.touches[0].clientX - dragStartX, e.touches[0].clientY - dragStartY), w, h,
          ).sub(origin);
          cam.position.set(dragStartCamX - delta.x, dragStartCamY - delta.y, 0);
          cam.update();
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          zoomAt(mx, my, dist / pinchDist);
          pinchDist = dist;
        }
      }, { passive: false });

      el.addEventListener("touchend", (e) => { if (e.touches.length < 1) dragging = false; });
      el.addEventListener("dblclick", () => resetCamera(cam));
    }

    const app = {
      loadAssets(sc) {
        for (const l of resolvedLayers) {
          sc.assetManager.loadBinary(l.skeletonUrl);
          sc.assetManager.loadTextureAtlas(l.atlasUrl);
        }
      },

      initialize(sc) {
        for (const l of resolvedLayers) {
          const atlas = sc.assetManager.require(l.atlasUrl);
          const loader = new runtime.AtlasAttachmentLoader(atlas);
          const binary = new runtime.SkeletonBinary(loader);
          const skelData = binary.readSkeletonData(sc.assetManager.require(l.skeletonUrl));
          const skeleton = new runtime.Skeleton(skelData);
          skeleton.setToSetupPose();
          skeleton.updateWorldTransform(runtime.Physics.update);
          const stateData = new runtime.AnimationStateData(skelData);
          stateData.defaultMix = 0.2;
          const state = new runtime.AnimationState(stateData);
          layers.push({ skeleton, state });
        }

        const anims = layers[0].skeleton.data.animations;
        animSelect.innerHTML = "";
        for (const anim of anims) {
          const opt = document.createElement("option");
          opt.value = anim.name;
          opt.textContent = anim.name;
          animSelect.appendChild(opt);
        }
        animSelect.disabled = false;

        const animNames = anims.map((a) => String(a?.name || "")).filter(Boolean);
        const preferred = ["idle", "Idle", "wait", "stand", "greeting", "celebrate"];
        const defaultAnim = preferred.find((n) => animNames.includes(n)) || animNames[0] || "";
        if (defaultAnim) {
          animSelect.value = defaultAnim;
          setAnimation(defaultAnim);
        }

        animSelect.addEventListener("change", (e) => { setAnimation(e.target.value); playTime = 0; });

        btnPlay.addEventListener("click", () => {
          playing = !playing;
          btnPlay.innerHTML = playing ? "&#9646;&#9646;" : "&#9654;";
        });

        const skel = layers[0].skeleton;
        const offset = new runtime.Vector2();
        const size = new runtime.Vector2();
        skel.getBounds(offset, size, []);
        const cam = sc.renderer.camera;
        initialCamX = offset.x + size.x / 2;
        initialCamY = offset.y + size.y / 2;
        initialCamZoom = (size.y / sc.htmlCanvas.clientHeight) / 0.8;
        resetCamera(cam);

        setupCameraControls(sc.htmlCanvas, cam);
        setupTimeline();

        loadingOverlay.style.display = "none";
        resolve(controller);
      },

      update(sc, delta) {
        if (!playing) return;
        for (const layer of layers) {
          layer.state.update(delta);
          layer.state.apply(layer.skeleton);
          layer.skeleton.updateWorldTransform(runtime.Physics.update);
        }
        const duration = getAnimDuration();
        if (duration > 0) {
          playTime += delta;
          if (playTime >= duration) playTime -= duration;
        }
      },

      render(sc) {
        const duration = getAnimDuration();
        if (duration > 0)
          timelineFillEl.style.width = `${playTime / duration * 100}%`;
        sc.renderer.resize(runtime.ResizeMode.Expand);
        sc.clear(0, 0, 0, 0);
        sc.renderer.begin();
        for (const layer of layers)
          sc.renderer.drawSkeleton(layer.skeleton, premultipliedAlpha);
        sc.renderer.end();
      },

      error(_sc, errors) {
        loadingOverlay.className = "spine-viewer-loading-overlay spine-viewer-error";
        loadingOverlay.innerHTML = `<strong class="spine-viewer-error-title">Load error</strong><pre class="spine-viewer-error-detail">${Object.values(errors).join("\n")}</pre>`;
        reject(new Error(Object.values(errors).join("; ")));
      },
    };

    spineCanvasInstance = new runtime.SpineCanvas(canvas, {
      pathPrefix: "",
      app,
      webglConfig: { alpha: true },
    });
  });
}

export async function mountCharacterSpinePreview({ host, layers }) {
  if (!host || !Array.isArray(layers) || layers.length === 0) {
    return null;
  }

  await ensureSpineRuntime();

  const ordered = layers
    .slice()
    .sort((a, b) => layerDrawWeight(a.name) - layerDrawWeight(b.name));

  const resolvedLayers = [];
  for (const layer of ordered) {
    if (!layer.skeletonUrl || !layer.atlasUrl) continue;
    const pma = await readAtlasPremultipliedAlpha(layer.atlasUrl);
    resolvedLayers.push({ skeletonUrl: layer.skeletonUrl, atlasUrl: layer.atlasUrl, pma });
  }
  if (resolvedLayers.length === 0) return null;

  const instance = await createWebGLSpineViewer(host, resolvedLayers);

  let disconnectObserver = null;
  let destroyed = false;

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (disconnectObserver) {
      disconnectObserver.disconnect();
      disconnectObserver = null;
    }
    instance.destroy();
  };

  if (typeof MutationObserver === "function" && document.body) {
    disconnectObserver = new MutationObserver(() => {
      if (!host.isConnected) destroy();
    });
    disconnectObserver.observe(document.body, { childList: true, subtree: true });
  }

  return { destroy };
}
