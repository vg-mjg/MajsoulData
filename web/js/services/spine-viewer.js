import { assetUrlCandidates } from "../../utils.js";

const SPINE_PLAYER_SCRIPT_URLS = [
  "https://cdn.jsdelivr.net/npm/@esotericsoftware/spine-player@4.2.102/dist/iife/spine-player.min.js",
  "https://unpkg.com/@esotericsoftware/spine-player@4.2.102/dist/iife/spine-player.min.js",
];

const SPINE_PLAYER_STYLE_URLS = [
  "https://cdn.jsdelivr.net/npm/@esotericsoftware/spine-player@4.2.102/dist/spine-player.min.css",
  "https://unpkg.com/@esotericsoftware/spine-player@4.2.102/dist/spine-player.min.css",
];

const SPINE_PREMULTIPLIED_ALPHA = false;

const blockedOrigins = new Set();
let runtimePromise = null;

function hasSpinePlayerRuntime() {
  return Boolean(window.spine && window.spine.SpinePlayer);
}

function hasScriptTag(source) {
  return Array.from(document.querySelectorAll("script")).some((script) => script.src === source);
}

function hasStylesheetTag(source) {
  return Array.from(document.querySelectorAll("link[rel='stylesheet']")).some((link) => link.href === source);
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

function loadStylesheet(source) {
  if (hasStylesheetTag(source)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = source;
    link.crossOrigin = "anonymous";
    link.addEventListener("load", () => resolve());
    link.addEventListener("error", () => reject(new Error(`Failed to load stylesheet: ${source}`)));
    document.head.append(link);
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

async function ensureSpinePlayerRuntime() {
  if (hasSpinePlayerRuntime()) {
    return window.spine;
  }

  if (!runtimePromise) {
    runtimePromise = (async () => {
      await loadFirstAvailable(loadStylesheet, SPINE_PLAYER_STYLE_URLS);
      await loadFirstAvailable(loadScript, SPINE_PLAYER_SCRIPT_URLS);

      if (!hasSpinePlayerRuntime()) {
        throw new Error("Spine player runtime is unavailable after script load.");
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
    attempts.push({
      skeletonUrl,
      atlasUrl,
      layer,
      skeletonPath,
      atlasPath,
    });
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
      attempts.push({
        skeletonUrl,
        atlasUrl,
        layer,
        skeletonPath,
        atlasPath,
      });
    }
  }

  return attempts;
}

async function probeAssetUrl(url) {
  let origin = "";
  try {
    origin = new URL(url).origin;
  } catch {
    return false;
  }

  if (blockedOrigins.has(origin)) {
    return false;
  }

  try {
    const response = await fetch(url, { method: "HEAD", cache: "force-cache", mode: "cors" });
    return Boolean(response && response.ok);
  } catch (error) {
    if (error instanceof TypeError) {
      blockedOrigins.add(origin);
    }
    return false;
  }
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

async function resolveSpineSource(spineAssetPairs) {
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
      const [skeletonOk, atlasOk] = await Promise.all([
        probeAssetUrl(attempt.skeletonUrl),
        probeAssetUrl(attempt.atlasUrl),
      ]);
      if (!skeletonOk || !atlasOk) continue;

      const key = `${attempt.skeletonUrl}|${attempt.atlasUrl}`;
      if (seenAttempts.has(key)) continue;
      seenAttempts.add(key);

      const bucket = byLayer[attempt.layer] || byLayer.other;
      bucket.push(attempt);

      if (attempt.layer === "plain") {
        return {
          sources: [attempt],
        };
      }
    }
  }

  if (byLayer.plain.length > 0) {
    return { sources: [byLayer.plain[0]] };
  }

  if (byLayer["1"].length > 0) {
    const primary = byLayer["1"][0];
    const preferredOrigin = sourceOrigin(primary);
    const sameOrigin = (source) => sourceOrigin(source) === preferredOrigin;
    const layer0 = byLayer["0"].find(sameOrigin) || byLayer["0"][0] || null;
    const layer2 = byLayer["2"].find(sameOrigin) || byLayer["2"][0] || null;
    const stacked = [layer0, primary, layer2].filter(Boolean);
    return {
      sources: stacked.sort((left, right) => layerDrawOrder(left.layer) - layerDrawOrder(right.layer)),
    };
  }

  if (byLayer["0"].length > 0) {
    return { sources: [byLayer["0"][0]] };
  }

  if (byLayer["2"].length > 0) {
    return { sources: [byLayer["2"][0]] };
  }

  if (byLayer.other.length > 0) {
    return { sources: [byLayer.other[0]] };
  }

  return null;
}

function pickAnimationName(player) {
  const animationNames = Array.isArray(player?.skeleton?.data?.animations)
    ? player.skeleton.data.animations
      .map((entry) => String(entry && entry.name ? entry.name : ""))
      .filter((name) => name.length > 0)
    : [];
  if (animationNames.length === 0) return "";

  const preferred = ["idle", "Idle", "wait", "stand", "greeting", "celebrate"];
  for (const name of preferred) {
    if (animationNames.includes(name)) return name;
  }
  return animationNames[0];
}

async function readAtlasPremultipliedAlpha(atlasUrl) {
  if (!atlasUrl) return SPINE_PREMULTIPLIED_ALPHA;

  try {
    const response = await fetch(atlasUrl, { cache: "force-cache", mode: "cors" });
    if (!response.ok) return SPINE_PREMULTIPLIED_ALPHA;

    const text = await response.text();
    const top = String(text || "").split(/\r?\n/).slice(0, 32).join("\n");
    const match = top.match(/\bpma\s*:\s*(true|false)\b/i);
    if (!match) return SPINE_PREMULTIPLIED_ALPHA;
    return String(match[1]).toLowerCase() === "true";
  } catch {
    return SPINE_PREMULTIPLIED_ALPHA;
  }
}

function createSpinePlayer(host, source) {
  const runtime = window.spine;
  if (!runtime || !runtime.SpinePlayer) {
    return Promise.reject(new Error("Spine player runtime is unavailable."));
  }

  const sourceEntries = Array.isArray(source && source.sources)
    ? source.sources.filter(Boolean)
    : (source ? [source] : []);
  if (sourceEntries.length === 0) {
    return Promise.reject(new Error("Spine source is empty."));
  }

  function createSinglePlayer(layerHost, entry) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let player = null;
      let timeoutId = 0;

      const finalizeReject = (error) => {
        if (settled) return;
        settled = true;
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        if (player && typeof player.dispose === "function") {
          try {
            player.dispose();
          } catch {
            // ignore dispose errors
          }
        }
        layerHost.replaceChildren();
        reject(error instanceof Error ? error : new Error(String(error || "Failed to load spine layer.")));
      };

      timeoutId = window.setTimeout(() => {
        finalizeReject(new Error("Spine player load timeout."));
      }, 20000);

      const startPlayer = async () => {
        const premultipliedAlpha = await readAtlasPremultipliedAlpha(entry.atlasUrl);
        if (settled) return;

        try {
          player = new runtime.SpinePlayer(layerHost, {
            skelUrl: entry.skeletonUrl,
            atlasUrl: entry.atlasUrl,
            alpha: true,
            backgroundColor: "00000000",
            fullScreenBackgroundColor: "00000000",
            showControls: false,
            showLoading: false,
            premultipliedAlpha,
            defaultMix: 0.12,
            viewport: {
              transitionTime: 0.1,
              padLeft: "8%",
              padRight: "8%",
              padTop: "6%",
              padBottom: "4%",
            },
            success(loadedPlayer) {
              if (settled) return;
              settled = true;
              if (timeoutId) {
                window.clearTimeout(timeoutId);
              }
              resolve(loadedPlayer);
            },
            error(_player, message) {
              finalizeReject(new Error(String(message || "Spine player failed to load skeleton.")));
            },
          });
        } catch (error) {
          finalizeReject(error);
        }
      };

      void startPlayer();
    });
  }

  return new Promise((resolve, reject) => {
    const stackRoot = document.createElement("div");
    stackRoot.className = "detail-spine-stack";
    host.replaceChildren(stackRoot);

    const orderedSources = sourceEntries
      .slice()
      .sort((left, right) => layerDrawOrder(left.layer) - layerDrawOrder(right.layer));

    const layerEntries = orderedSources.map((entry) => {
      const layer = String(entry && entry.layer ? entry.layer : "other");
      const layerHost = document.createElement("div");
      layerHost.className = `detail-spine-player detail-spine-layer detail-spine-layer-${layer}`;
      stackRoot.append(layerHost);
      return { entry, layerHost };
    });

    const loadPromises = layerEntries.map(({ entry, layerHost }) =>
      createSinglePlayer(layerHost, entry).then((player) => ({ player, layerHost, entry })),
    );

    void Promise.allSettled(loadPromises).then((results) => {
      const fulfilled = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      if (fulfilled.length === 0) {
        host.replaceChildren();
        const firstRejected = results.find((result) => result.status === "rejected");
        reject(
          firstRejected && firstRejected.reason
            ? firstRejected.reason
            : new Error("Failed to load spine layers."),
        );
        return;
      }

      const loadedPlayers = fulfilled.map((entry) => entry.player);
      const animationSets = loadedPlayers.map((player) => new Set(
        Array.isArray(player?.skeleton?.data?.animations)
          ? player.skeleton.data.animations
            .map((item) => String(item && item.name ? item.name : ""))
            .filter((name) => name.length > 0)
          : [],
      ));

      let sharedAnimationName = "";
      const preferred = ["idle", "Idle", "wait", "stand", "greeting", "celebrate"];
      for (const name of preferred) {
        if (animationSets.every((set) => set.has(name))) {
          sharedAnimationName = name;
          break;
        }
      }
      if (!sharedAnimationName && animationSets.length > 0) {
        const firstNames = Array.from(animationSets[0]);
        for (const name of firstNames) {
          if (animationSets.every((set) => set.has(name))) {
            sharedAnimationName = name;
            break;
          }
        }
      }

      for (const player of loadedPlayers) {
        const fallbackAnimationName = pickAnimationName(player);
        const animationName = sharedAnimationName || fallbackAnimationName;
        if (!animationName) continue;
        try {
          player.setAnimation(animationName, true);
          player.play();
        } catch {
          // ignore animation setup errors for non-primary layers
        }
      }

      let destroyed = false;
      resolve({
        destroy() {
          if (destroyed) return;
          destroyed = true;
          for (const player of loadedPlayers) {
            if (!player || typeof player.dispose !== "function") continue;
            try {
              player.dispose();
            } catch {
              // ignore dispose errors caused by detached nodes
            }
          }
          host.replaceChildren();
        },
      });
    });
  });
}

function mountWithAutoCleanup(host, source) {
  return createSpinePlayer(host, source).then((instance) => {
    let disconnectObserver = null;
    let destroyed = false;

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      if (disconnectObserver) {
        disconnectObserver.disconnect();
        disconnectObserver = null;
      }
      if (instance && typeof instance.destroy === "function") {
        instance.destroy();
      }
    };

    if (typeof MutationObserver === "function" && document.body) {
      disconnectObserver = new MutationObserver(() => {
        if (!host.isConnected) {
          destroy();
        }
      });
      disconnectObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return { destroy };
  });
}

export async function mountCharacterSpinePreview({ host, spineAssetPairs }) {
  if (!host || !Array.isArray(spineAssetPairs) || spineAssetPairs.length === 0) {
    return null;
  }

  await ensureSpinePlayerRuntime();
  const source = await resolveSpineSource(spineAssetPairs);
  if (!source) {
    return null;
  }

  return mountWithAutoCleanup(host, source);
}
