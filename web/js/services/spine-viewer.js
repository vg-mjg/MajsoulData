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
const SPINE_ATLAS_METADATA_TIMEOUT_MS = 2500;
const SPINE_URL_PROBE_TIMEOUT_MS = 2500;

let runtimePromise = null;
const atlasPremultipliedAlphaCache = new Map();
const spineUrlProbeCache = new Map();
const atlasPageProbeCache = new Map();

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
    fetch(key, { method: "HEAD", cache: "no-cache", mode: "cors" })
      .then((response) => Boolean(response && response.ok))
      .catch(() => false),
    new Promise((resolve) => {
      window.setTimeout(() => resolve(false), SPINE_URL_PROBE_TIMEOUT_MS);
    }),
  ]);
  spineUrlProbeCache.set(key, promise);
  return promise;
}

function extractAtlasPageUrls(atlasUrl, atlasText) {
  const text = String(atlasText || "");
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((line) => String(line || "").trim());
  const pages = [];
  const seen = new Set();
  const imagePattern = /\.(png|jpg|jpeg|webp|bmp)$/i;

  for (const line of lines) {
    if (!line || !imagePattern.test(line)) continue;
    let urlText = "";
    try {
      urlText = new URL(line, atlasUrl).toString();
    } catch {
      continue;
    }
    if (!urlText || seen.has(urlText)) continue;
    seen.add(urlText);
    pages.push(urlText);
  }

  return pages;
}

async function probeAtlasTexturePages(atlasUrl) {
  const key = String(atlasUrl || "");
  if (!key) return true;
  if (atlasPageProbeCache.has(key)) {
    return atlasPageProbeCache.get(key);
  }

  const promise = (async () => {
    try {
      const response = await Promise.race([
        fetch(key, { method: "GET", cache: "no-cache", mode: "cors" }),
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
      const pages = extractAtlasPageUrls(key, atlasText);
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

async function probeSpineAttempt(attempt) {
  if (!attempt || !attempt.skeletonUrl || !attempt.atlasUrl) return false;
  const [skeletonOk, atlasOk] = await Promise.all([
    probeSpineUrl(attempt.skeletonUrl),
    probeSpineUrl(attempt.atlasUrl),
  ]);
  if (!skeletonOk || !atlasOk) return false;

  const pagesOk = await probeAtlasTexturePages(attempt.atlasUrl);
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
      layers: [
        {
          layer: "plain",
          attempts: trimmedAttemptList(byLayer.plain),
        },
      ],
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
    layers.push({
      layer,
      attempts: trimmedAttemptList(attempts),
    });
  }

  if (layers.length === 0) return null;
  layers.sort((left, right) => layerDrawOrder(left.layer) - layerDrawOrder(right.layer));

  return { primaryLayer, layers };
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
    if (!response || typeof response.ok !== "boolean") {
      atlasPremultipliedAlphaCache.set(atlasUrl, SPINE_PREMULTIPLIED_ALPHA);
      return SPINE_PREMULTIPLIED_ALPHA;
    }
    if (!response.ok) {
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

function createSpinePlayer(host, sourcePlan) {
  const runtime = window.spine;
  if (!runtime || !runtime.SpinePlayer) {
    return Promise.reject(new Error("Spine player runtime is unavailable."));
  }

  const layers = Array.isArray(sourcePlan && sourcePlan.layers)
    ? sourcePlan.layers.filter((entry) => entry && Array.isArray(entry.attempts) && entry.attempts.length > 0)
    : [];
  if (layers.length === 0) {
    return Promise.reject(new Error("Spine source is empty."));
  }

  function createSinglePlayer(layerHost, attempts) {
    return new Promise((resolve, reject) => {
      const sourceQueue = Array.isArray(attempts) ? attempts.slice() : [];
      if (sourceQueue.length === 0) {
        reject(new Error("No spine layer attempts available."));
        return;
      }
      const queue = [];

      let active = true;
      let currentPlayer = null;
      let lastError = null;
      let attemptSerial = 0;

      const cleanupCurrentPlayer = () => {
        if (currentPlayer && typeof currentPlayer.dispose === "function") {
          try {
            currentPlayer.dispose();
          } catch {
            // ignore dispose errors
          }
        }
        currentPlayer = null;
      };

      const finalizeFailure = (error) => {
        if (!active) return;
        active = false;
        cleanupCurrentPlayer();
        layerHost.replaceChildren();
        reject(error instanceof Error ? error : new Error(String(error || "Failed to load spine layer.")));
      };

      const scheduleNext = () => {
        queueMicrotask(() => {
          void tryNext();
        });
      };

      const tryNext = async () => {
        if (!active) return;
        cleanupCurrentPlayer();

        const entry = queue.shift();
        if (!entry) {
          finalizeFailure(lastError || new Error("Failed to load spine layer."));
          return;
        }
        attemptSerial += 1;
        const currentAttemptSerial = attemptSerial;

        const premultipliedAlpha = await readAtlasPremultipliedAlpha(entry.atlasUrl);
        if (!active || currentAttemptSerial !== attemptSerial) return;

        try {
          currentPlayer = new runtime.SpinePlayer(layerHost, {
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
              if (currentAttemptSerial !== attemptSerial) {
                if (loadedPlayer && typeof loadedPlayer.dispose === "function") {
                  try {
                    loadedPlayer.dispose();
                  } catch {
                    // ignore dispose errors
                  }
                }
                return;
              }
              if (!active) {
                if (loadedPlayer && typeof loadedPlayer.dispose === "function") {
                  try {
                    loadedPlayer.dispose();
                  } catch {
                    // ignore dispose errors
                  }
                }
                return;
              }

              active = false;
              resolve({ player: loadedPlayer, source: entry });
            },
            error(_player, message) {
              if (!active || currentAttemptSerial !== attemptSerial) return;
              lastError = new Error(String(message || "Spine player failed to load skeleton."));
              scheduleNext();
            },
          });
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error || "Failed to create spine player."));
          scheduleNext();
        }
      };

      const initializeQueue = async () => {
        const probed = await Promise.all(sourceQueue.map(async (entry, index) => ({
          entry,
          index,
          reachable: await probeSpineAttempt(entry),
        })));

        probed.sort((left, right) => {
          const leftReachable = left.reachable ? 1 : 0;
          const rightReachable = right.reachable ? 1 : 0;
          if (leftReachable !== rightReachable) return rightReachable - leftReachable;
          return left.index - right.index;
        });

        for (const item of probed) {
          queue.push(item.entry);
        }

        scheduleNext();
      };

      void initializeQueue().catch((error) => {
        finalizeFailure(error);
      });
    });
  }

  return new Promise((resolve, reject) => {
    const stackRoot = document.createElement("div");
    stackRoot.className = "detail-spine-stack";
    host.replaceChildren(stackRoot);

    const layerEntries = layers
      .slice()
      .sort((left, right) => layerDrawOrder(left.layer) - layerDrawOrder(right.layer))
      .map((entry) => {
        const layer = String(entry && entry.layer ? entry.layer : "other");
        const attempts = Array.isArray(entry && entry.attempts) ? entry.attempts : [];
        return { layer, attempts };
      })
      .filter((entry) => entry.attempts.length > 0)
      .map((entry) => {
      const layer = entry.layer;
      const layerHost = document.createElement("div");
      layerHost.className = `detail-spine-player detail-spine-layer detail-spine-layer-${layer}`;
      stackRoot.append(layerHost);
      return { layer, attempts: entry.attempts, layerHost };
    });

    if (layerEntries.length === 0) {
      host.replaceChildren();
      reject(new Error("Spine source is empty."));
      return;
    }

    const loadedPlayers = [];
    let hasResolved = false;
    let destroyed = false;
    let lastError = null;

    const primaryLayer = String(sourcePlan && sourcePlan.primaryLayer ? sourcePlan.primaryLayer : "");
    const primaryEntry = layerEntries.find((entry) => entry.layer === primaryLayer) || layerEntries[0];
    const secondaryEntries = layerEntries.filter((entry) => entry !== primaryEntry);

    const disposePlayer = (player) => {
      if (!player || typeof player.dispose !== "function") return;
      try {
        player.dispose();
      } catch {
        // ignore dispose errors caused by detached nodes
      }
    };

    const controller = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const player of loadedPlayers) {
          disposePlayer(player);
        }
        host.replaceChildren();
      },
    };

    const setupPlayerAnimation = (player, preferredAnimation = "") => {
      const fallbackAnimation = pickAnimationName(player);
      const animationName = preferredAnimation || fallbackAnimation;
      if (!animationName) return "";
      try {
        player.setAnimation(animationName, true);
        player.play();
        return animationName;
      } catch {
        return "";
      }
    };

    const mountSecondaryLayers = (sharedAnimationName, primarySource) => {
      for (const entry of secondaryEntries) {
        const sortedAttempts = sortAttemptsByPrimarySource(entry.attempts, primarySource);
        createSinglePlayer(entry.layerHost, sortedAttempts)
          .then((result) => {
            if (!result || !result.player) return;
            if (destroyed) {
              disposePlayer(result.player);
              return;
            }
            setupPlayerAnimation(result.player, sharedAnimationName);
            loadedPlayers.push(result.player);
          })
          .catch(() => {
            // Secondary layers are optional.
          });
      }
    };

    const tryEntriesSequentially = async (entries) => {
      let sharedAnimationName = "";
      for (const entry of entries) {
        try {
          const result = await createSinglePlayer(entry.layerHost, entry.attempts);
          if (!result || !result.player) continue;
          if (destroyed) {
            disposePlayer(result.player);
            return false;
          }
          sharedAnimationName = setupPlayerAnimation(result.player, "");
          loadedPlayers.push(result.player);
          mountSecondaryLayers(sharedAnimationName, result.source || null);
          if (!hasResolved) {
            hasResolved = true;
            resolve(controller);
          }
          return true;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error || "Failed to load spine layer."));
        }
      }
      return false;
    };

    void (async () => {
      const prioritized = [primaryEntry, ...secondaryEntries];
      const ok = await tryEntriesSequentially(prioritized);
      if (ok || destroyed || hasResolved) return;
      host.replaceChildren();
      reject(lastError || new Error("Failed to load spine layers."));
    })();
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
