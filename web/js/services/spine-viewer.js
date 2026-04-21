import { assetUrlCandidates } from "../../utils.js";

const SPINE_SCRIPT_URLS = [
  "https://cdn.jsdelivr.net/npm/@esotericsoftware/spine-player@4.2.102/dist/iife/spine-player.min.js",
  "https://unpkg.com/@esotericsoftware/spine-player@4.2.102/dist/iife/spine-player.min.js",
];

const SPINE_PREMULTIPLIED_ALPHA = false;
const SPINE_ATLAS_METADATA_TIMEOUT_MS = 2500;
const SPINE_URL_PROBE_TIMEOUT_MS = 2500;

let runtimePromise = null;
const atlasPremultipliedAlphaCache = new Map();
const spineUrlProbeCache = new Map();
const atlasPageProbeCache = new Map();

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

function urlsForAsset(candidate) {
  if (!candidate || !candidate.path || !candidate.prefix) return [];
  return assetUrlCandidates(candidate.path, candidate.prefix);
}

function createUrlAttemptsForPair(pair) {
  const skeletonUrls = urlsForAsset(pair.skeleton);
  const atlasUrls = urlsForAsset(pair.atlas);
  const attempts = [];
  const seen = new Set();
  const layer = resolveLayerNameFromPath(String(pair && pair.skeleton && pair.skeleton.path ? pair.skeleton.path : ""));
  const skeletonPath = String(pair && pair.skeleton && pair.skeleton.path ? pair.skeleton.path : "");
  const atlasPath = String(pair && pair.atlas && pair.atlas.path ? pair.atlas.path : "");

  const maxLength = Math.max(skeletonUrls.length, atlasUrls.length);
  for (let index = 0; index < maxLength; index += 1) {
    const skeletonUrl = skeletonUrls[index] || "";
    const atlasUrl = atlasUrls[index] || "";
    if (!skeletonUrl || !atlasUrl) continue;
    const key = `${skeletonUrl}|${atlasUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    attempts.push({ skeletonUrl, atlasUrl, layer, skeletonPath, atlasPath });
  }

  for (const skeletonUrl of skeletonUrls) {
    for (const atlasUrl of atlasUrls) {
      if (!skeletonUrl || !atlasUrl) continue;
      let sameOrigin = false;
      try {
        sameOrigin = new URL(skeletonUrl).origin === new URL(atlasUrl).origin;
      } catch {
        sameOrigin = false;
      }
      if (!sameOrigin) continue;

      const key = `${skeletonUrl}|${atlasUrl}`;
      if (seen.has(key)) continue;
      seen.add(key);
      attempts.push({ skeletonUrl, atlasUrl, layer, skeletonPath, atlasPath });
    }
  }

  return attempts;
}

function spineLayerPriority(pair) {
  const skeletonPath = String(pair && pair.skeleton && pair.skeleton.path ? pair.skeleton.path : "");
  if (!skeletonPath) return 0;
  if (/\/spine\/spine\.(?:skel(?:\.txt)?|json)$/i.test(skeletonPath)) return 400;
  if (/\/spine\/spine_1\.(?:skel(?:\.txt)?|json)$/i.test(skeletonPath)) return 320;
  if (/\/spine\/spine_2\.(?:skel(?:\.txt)?|json)$/i.test(skeletonPath)) return 260;
  if (/\/spine\/spine_0\.(?:skel(?:\.txt)?|json)$/i.test(skeletonPath)) return 120;
  return 0;
}

function resolveLayerNameFromPath(skeletonPath) {
  const path = String(skeletonPath || "");
  if (/\/spine\/spine\.(?:skel(?:\.txt)?|json)$/i.test(path)) return "plain";
  if (/\/spine\/spine_0\.(?:skel(?:\.txt)?|json)$/i.test(path)) return "0";
  if (/\/spine\/spine_1\.(?:skel(?:\.txt)?|json)$/i.test(path)) return "1";
  if (/\/spine\/spine_2\.(?:skel(?:\.txt)?|json)$/i.test(path)) return "2";
  return "other";
}

function layerDrawOrder(layer) {
  if (layer === "0") return 10;
  if (layer === "1") return 20;
  if (layer === "2") return 30;
  if (layer === "plain") return 40;
  return 50;
}

function sourceOrigin(source) {
  try {
    return new URL(String(source && source.skeletonUrl ? source.skeletonUrl : "")).origin;
  } catch {
    return "";
  }
}

function attemptPathBucket(attempt) {
  const path = String(attempt && attempt.skeletonPath ? attempt.skeletonPath : "").toLowerCase();
  if (path.startsWith("en/")) return "en";
  if (path.startsWith("jp/")) return "jp";
  if (path.startsWith("kr/") || path.startsWith("en_kr/")) return "kr";
  if (path.startsWith("chs_t/")) return "chs_t";
  if (path.startsWith("lang/")) return "lang";
  if (path.length > 0) return "base";
  return "other";
}

function uiLangFromAttempt(attempt) {
  try {
    const url = new URL(String(attempt && attempt.skeletonUrl ? attempt.skeletonUrl : ""));
    return String(url.searchParams.get("ui_lang") || "").toLowerCase();
  } catch {
    return "";
  }
}

function bucketPriorityOrder(uiLanguage) {
  if (uiLanguage === "jp") return ["jp", "en", "kr", "chs_t", "base", "lang", "other"];
  if (uiLanguage === "kr") return ["kr", "jp", "en", "chs_t", "base", "lang", "other"];
  if (uiLanguage === "chs_t" || uiLanguage === "chs") return ["chs_t", "jp", "en", "kr", "base", "lang", "other"];
  return ["en", "jp", "kr", "chs_t", "base", "lang", "other"];
}

function trimmedAttemptList(attempts) {
  const source = Array.isArray(attempts) ? attempts.slice() : [];
  if (source.length <= 1) return source;

  const uiLanguage = uiLangFromAttempt(source[0]);
  const order = bucketPriorityOrder(uiLanguage);
  const orderMap = new Map(order.map((bucket, index) => [bucket, index]));

  return source
    .map((attempt, index) => ({ attempt, index }))
    .sort((left, right) => {
      const leftBucket = attemptPathBucket(left.attempt);
      const rightBucket = attemptPathBucket(right.attempt);
      const leftRank = orderMap.has(leftBucket) ? orderMap.get(leftBucket) : order.length;
      const rightRank = orderMap.has(rightBucket) ? orderMap.get(rightBucket) : order.length;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.index - right.index;
    })
    .map((entry) => entry.attempt);
}

function attemptResourceVersion(attempt) {
  try {
    const url = new URL(String(attempt && attempt.skeletonUrl ? attempt.skeletonUrl : ""));
    return String(url.searchParams.get("rv") || "");
  } catch {
    return "";
  }
}

function attemptFormatName(attempt) {
  const path = String(
    (attempt && attempt.skeletonPath)
    || (attempt && attempt.skeletonUrl)
    || "",
  ).toLowerCase();
  if (path.endsWith(".skel.txt")) return "skel_txt";
  if (path.endsWith(".skel")) return "skel";
  if (path.endsWith(".json")) return "json";
  return "";
}

function attemptVariantKey(attempt) {
  const path = String(attempt && attempt.skeletonPath ? attempt.skeletonPath : "").toLowerCase();
  const localizedMatch = path.match(/^(en_kr|en|jp|kr|chs_t)\//);
  if (localizedMatch) return localizedMatch[1];

  const langMatch = path.match(/^lang\/(base_q7|base|chs_t_q7|chs_t|chs_q7|chs)\//);
  if (langMatch) return `lang/${langMatch[1]}`;

  if (path.startsWith("extendres/")) return "base";
  return "";
}

function sortAttemptsByPrimarySource(attempts, primarySource) {
  const source = Array.isArray(attempts) ? attempts.slice() : [];
  if (source.length <= 1 || !primarySource) return source;

  const primaryOrigin = sourceOrigin(primarySource);
  const primaryBucket = attemptPathBucket(primarySource);
  const primaryVersion = attemptResourceVersion(primarySource);
  const primaryFormat = attemptFormatName(primarySource);
  const primaryVariant = attemptVariantKey(primarySource);

  return source
    .map((attempt, index) => {
      let score = 0;
      if (primaryOrigin && sourceOrigin(attempt) === primaryOrigin) score += 12;
      if (primaryBucket && attemptPathBucket(attempt) === primaryBucket) score += 30;
      if (primaryVersion && attemptResourceVersion(attempt) === primaryVersion) score += 60;
      if (primaryFormat && attemptFormatName(attempt) === primaryFormat) score += 10;
      if (primaryVariant && attemptVariantKey(attempt) === primaryVariant) score += 8;

      return { attempt, index, score };
    })
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return left.index - right.index;
    })
    .map((entry) => entry.attempt);
}

function probeSpineUrl(url) {
  const key = String(url || "");
  if (!key) return Promise.resolve(false);
  if (spineUrlProbeCache.has(key)) {
    return spineUrlProbeCache.get(key);
  }

  const promise = Promise.race([
    fetch(key)
      .then((response) => Boolean(response && response.ok))
      .catch(() => false),
    new Promise((resolve) => {
      window.setTimeout(() => resolve(false), SPINE_URL_PROBE_TIMEOUT_MS);
    }),
  ]);
  spineUrlProbeCache.set(key, promise);
  return promise;
}

function extractAtlasPageUrls(atlasUrl, atlasText, atlasPath, resourceManifest) {
  const text = String(atlasText || "");
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((line) => String(line || "").trim());
  const pages = [];
  const seen = new Set();
  const imagePattern = /\.(png|jpg|jpeg|webp|bmp)$/i;
  const atlasDirPath = atlasPath ? String(atlasPath).replace(/[^/]+$/, "") : null;

  for (const line of lines) {
    if (!line || !imagePattern.test(line)) continue;

    let urlText = "";
    try {
      urlText = new URL(line, atlasUrl).toString();
    } catch {
      continue;
    }
    if (!urlText) continue;

    // When the manifest is available, look up each image's correct version prefix.
    // Atlas files often reference PNGs that were last updated in an older version than
    // the atlas itself, so resolving relative to atlasUrl yields the wrong prefix.
    if (resourceManifest && atlasDirPath && !line.startsWith("/") && !line.includes("://")) {
      const canonicalPath = atlasDirPath + line;
      const entry = resourceManifest[canonicalPath];
      if (entry && entry.prefix) {
        const candidates = assetUrlCandidates(canonicalPath, entry.prefix);
        if (candidates.length > 0) {
          urlText = candidates[0];
        }
      }
    }

    if (seen.has(urlText)) continue;
    seen.add(urlText);
    pages.push(urlText);
  }

  return pages;
}

async function probeAtlasTexturePages(atlasUrl, atlasPath, resourceManifest) {
  const key = String(atlasUrl || "");
  if (!key) return true;
  if (atlasPageProbeCache.has(key)) {
    return atlasPageProbeCache.get(key);
  }

  const promise = (async () => {
    try {
      const response = await Promise.race([
        fetch(key, { method: "GET" }),
        new Promise((resolve) => {
          window.setTimeout(() => resolve(null), SPINE_ATLAS_METADATA_TIMEOUT_MS);
        }),
      ]);
      if (!response || typeof response.ok !== "boolean" || !response.ok) return false;

      const atlasText = await Promise.race([
        response.text(),
        new Promise((resolve) => {
          window.setTimeout(() => resolve(""), SPINE_ATLAS_METADATA_TIMEOUT_MS);
        }),
      ]);
      const pages = extractAtlasPageUrls(key, atlasText, atlasPath, resourceManifest);
      if (pages.length === 0) return true;

      const checks = await Promise.all(pages.map((url) => probeSpineUrl(url)));
      return checks.every(Boolean);
    } catch {
      return false;
    }
  })();

  atlasPageProbeCache.set(key, promise);
  return promise;
}

async function probeSpineAttempt(attempt, resourceManifest) {
  if (!attempt || !attempt.skeletonUrl || !attempt.atlasUrl) return false;
  const [skeletonOk, atlasOk] = await Promise.all([
    probeSpineUrl(attempt.skeletonUrl),
    probeSpineUrl(attempt.atlasUrl),
  ]);
  if (!skeletonOk || !atlasOk) return false;

  const pagesOk = await probeAtlasTexturePages(attempt.atlasUrl, attempt.atlasPath, resourceManifest);
  return Boolean(pagesOk);
}

function resolveSpineSource(spineAssetPairs) {
  const orderedPairs = (spineAssetPairs || [])
    .filter((pair) => pair && pair.skeleton && pair.atlas)
    .map((pair, index) => ({ pair, index, priority: spineLayerPriority(pair) }))
    .sort((left, right) => {
      if (left.priority !== right.priority) return right.priority - left.priority;
      return left.index - right.index;
    })
    .map((entry) => entry.pair);

  const byLayer = {
    plain: [],
    "0": [],
    "1": [],
    "2": [],
    other: [],
  };
  const seenAttempts = new Set();

  for (const pair of orderedPairs) {
    if (!pair || !pair.skeleton || !pair.atlas) continue;
    const attempts = createUrlAttemptsForPair(pair);
    for (const attempt of attempts) {
      const key = `${attempt.skeletonUrl}|${attempt.atlasUrl}`;
      if (seenAttempts.has(key)) continue;
      seenAttempts.add(key);

      const bucket = byLayer[attempt.layer] || byLayer.other;
      bucket.push(attempt);
    }
  }

  if (byLayer.plain.length > 0) {
    return {
      primaryLayer: "plain",
      layers: [{ layer: "plain", attempts: trimmedAttemptList(byLayer.plain) }],
    };
  }

  const primaryLayer = byLayer["1"].length > 0
    ? "1"
    : (byLayer["0"].length > 0 ? "0" : (byLayer["2"].length > 0 ? "2" : (byLayer.other.length > 0 ? "other" : "")));
  if (!primaryLayer) return null;

  const layerOrder = ["0", "1", "2", "other"];
  const layers = [];
  for (const layer of layerOrder) {
    const attempts = byLayer[layer] || [];
    if (attempts.length === 0) continue;
    layers.push({ layer, attempts: trimmedAttemptList(attempts) });
  }

  if (layers.length === 0) return null;
  layers.sort((left, right) => layerDrawOrder(left.layer) - layerDrawOrder(right.layer));

  return { primaryLayer, layers };
}

async function readAtlasPremultipliedAlpha(atlasUrl) {
  if (!atlasUrl) return SPINE_PREMULTIPLIED_ALPHA;
  if (atlasPremultipliedAlphaCache.has(atlasUrl)) {
    return atlasPremultipliedAlphaCache.get(atlasUrl);
  }

  try {
    const response = await Promise.race([
      fetch(atlasUrl, { cache: "force-cache", mode: "cors" }),
      new Promise((resolve) => {
        window.setTimeout(() => resolve(null), SPINE_ATLAS_METADATA_TIMEOUT_MS);
      }),
    ]);
    if (!response || typeof response.ok !== "boolean" || !response.ok) {
      atlasPremultipliedAlphaCache.set(atlasUrl, SPINE_PREMULTIPLIED_ALPHA);
      return SPINE_PREMULTIPLIED_ALPHA;
    }

    const text = await Promise.race([
      response.text(),
      new Promise((resolve) => {
        window.setTimeout(() => resolve(""), SPINE_ATLAS_METADATA_TIMEOUT_MS);
      }),
    ]);
    const top = String(text || "").split(/\r?\n/).slice(0, 32).join("\n");
    const match = top.match(/\bpma\s*:\s*(true|false)\b/i);
    if (!match) {
      atlasPremultipliedAlphaCache.set(atlasUrl, SPINE_PREMULTIPLIED_ALPHA);
      return SPINE_PREMULTIPLIED_ALPHA;
    }

    const value = String(match[1]).toLowerCase() === "true";
    atlasPremultipliedAlphaCache.set(atlasUrl, value);
    return value;
  } catch {
    atlasPremultipliedAlphaCache.set(atlasUrl, SPINE_PREMULTIPLIED_ALPHA);
    return SPINE_PREMULTIPLIED_ALPHA;
  }
}

async function fetchAtlasFileAlias(atlasUrl, atlasPath, resourceManifest) {
  if (!resourceManifest || !atlasPath) return null;
  const atlasDirPath = String(atlasPath).replace(/[^/]+$/, "");
  if (!atlasDirPath) return null;

  try {
    const response = await Promise.race([
      fetch(atlasUrl, { cache: "force-cache", mode: "cors" }),
      new Promise((resolve) => {
        window.setTimeout(() => resolve(null), SPINE_ATLAS_METADATA_TIMEOUT_MS);
      }),
    ]);
    if (!response || !response.ok) return null;

    const atlasText = await Promise.race([
      response.text(),
      new Promise((resolve) => {
        window.setTimeout(() => resolve(""), SPINE_ATLAS_METADATA_TIMEOUT_MS);
      }),
    ]);

    const lines = String(atlasText || "").split(/\r?\n/).map((l) => String(l || "").trim());
    const imagePattern = /\.(png|jpg|jpeg|webp|bmp)$/i;
    const alias = Object.create(null);

    for (const line of lines) {
      if (!line || !imagePattern.test(line)) continue;
      if (line.startsWith("/") || line.includes("://")) continue;
      const canonicalPath = atlasDirPath + line;
      const entry = resourceManifest[canonicalPath];
      if (entry && entry.prefix) {
        const candidates = assetUrlCandidates(canonicalPath, entry.prefix);
        if (candidates.length > 0) {
          alias[line] = candidates[0];
        }
      }
    }

    return Object.keys(alias).length > 0 ? alias : null;
  } catch {
    return null;
  }
}

async function resolveLayers(sourcePlan, resourceManifest) {
  const resolved = [];
  const primarySource = sourcePlan.layers.find((l) => l.layer === sourcePlan.primaryLayer)?.attempts[0] ?? null;

  for (const layerEntry of sourcePlan.layers) {
    const sortedAttempts = primarySource && layerEntry.layer !== sourcePlan.primaryLayer
      ? sortAttemptsByPrimarySource(layerEntry.attempts, primarySource)
      : layerEntry.attempts;

    for (const attempt of sortedAttempts) {
      const ok = await probeSpineAttempt(attempt, resourceManifest);
      if (ok) {
        const pma = await readAtlasPremultipliedAlpha(attempt.atlasUrl);
        const fileAlias = await fetchAtlasFileAlias(attempt.atlasUrl, attempt.atlasPath, resourceManifest);
        resolved.push({ skeletonUrl: attempt.skeletonUrl, atlasUrl: attempt.atlasUrl, pma, fileAlias });
        break;
      }
    }
  }

  return resolved;
}

async function createWebGLSpineViewer(host, sourcePlan, resourceManifest) {
  const runtime = window.spine;
  if (!runtime || !runtime.SpineCanvas) throw new Error("Spine runtime unavailable.");

  // Show loading state while probing URLs
  const loadingEl = document.createElement("div");
  loadingEl.className = "spine-viewer-loading";
  loadingEl.innerHTML = '<div class="spine-viewer-spinner"></div>';
  host.replaceChildren(loadingEl);

  const resolvedLayers = await resolveLayers(sourcePlan, resourceManifest);
  if (resolvedLayers.length === 0) throw new Error("No accessible spine layers found.");

  const premultipliedAlpha = resolvedLayers[0].pma;

  // Build viewer DOM
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
          if (l.fileAlias) {
            sc.assetManager.loadTextureAtlas(l.atlasUrl, null, null, l.fileAlias);
          } else {
            sc.assetManager.loadTextureAtlas(l.atlasUrl);
          }
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

export async function mountCharacterSpinePreview({ host, spineAssetPairs, resourceManifest }) {
  if (!host || !Array.isArray(spineAssetPairs) || spineAssetPairs.length === 0) {
    return null;
  }

  await ensureSpineRuntime();
  const source = resolveSpineSource(spineAssetPairs);
  if (!source) {
    return null;
  }

  const instance = await createWebGLSpineViewer(host, source, resourceManifest);

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
