import { matchSearchEntries } from "./search-matcher.js";

const SEARCH_DEBOUNCE_MS = 180;

function makeInitials(name) {
  const text = String(name || "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.slice(0, 2).map((part) => part[0]).join("");
  return Array.from(text).slice(0, 2).join("");
}

function showMessage(results, message, className = "") {
  results.classList.remove("d-none");
  results.replaceChildren();
  const node = document.createElement("div");
  node.className = `sidebar-search-message ${className}`.trim();
  node.textContent = message;
  results.append(node);
}

function hideResults(results) {
  results.classList.add("d-none");
  results.replaceChildren();
}

function siteRootFromIndexUrl(indexUrl, localeCode) {
  const marker = `/${localeCode}/search-index.json`;
  const path = indexUrl.pathname;
  if (path.endsWith(marker)) {
    const prefix = path.slice(0, -marker.length);
    return `${prefix.replace(/\/+$/, "")}/`;
  }
  return new URL("../", indexUrl).pathname;
}

function hrefForEntry(entry, indexUrl, localeCode) {
  const route = String((entry && entry.route) || "");
  const routeUrl = route.startsWith("/")
    ? new URL(`${siteRootFromIndexUrl(indexUrl, localeCode)}${route.replace(/^\/+/, "")}`, indexUrl.origin)
    : new URL(route, new URL("./", indexUrl));
  if (routeUrl.origin !== window.location.origin) return "";
  return `${routeUrl.pathname}${routeUrl.search}${routeUrl.hash}`;
}

function createResult(entry, indexUrl, localeCode) {
  const href = hrefForEntry(entry, indexUrl, localeCode);
  const link = document.createElement("a");
  link.className = "sidebar-search-result text-decoration-none";
  link.setAttribute("role", "option");
  link.href = href || "#";

  const thumbnail = String((entry && entry.thumbnail) || "");
  if (thumbnail) {
    const image = document.createElement("img");
    image.className = "sidebar-search-thumb";
    image.src = thumbnail;
    image.alt = String(entry.name || "");
    image.loading = "lazy";
    image.decoding = "async";
    link.append(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "sidebar-search-thumb placeholder";
    placeholder.textContent = makeInitials(entry && entry.name);
    link.append(placeholder);
  }

  const body = document.createElement("div");
  body.className = "sidebar-search-result-body";
  const title = document.createElement("div");
  title.className = "sidebar-search-result-title";
  title.textContent = String((entry && entry.name) || "");
  const meta = document.createElement("div");
  meta.className = "sidebar-search-result-meta";
  meta.textContent = String((entry && entry.type) || "");
  body.append(title, meta);
  link.append(body);

  return link;
}

function renderResults(results, entries, indexUrl, localeCode) {
  results.replaceChildren();
  results.classList.remove("d-none");
  const list = document.createElement("div");
  list.className = "sidebar-search-result-list";
  for (const entry of entries) {
    list.append(createResult(entry, indexUrl, localeCode));
  }
  results.append(list);
}

function initSidebarSearch(root) {
  const input = root.querySelector("[data-sidebar-search-input]");
  const results = root.querySelector("[data-sidebar-search-results]");
  if (!(input instanceof HTMLInputElement) || !(results instanceof HTMLElement)) return;

  const localeCode = document.documentElement.dataset.lang || "en";
  const indexUrl = new URL(root.dataset.searchIndexUrl || `./search-index.json`, window.location.href);
  let indexPromise = null;
  let debounceTimer = 0;
  let requestToken = 0;

  function ensureSearchIndex() {
    if (indexPromise) return indexPromise;
    if (indexUrl.origin !== window.location.origin) {
      indexPromise = Promise.reject(new Error("Search index must be same-origin"));
      return indexPromise;
    }
    indexPromise = fetch(indexUrl.href, { credentials: "same-origin" }).then((response) => {
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
      return response.json();
    });
    return indexPromise;
  }

  async function runSearch(rawQuery) {
    const query = String(rawQuery || "").trim();
    const token = ++requestToken;
    if (!query) {
      hideResults(results);
      return;
    }

    showMessage(results, "Searching...", "sidebar-search-loading");
    try {
      const index = await ensureSearchIndex();
      if (token !== requestToken) return;
      const entries = matchSearchEntries(index, query, { limit: 10 });
      if (entries.length === 0) {
        showMessage(results, "No results.", "sidebar-search-empty");
        return;
      }
      renderResults(results, entries, indexUrl, localeCode);
    } catch (error) {
      console.error(error);
      if (token !== requestToken) return;
      showMessage(results, "Search failed.", "sidebar-search-empty");
    }
  }

  function scheduleSearch(immediate = false) {
    window.clearTimeout(debounceTimer);
    if (immediate) {
      void runSearch(input.value);
      return;
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = 0;
      void runSearch(input.value);
    }, SEARCH_DEBOUNCE_MS);
  }

  input.addEventListener("focus", () => {
    void ensureSearchIndex();
    if (String(input.value || "").trim()) scheduleSearch(true);
  });

  input.addEventListener("input", () => {
    scheduleSearch();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      requestToken += 1;
      hideResults(results);
      input.blur();
      return;
    }
    if (event.key === "Enter") {
      const first = results.querySelector(".sidebar-search-result");
      if (first instanceof HTMLAnchorElement) {
        event.preventDefault();
        first.click();
      }
    }
  });

  results.addEventListener("click", () => {
    requestToken += 1;
    hideResults(results);
  });

  document.addEventListener("mousedown", (event) => {
    if (!(event.target instanceof Node)) return;
    if (root.contains(event.target)) return;
    requestToken += 1;
    hideResults(results);
  });
}

for (const root of document.querySelectorAll("[data-sidebar-search]")) {
  initSidebarSearch(root);
}
