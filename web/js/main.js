import "./vendor/theme-switcher.js";
import { createHashRouter } from "./core/router.js";
import { fetchJson } from "./core/http.js";
import { renderHomePage } from "./features/home/view.js";
import { renderCharactersPage } from "./features/characters/view.js";
import { renderCharacterDetailPage } from "./features/characters/detail-view.js";
import { renderItemsPage } from "./features/items/view.js";
import { renderItemDetailPage } from "./features/items/detail-view.js";
import { renderAchievementsPage } from "./features/achievements/view.js";
import { renderActivitiesPage } from "./features/activities/view.js";
import { renderCatChatPage } from "./features/catchat/view.js";
import { DEFAULT_UI_LANGUAGE, makeInitials, normalizeUiLanguage } from "../utils.js";
import {
  clearImageSourceCache,
  loadCharacterImageSource,
  setImageLoaderLanguage,
} from "./services/asset-image-loader.js";
import {
  clearAudioSourceCache,
  setAudioLoaderLanguage,
} from "./services/asset-audio-loader.js";
import { clearLazyHydrationQueue, scheduleVisibleTask } from "./services/lazy-hydration.js";
import { searchGlobalEntries } from "./services/global-search.js";

const APP_TITLE = "Mahjong Soul Data";
const LANGUAGE_STORAGE_KEY = "mahjong-soul-data.language";
const SIDEBAR_SEARCH_DEBOUNCE_MS = 180;

const dom = {
  viewRoot: document.getElementById("viewRoot"),
  navItems: Array.from(document.querySelectorAll("[data-route]")),
  gameVersion: document.getElementById("gameVersion"),
  languageSelect: document.getElementById("languageSelect"),
  sidebarSearch: document.getElementById("sidebarSearch"),
  sidebarSearchInput: document.getElementById("sidebarSearchInput"),
  sidebarSearchResults: document.getElementById("sidebarSearchResults"),
};

let currentRoute = "home";
let currentLanguage = DEFAULT_UI_LANGUAGE;
let searchRequestToken = 0;
let sidebarSearchDebounceTimer = null;
let pendingSidebarSearchQuery = "";
let currentRouteState = {
  route: "home",
  segments: ["home"],
  params: {},
  hash: "#/home",
};

const ROUTE_SECTION_TITLE = {
  home: "",
  characters: "Characters",
  items: "Items",
  achievements: "Achievements",
  activities: "Activities",
  catchat: "CatChat",
};

function replaceRouteParams(params) {
  const rawHash = window.location.hash;
  const cleaned = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  const pathname = cleaned.startsWith("/") ? cleaned.slice(1) : cleaned;
  const [pathWithoutQuery = ""] = pathname.split("?");
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "");
  const newHash = entries.length > 0
    ? `#/${pathWithoutQuery}?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`
    : `#/${pathWithoutQuery}`;
  history.replaceState(null, "", newHash);
}

function goToCharacters() {
  history.back();
}

function goToCharacterDetail(characterId) {
  window.location.hash = `#/characters/${characterId}`;
}

function goToItems() {
  history.back();
}

function goToItemDetail(itemId) {
  window.location.hash = `#/items/${itemId}`;
}

function getLanguage() {
  return currentLanguage;
}

function buildPageTitle(parts = []) {
  const normalized = parts
    .map((part) => String(part || "").trim())
    .filter((part) => part.length > 0);
  return [...normalized, APP_TITLE].join(" · ");
}

function setRouteDocumentTitle(route, routeState) {
  const resolvedRoute = String(route || "home");
  const detailId = Number(routeState && routeState.params ? routeState.params.id : 0);
  if (resolvedRoute === "characters" && detailId > 0) {
    document.title = buildPageTitle(["Character Detail", "Characters"]);
    return;
  }
  if (resolvedRoute === "items" && detailId !== 0) {
    document.title = buildPageTitle(["Item Detail", "Items"]);
    return;
  }
  const sectionTitle = ROUTE_SECTION_TITLE[resolvedRoute] || "";
  document.title = sectionTitle ? buildPageTitle([sectionTitle]) : APP_TITLE;
}

const routeConfig = {
  home: {
    render: async () => renderHomePage(dom),
  },
  characters: {
    render: async (routeState) => {
      const detailId = Number(routeState.params && routeState.params.id ? routeState.params.id : 0);
      if (detailId > 0) {
        return renderCharacterDetailPage({
          ...dom,
          getLanguage,
          characterId: detailId,
          goToCharacters,
          onOpenItemDetail: goToItemDetail,
          routeState,
          onParamChange: replaceRouteParams,
        });
      }
      return renderCharactersPage({
        ...dom,
        getLanguage,
        onOpenDetail: goToCharacterDetail,
        routeState,
        onParamChange: replaceRouteParams,
      });
    },
  },
  achievements: {
    render: async (routeState) => renderAchievementsPage({
      ...dom,
      getLanguage,
      onOpenItemDetail: goToItemDetail,
      routeState,
      onParamChange: replaceRouteParams,
    }),
  },
  activities: {
    render: async () => renderActivitiesPage({
      ...dom,
      getLanguage,
    }),
  },
  catchat: {
    render: async (routeState) => renderCatChatPage({
      ...dom,
      getLanguage,
      routeState,
      onParamChange: replaceRouteParams,
    }),
  },
  items: {
    render: async (routeState) => {
      const detailId = Number(routeState.params && routeState.params.id ? routeState.params.id : 0);
      if (detailId !== 0) {
        return renderItemDetailPage({
          ...dom,
          getLanguage,
          itemId: detailId,
          goToItems,
        });
      }
      return renderItemsPage({
        ...dom,
        getLanguage,
        onOpenDetail: goToItemDetail,
        routeState,
        onParamChange: replaceRouteParams,
      });
    },
  },
};

function updateActiveNav(route) {
  for (const item of dom.navItems) {
    if (item.dataset.route === route) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  }
}

function hideSidebarSearchResults({ keepInput = true } = { keepInput: true }) {
  searchRequestToken += 1;
  if (sidebarSearchDebounceTimer) {
    window.clearTimeout(sidebarSearchDebounceTimer);
    sidebarSearchDebounceTimer = null;
  }
  pendingSidebarSearchQuery = "";
  if (!dom.sidebarSearchResults) return;
  dom.sidebarSearchResults.classList.add("d-none");
  dom.sidebarSearchResults.innerHTML = "";
  if (!keepInput && dom.sidebarSearchInput) {
    dom.sidebarSearchInput.value = "";
  }
}

function showSidebarSearchMessage(message, className = "") {
  if (!dom.sidebarSearchResults) return;
  dom.sidebarSearchResults.classList.remove("d-none");
  const safeClass = String(className || "").trim();
  dom.sidebarSearchResults.innerHTML = `<div class="sidebar-search-message ${safeClass}">${String(message || "")}</div>`;
}

function createSearchResultButton(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sidebar-search-result";
  button.setAttribute("role", "option");

  const thumb = document.createElement("div");
  thumb.className = "sidebar-search-thumb placeholder";
  thumb.textContent = makeInitials(entry.title);
  button.append(thumb);

  if (Array.isArray(entry.imageCandidates) && entry.imageCandidates.length > 0) {
    scheduleVisibleTask(thumb, async () => {
      if (!thumb.isConnected) return;

      const source = await loadCharacterImageSource(entry.imageCandidates);
      if (!source || !thumb.isConnected) return;

      const image = document.createElement("img");
      image.className = "sidebar-search-thumb";
      image.src = source;
      image.alt = entry.title;
      image.loading = "lazy";
      image.decoding = "async";
      thumb.replaceWith(image);
    });
  }

  const body = document.createElement("div");
  body.className = "sidebar-search-result-body";
  const title = document.createElement("div");
  title.className = "sidebar-search-result-title";
  title.textContent = entry.title;
  const meta = document.createElement("div");
  meta.className = "sidebar-search-result-meta";
  meta.textContent = String(entry.subtitle || "").trim();
  if (meta.textContent) {
    body.append(title, meta);
  } else {
    body.append(title);
  }
  button.append(body);

  button.addEventListener("click", () => {
    if (entry.route) {
      window.location.hash = entry.route;
    }
    hideSidebarSearchResults();
  });

  return button;
}

function renderSidebarSearchResults(entries) {
  if (!dom.sidebarSearchResults) return;
  dom.sidebarSearchResults.innerHTML = "";
  dom.sidebarSearchResults.classList.remove("d-none");

  const list = document.createElement("div");
  list.className = "sidebar-search-result-list";
  for (const entry of entries) {
    list.append(createSearchResultButton(entry));
  }
  dom.sidebarSearchResults.append(list);
}

async function runSidebarSearch(rawQuery) {
  const query = String(rawQuery || "").trim();
  const token = ++searchRequestToken;
  if (!query) {
    hideSidebarSearchResults();
    return;
  }

  showSidebarSearchMessage("Searching...", "sidebar-search-loading");

  try {
    const entries = await searchGlobalEntries(query, currentLanguage, { limit: 10 });
    if (token !== searchRequestToken) return;

    if (!entries || entries.length === 0) {
      showSidebarSearchMessage("No results.", "sidebar-search-empty");
      return;
    }

    renderSidebarSearchResults(entries);
  } catch (error) {
    console.error(error);
    if (token !== searchRequestToken) return;
    showSidebarSearchMessage("Search failed.", "sidebar-search-empty");
  }
}

function scheduleSidebarSearch(rawQuery, { immediate = false } = {}) {
  pendingSidebarSearchQuery = String(rawQuery || "");
  if (sidebarSearchDebounceTimer) {
    window.clearTimeout(sidebarSearchDebounceTimer);
    sidebarSearchDebounceTimer = null;
  }

  if (immediate) {
    void runSidebarSearch(pendingSidebarSearchQuery);
    return;
  }

  sidebarSearchDebounceTimer = window.setTimeout(() => {
    sidebarSearchDebounceTimer = null;
    void runSidebarSearch(pendingSidebarSearchQuery);
  }, SIDEBAR_SEARCH_DEBOUNCE_MS);
}

function initSidebarSearch() {
  if (!dom.sidebarSearch || !dom.sidebarSearchInput || !dom.sidebarSearchResults) return;

  dom.sidebarSearchInput.addEventListener("input", () => {
    scheduleSidebarSearch(dom.sidebarSearchInput.value);
  });

  dom.sidebarSearchInput.addEventListener("focus", () => {
    if (String(dom.sidebarSearchInput.value || "").trim()) {
      scheduleSidebarSearch(dom.sidebarSearchInput.value, { immediate: true });
    }
  });

  dom.sidebarSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideSidebarSearchResults();
      dom.sidebarSearchInput.blur();
      return;
    }

    if (event.key === "Enter") {
      const first = dom.sidebarSearchResults.querySelector(".sidebar-search-result");
      if (first instanceof HTMLButtonElement) {
        event.preventDefault();
        first.click();
      }
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (!dom.sidebarSearch || !(event.target instanceof Node)) return;
    if (dom.sidebarSearch.contains(event.target)) return;
    hideSidebarSearchResults();
  });
}

async function renderRoute(routeState) {
  const requestedRoute = routeState && routeState.route ? routeState.route : "home";
  const resolvedRoute = routeConfig[requestedRoute] ? requestedRoute : "home";

  currentRouteState = resolvedRoute === requestedRoute
    ? routeState
    : {
      route: resolvedRoute,
      segments: [resolvedRoute],
      params: {},
      hash: routeState ? routeState.hash : "",
    };

  currentRoute = resolvedRoute;
  if (dom.viewRoot) {
    dom.viewRoot.classList.toggle("home-view-root", resolvedRoute === "home");
  }
  setRouteDocumentTitle(resolvedRoute, currentRouteState);
  const config = routeConfig[resolvedRoute];
  updateActiveNav(resolvedRoute);
  hideSidebarSearchResults();
  clearLazyHydrationQueue();
  await config.render(currentRouteState);
}

function readSavedLanguage() {
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeUiLanguage(raw);
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

function saveLanguage(language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // no-op: keep working even when storage is blocked
  }
}

function applyLanguage(language, { persist, rerender } = { persist: true, rerender: true }) {
  document.documentElement.setAttribute("data-lang", language)
  const normalized = normalizeUiLanguage(language);
  const languageChanged = normalized !== currentLanguage;
  currentLanguage = normalized;
  setImageLoaderLanguage(normalized);
  setAudioLoaderLanguage(normalized);

  if (languageChanged) {
    clearLazyHydrationQueue();
    clearImageSourceCache();
    clearAudioSourceCache();
  }

  if (dom.languageSelect && dom.languageSelect.value !== normalized) {
    dom.languageSelect.value = normalized;
  }
  if (persist) {
    saveLanguage(normalized);
  }
  if (languageChanged && dom.sidebarSearchInput && String(dom.sidebarSearchInput.value || "").trim()) {
    scheduleSidebarSearch(dom.sidebarSearchInput.value, { immediate: true });
  }
  if (rerender) {
    void renderRoute(currentRouteState);
  }
}

function initLanguageSelector() {
  currentLanguage = readSavedLanguage();
  applyLanguage(currentLanguage, { persist: false, rerender: false });

  if (!dom.languageSelect) return;
  dom.languageSelect.addEventListener("change", () => {
    applyLanguage(dom.languageSelect.value, { persist: true, rerender: true });
  });
}

async function renderVersionLabel() {
  if (!dom.gameVersion) return;

  try {
    const versionJsonUrl = new URL("../version.json", import.meta.url);
    const versionInfo = await fetchJson(versionJsonUrl);
    const version = versionInfo && versionInfo.version ? String(versionInfo.version) : "-";
    dom.gameVersion.textContent = version;
  } catch (error) {
    console.error(error);
    dom.gameVersion.textContent = "-";
  }
}

const router = createHashRouter({
  defaultRoute: "home",
  onRouteChange: renderRoute,
});

initLanguageSelector();
initSidebarSearch();
router.start();
void renderVersionLabel();
