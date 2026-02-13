import { makeInitials } from "../../../utils.js";
import { loadCharacterImageSource } from "../../services/asset-image-loader.js";
import { scheduleVisibleTask } from "../../services/lazy-hydration.js";
import { loadActivitiesData } from "../../services/activities-data.js";

let lightboxRoot = null;
let lightboxImage = null;

function ensureLightbox() {
  if (lightboxRoot && lightboxImage) return;

  const root = document.createElement("div");
  root.className = "catchat-lightbox d-none";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "catchat-lightbox-close";
  closeButton.setAttribute("aria-label", "Close image preview");
  closeButton.textContent = "×";
  root.append(closeButton);

  const image = document.createElement("img");
  image.className = "catchat-lightbox-image";
  root.append(image);

  const close = () => {
    root.classList.add("d-none");
    image.src = "";
    image.alt = "";
  };

  closeButton.addEventListener("click", close);
  root.addEventListener("click", (event) => {
    if (event.target === root) {
      close();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !root.classList.contains("d-none")) {
      close();
    }
  });

  document.body.append(root);
  lightboxRoot = root;
  lightboxImage = image;
}

function openLightbox(source, altText) {
  if (!source) return;
  ensureLightbox();
  if (!lightboxRoot || !lightboxImage) return;
  lightboxImage.src = source;
  lightboxImage.alt = altText || "Activity image";
  lightboxRoot.classList.remove("d-none");
}

function createActivityPlaceholder(name) {
  const placeholder = document.createElement("div");
  placeholder.className = "activity-thumb placeholder";
  placeholder.textContent = makeInitials(name);
  return placeholder;
}

function hydrateActivityImage(activity, placeholder, altText, onResolved) {
  if (!Array.isArray(activity.bannerCandidates) || activity.bannerCandidates.length === 0) return;

  scheduleVisibleTask(placeholder, async () => {
    if (!placeholder.isConnected) return;

    const source = await loadCharacterImageSource(activity.bannerCandidates);
    if (!source || !placeholder.isConnected) return;

    const image = document.createElement("img");
    image.className = "activity-thumb is-clickable";
    image.src = source;
    image.alt = altText;
    image.loading = "lazy";
    image.decoding = "async";
    placeholder.replaceWith(image);
    if (typeof onResolved === "function") {
      onResolved(source);
    }
  });
}

function createActivityCard(activity) {
  const card = document.createElement("article");
  card.className = "activity-card";

  const placeholder = createActivityPlaceholder(activity.name);
  card.append(placeholder);
  hydrateActivityImage(activity, placeholder, activity.name, (source) => {
    const openPreview = () => openLightbox(source, activity.name);
    card.classList.add("is-previewable");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${activity.name} image preview`);
    card.addEventListener("click", openPreview);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPreview();
      }
    });
  });

  const name = document.createElement("p");
  name.className = "activity-name";
  name.textContent = activity.name;

  card.append(name);
  return card;
}

function renderActivityGrid(root, activities) {
  root.innerHTML = "";
  const filtered = activities || [];

  if (filtered.length === 0) {
    root.innerHTML = `<div class="empty-result">No activities found.</div>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "activity-grid";
  for (const activity of filtered) {
    grid.append(createActivityCard(activity));
  }
  root.append(grid);
}

export async function renderActivitiesPage({ viewRoot, getLanguage }) {
  viewRoot.innerHTML = `<div class="empty-result">Loading activities...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const data = await loadActivitiesData(language);

    if (!Array.isArray(data.activities) || data.activities.length === 0) {
      viewRoot.innerHTML = `<div class="empty-result">No activities found.</div>`;
      return;
    }

    viewRoot.innerHTML = "";
    const gridRoot = document.createElement("div");

    renderActivityGrid(gridRoot, data.activities);
    viewRoot.append(gridRoot);
  } catch (error) {
    console.error(error);
    viewRoot.innerHTML = `<div class="empty-result">Failed to load activity data.</div>`;
  }
}
