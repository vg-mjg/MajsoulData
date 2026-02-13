import { normalizeUiLanguage } from "../../../utils.js";
import { makeInitials } from "../../../utils.js";
import { loadCharacterImageSource } from "../../services/asset-image-loader.js";
import { scheduleVisibleTask } from "../../services/lazy-hydration.js";
import { loadItems } from "../../services/items-data.js";

const BASE_FILTERS = [
  { id: "all", label: "All", matches: () => true },
  { id: "currency", label: "Currencies", matches: (item) => item.kind === "currency" },
  { id: "sellable", label: "Sellable", matches: (item) => item.canSell > 0 },
  {
    id: "exchange",
    label: "In Exchange",
    matches: (item) => item.usageCounts.exchangeSpend > 0 || item.usageCounts.exchangeReceive > 0,
  },
  {
    id: "package",
    label: "Package Related",
    matches: (item) => item.usageCounts.packageContents > 0 || item.usageCounts.packageContainers > 0,
  },
  {
    id: "character",
    label: "Character Related",
    matches: (item) =>
      item.usageCounts.characterExchangeUsage > 0 ||
      item.usageCounts.characterMaterialUsage > 0 ||
      item.usageCounts.composeUsage > 0,
  },
  {
    id: "source-limit",
    label: "Source Limited",
    matches: (item) => item.usageCounts.sourceLimits > 0,
  },
];

const CATEGORY_LABELS = {
  1: "Consumables",
  2: "Gifts",
  3: "Bags",
  5: "Category 5",
  6: "Event Items",
  7: "Titles",
  8: "Loading Screens",
};

const CATEGORY_ORDER = [1, 2, 3, 5, 6, 7, 8];

const COSMETIC_TYPE_LABELS = {
  0: "Riichi Bets",
  1: "Winning Effects",
  2: "Riichi Effects",
  3: "Hands",
  4: "Riichi Music",
  5: "Portrait Frames",
  6: "Tablecloths",
  7: "Tile Backs",
  8: "Backgrounds",
  9: "Music",
  10: "Tile Call Indicators",
  13: "Tile Faces",
};

function sortCategoryValues(values) {
  const orderMap = new Map(CATEGORY_ORDER.map((value, index) => [value, index]));
  return values.slice().sort((a, b) => {
    const orderA = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
    const orderB = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a - b;
  });
}

function buildFilters(items) {
  const allItems = (items || []).filter((item) => item.kind === "item");
  const hasTitleDefinitions = allItems.some((item) => item.isTitleDefinition === true);
  const categoryValues = sortCategoryValues(Array.from(
    new Set(
      allItems
        .map((item) => Number(item.category))
        .filter((value) => Number.isFinite(value)),
    ),
  ));

  const categoryFilters = categoryValues.map((categoryValue) => {
    if (categoryValue === 7 && hasTitleDefinitions) {
      return {
        id: "category-7",
        label: CATEGORY_LABELS[7] || "Category 7",
        matches: (item) =>
          item.kind === "item" &&
          Number(item.category) === 7 &&
          item.isTitleDefinition === true,
      };
    }

    return {
      id: `category-${categoryValue}`,
      label: CATEGORY_LABELS[categoryValue] || `Category ${categoryValue}`,
      matches: (item) => item.kind === "item" && Number(item.category) === categoryValue,
    };
  })
    .filter((filter) => filter.id !== "category-0" && filter.id !== "category-5");

  const cosmeticTypeValues = Array.from(
    new Set(
      allItems
        .filter((item) => Number(item.category) === 5)
        .map((item) => Number(item.type))
        .filter((value) => Number.isFinite(value)),
    ),
  ).sort((a, b) => a - b);

  const cosmeticTypeFilters = cosmeticTypeValues.map((typeValue) => ({
    id: `category-5-type-${typeValue}`,
    label: COSMETIC_TYPE_LABELS[typeValue] || `Cosmetics Type ${typeValue}`,
    matches: (item) =>
      item.kind === "item" &&
      Number(item.category) === 5 &&
      Number(item.type) === typeValue,
  }));

  return [...BASE_FILTERS, ...categoryFilters, ...cosmeticTypeFilters];
}

function localizedName(item, language) {
  const normalized = normalizeUiLanguage(language);
  const order = normalized === "jp"
    ? ["nameJp", "nameEn", "nameChsT", "nameChs", "nameKr"]
    : normalized === "kr"
      ? ["nameKr", "nameEn", "nameJp", "nameChsT", "nameChs"]
      : normalized === "chs"
        ? ["nameChs", "nameChsT", "nameEn", "nameJp", "nameKr"]
        : normalized === "chs_t"
          ? ["nameChsT", "nameChs", "nameEn", "nameJp", "nameKr"]
          : ["nameEn", "nameJp", "nameChsT", "nameChs", "nameKr"];

  for (const key of order) {
    const value = String(item[key] || "").trim();
    if (value) return value;
  }
  return `#${item.id}`;
}

function createIconPlaceholder(name) {
  const placeholder = document.createElement("div");
  placeholder.className = "item-icon placeholder";
  placeholder.textContent = makeInitials(name);
  return placeholder;
}

function hydrateItemImage(item, placeholder, name) {
  if (!Array.isArray(item.imageCandidates) || item.imageCandidates.length === 0) return;

  scheduleVisibleTask(placeholder, async () => {
    if (!placeholder.isConnected) return;

    const source = await loadCharacterImageSource(item.imageCandidates);
    if (!source || !placeholder.isConnected) return;

    const image = document.createElement("img");
    image.className = "item-icon";
    image.src = source;
    image.alt = name;
    image.loading = "lazy";
    image.decoding = "async";
    placeholder.replaceWith(image);
  });
}

function createItemCard(item, language, onOpenDetail) {
  const name = localizedName(item, language);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "item-card item-card-button";
  card.addEventListener("click", () => {
    if (typeof onOpenDetail === "function") {
      onOpenDetail(item.id);
    }
  });

  const placeholder = createIconPlaceholder(name);
  card.append(placeholder);
  hydrateItemImage(item, placeholder, name);

  const title = document.createElement("p");
  title.className = "item-name text-truncate";
  title.textContent = name;

  card.append(title);
  return card;
}

function countByFilter(items, filters) {
  const counts = {};
  for (const filter of filters || []) {
    counts[filter.id] = items.filter((item) => filter.matches(item)).length;
  }
  return counts;
}

function sortFiltersByCount(filters, counts) {
  return (filters || []).slice().sort((left, right) => {
    const leftCount = Number(counts[left.id] || 0);
    const rightCount = Number(counts[right.id] || 0);
    if (leftCount !== rightCount) return rightCount - leftCount;
    return String(left.label).localeCompare(String(right.label));
  });
}

function createFilterButtons(filters, activeFilterId, counts, onClick) {
  const container = document.createElement("div");
  container.className = "item-filters";

  for (const filter of filters || []) {
    const isActive = filter.id === activeFilterId;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-sm character-filter-btn ${isActive ? "btn-secondary" : "btn-outline-secondary"}`;
    button.textContent = `${filter.label} (${counts[filter.id] || 0})`;
    button.addEventListener("click", () => onClick(filter.id));
    container.append(button);
  }

  return container;
}

function renderFilteredGrid({ root, items, filters, filterId, language, onOpenDetail }) {
  const selectedFilter = (filters || []).find((filter) => filter.id === filterId) || (filters || [])[0];
  const filtered = items.filter((item) => selectedFilter.matches(item));

  root.innerHTML = "";
  if (filtered.length === 0) {
    root.innerHTML = `<div class="empty-result">No items in this filter.</div>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "item-grid";
  for (const item of filtered) {
    grid.append(createItemCard(item, language, onOpenDetail));
  }
  root.append(grid);
}

export async function renderItemsPage({ viewRoot, getLanguage, onOpenDetail }) {
  viewRoot.innerHTML = `<div class="empty-result">Loading items...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const items = await loadItems(language);

    if (!items || items.length === 0) {
      viewRoot.innerHTML = `<div class="empty-result">No items found.</div>`;
      return;
    }

    viewRoot.innerHTML = "";
    let activeFilterId = "all";
    const filters = buildFilters(items);
    const filterCounts = countByFilter(items, filters);
    const sortedFilters = sortFiltersByCount(filters, filterCounts);

    const filterRoot = document.createElement("div");
    const gridRoot = document.createElement("div");

    const render = () => {
      filterRoot.replaceChildren(
        createFilterButtons(sortedFilters, activeFilterId, filterCounts, (nextFilterId) => {
          if (nextFilterId === activeFilterId) return;
          activeFilterId = nextFilterId;
          render();
        }),
      );
      renderFilteredGrid({
        root: gridRoot,
        items,
        filters,
        filterId: activeFilterId,
        language,
        onOpenDetail,
      });
    };

    render();
    viewRoot.append(filterRoot, gridRoot);
  } catch (error) {
    console.error(error);
    viewRoot.innerHTML = `<div class="empty-result">Failed to load items.</div>`;
  }
}
