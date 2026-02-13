import { loadCharacters } from "../../services/characters-data.js";
import { loadCharacterImageSource } from "../../services/asset-image-loader.js";
import { scheduleVisibleTask } from "../../services/lazy-hydration.js";
import { characterDisplayName, makeInitials } from "../../../utils.js";

const FILTERS = [
  {
    id: "all",
    label: "All",
    matches: () => true,
  },
  {
    id: "standard",
    label: "Standard",
    matches: (character) => character.collaboration === 0 && character.limited === 0,
  },
  {
    id: "limited",
    label: "Limited",
    matches: (character) => character.collaboration === 0 && character.limited > 0,
  },
  {
    id: "collaboration",
    label: "Collaboration",
    matches: (character) => character.collaboration > 0,
  },
];

function createCharacterPlaceholder(name) {
  const placeholder = document.createElement("div");
  placeholder.className = "character-avatar placeholder";
  placeholder.textContent = makeInitials(name);
  return placeholder;
}

function hydrateCharacterImage(character, placeholder, displayName) {
  if (!character.imageCandidates || character.imageCandidates.length === 0) {
    return;
  }

  scheduleVisibleTask(placeholder, async () => {
    if (!placeholder.isConnected) return;

    const source = await loadCharacterImageSource(character.imageCandidates);
    if (!source || !placeholder.isConnected) return;

    const image = document.createElement("img");
    image.className = "character-avatar";
    image.src = source;
    image.alt = displayName;
    image.loading = "lazy";
    image.decoding = "async";

    placeholder.replaceWith(image);
  });
}

function createCharacterCard(character, language, onOpenDetail) {
  const displayName = characterDisplayName(character, language);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "character-card character-card-button";
  card.addEventListener("click", () => {
    if (typeof onOpenDetail === "function") {
      onOpenDetail(character.id);
    }
  });

  const placeholder = createCharacterPlaceholder(displayName);
  card.append(placeholder);
  hydrateCharacterImage(character, placeholder, displayName);

  const name = document.createElement("p");
  name.className = "character-name text-truncate";
  name.textContent = displayName;

  card.append(name);

  return card;
}

function countByFilter(characters) {
  const counts = {};
  for (const filter of FILTERS) {
    counts[filter.id] = characters.filter((character) => filter.matches(character)).length;
  }
  return counts;
}

function createFilterButtons(activeFilterId, counts, onClick) {
  const container = document.createElement("div");
  container.className = "character-filters";

  for (const filter of FILTERS) {
    const button = document.createElement("button");
    const isActive = filter.id === activeFilterId;
    const count = counts[filter.id] || 0;
    button.type = "button";
    button.className = `btn btn-sm character-filter-btn ${isActive ? "btn-secondary" : "btn-outline-secondary"}`;
    button.textContent = `${filter.label} (${count})`;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.addEventListener("click", () => onClick(filter.id));
    container.append(button);
  }

  return container;
}

function renderFilteredGrid({ root, characters, language, filterId, onOpenDetail }) {
  const selectedFilter = FILTERS.find((filter) => filter.id === filterId) || FILTERS[0];
  const filteredCharacters = characters.filter((character) => selectedFilter.matches(character));

  root.innerHTML = "";
  if (filteredCharacters.length === 0) {
    root.innerHTML = `<div class="empty-result">No characters in this filter.</div>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "character-grid";
  for (const character of filteredCharacters) {
    grid.append(createCharacterCard(character, language, onOpenDetail));
  }
  root.append(grid);
}

export async function renderCharactersPage({ viewRoot, getLanguage, onOpenDetail }) {
  viewRoot.innerHTML = `<div class="empty-result">Loading characters...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const characters = await loadCharacters(language);

    if (characters.length === 0) {
      viewRoot.innerHTML = `<div class="empty-result">No characters found.</div>`;
      return;
    }

    viewRoot.innerHTML = "";
    let activeFilterId = "all";
    const filterCounts = countByFilter(characters);

    const filterRoot = document.createElement("div");
    const gridRoot = document.createElement("div");

    const render = () => {
      filterRoot.replaceChildren(
        createFilterButtons(activeFilterId, filterCounts, (nextFilterId) => {
          if (nextFilterId === activeFilterId) return;
          activeFilterId = nextFilterId;
          render();
        }),
      );
      renderFilteredGrid({
        root: gridRoot,
        characters,
        language,
        filterId: activeFilterId,
        onOpenDetail,
      });
    };

    render();

    viewRoot.append(filterRoot, gridRoot);
  } catch (error) {
    console.error(error);
    viewRoot.innerHTML = `<div class="empty-result">Failed to load character data.</div>`;
  }
}
