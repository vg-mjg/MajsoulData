import { makeInitials } from "../../../utils.js";
import { loadCharacterImageSource } from "../../services/asset-image-loader.js";
import { scheduleVisibleTask } from "../../services/lazy-hydration.js";
import { loadCatChatData } from "../../services/catchat-data.js";

const MAO_AVATAR_URL = new URL("../../../mao.png", import.meta.url).href;
let lightboxRoot = null;
let lightboxImage = null;

function createImagePlaceholder(className, text) {
  const placeholder = document.createElement("div");
  placeholder.className = `${className} placeholder`;
  placeholder.textContent = text;
  return placeholder;
}

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
  lightboxImage.alt = altText || "CatChat image";
  lightboxRoot.classList.remove("d-none");
}

function applyImageElement(image, source, altText, imageClassName, { clickable = false } = {}) {
  image.className = imageClassName;
  image.src = source;
  image.alt = altText;
  if (clickable) {
    image.classList.add("is-clickable");
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.addEventListener("click", () => openLightbox(source, altText));
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(source, altText);
      }
    });
  }
}

function hydrateImage(placeholder, candidates, altText, imageClassName, options = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return;

  scheduleVisibleTask(placeholder, async () => {
    if (!placeholder.isConnected) return;

    const source = await loadCharacterImageSource(candidates);
    if (!source || !placeholder.isConnected) return;

    const image = document.createElement("img");
    image.loading = "lazy";
    image.decoding = "async";
    applyImageElement(image, source, altText, imageClassName, options);
    placeholder.replaceWith(image);
  });
}

function createMetaBadge(text, className = "") {
  const badge = document.createElement("span");
  badge.className = `catchat-entry-badge ${className}`.trim();
  badge.textContent = text;
  return badge;
}

function createUnlockBlock(unlock) {
  if (!unlock || unlock.id <= 0) return null;

  const block = document.createElement("div");
  block.className = "catchat-unlock";

  const iconCandidates = Array.isArray(unlock.iconCandidates) ? unlock.iconCandidates : [];
  const iconPlaceholder = createImagePlaceholder("catchat-unlock-icon", makeInitials(unlock.name || `#${unlock.id}`));
  block.append(iconPlaceholder);
  hydrateImage(
    iconPlaceholder,
    iconCandidates,
    unlock.name ? `${unlock.name} icon` : `Item #${unlock.id} icon`,
    "catchat-unlock-icon",
  );

  const label = document.createElement("span");
  label.className = "catchat-unlock-text";
  const countText = unlock.count > 0 ? ` x${unlock.count}` : "";
  label.textContent = `Unlock: ${unlock.name || `#${unlock.id}`}${countText}`;
  block.append(label);

  return block;
}

function createEntryImages(entry, useHeadAsAvatar) {
  const wrap = document.createElement("div");
  wrap.className = "catchat-entry-images";

  const imageJobs = [];
  for (const image of entry.images || []) {
    imageJobs.push({
      key: image.path,
      candidates: image.candidates,
      alt: `${entry.authorName} image`,
      className: "catchat-entry-image",
      fallbackText: makeInitials(entry.authorName),
    });
  }

  if (!useHeadAsAvatar && Array.isArray(entry.contentHeadCandidates) && entry.contentHeadCandidates.length > 0) {
    imageJobs.push({
      key: `head:${entry.id}`,
      candidates: entry.contentHeadCandidates,
      alt: `${entry.authorName} profile image`,
      className: "catchat-entry-image",
      fallbackText: makeInitials(entry.authorName),
    });
  }

  if (imageJobs.length === 0) return null;

  for (const job of imageJobs) {
    const placeholder = createImagePlaceholder("catchat-entry-image", job.fallbackText);
    wrap.append(placeholder);
    hydrateImage(placeholder, job.candidates, job.alt, job.className, { clickable: true });
  }

  return wrap;
}

function createSystemEntryNode(entry, depth = 0) {
  const node = document.createElement("article");
  node.className = "catchat-system-entry";
  if (depth > 0) node.classList.add("is-reply");
  node.textContent = entry.text;

  if (Array.isArray(entry.children) && entry.children.length > 0) {
    const children = document.createElement("div");
    children.className = "catchat-entry-children";
    for (const child of entry.children) {
      children.append(createEntryNode(child, depth + 1));
    }
    node.append(children);
  }

  return node;
}

function createEntryNode(entry, depth = 0) {
  if (entry.kind === "system") {
    return createSystemEntryNode(entry, depth);
  }

  const node = document.createElement("article");
  node.className = `catchat-entry catchat-entry-${entry.kind}`;
  if (entry.isPrivate) node.classList.add("is-private");
  if (depth > 0) node.classList.add("is-reply");

  const header = document.createElement("div");
  header.className = "catchat-entry-header";

  const avatarCandidates = Array.isArray(entry.authorAvatarCandidates) ? entry.authorAvatarCandidates : [];
  const headCandidates = Array.isArray(entry.contentHeadCandidates) ? entry.contentHeadCandidates : [];
  const useHeadAsAvatar = avatarCandidates.length === 0 && headCandidates.length > 0;
  const finalAvatarCandidates = useHeadAsAvatar ? headCandidates : avatarCandidates;

  const avatar = createImagePlaceholder("catchat-entry-avatar", makeInitials(entry.authorName));
  header.append(avatar);
  if (entry.authorKind === "player") {
    const image = document.createElement("img");
    applyImageElement(image, MAO_AVATAR_URL, "Player avatar", "catchat-entry-avatar");
    avatar.replaceWith(image);
  } else {
    hydrateImage(
      avatar,
      finalAvatarCandidates,
      `${entry.authorName} avatar`,
      "catchat-entry-avatar",
    );
  }

  const titleWrap = document.createElement("div");
  titleWrap.className = "catchat-entry-title-wrap";
  const author = document.createElement("p");
  author.className = "catchat-entry-author";
  author.textContent = entry.authorName;
  titleWrap.append(author);

  const meta = document.createElement("div");
  meta.className = "catchat-entry-meta";
  if (entry.likes > 0) {
    meta.append(createMetaBadge(`Likes ${entry.likes}`));
  }
  if (entry.kind === "choice" && entry.choiceId > 0) {
    meta.append(createMetaBadge(`Choice ${entry.choiceId}`, "choice"));
  }
  if (entry.isPrivate) {
    meta.append(createMetaBadge("PM", "private"));
  }
  titleWrap.append(meta);
  header.append(titleWrap);
  node.append(header);

  const content = document.createElement("p");
  content.className = "catchat-entry-text detail-preline";
  if (entry.replyToName) {
    const mention = document.createElement("span");
    mention.className = "catchat-reply-mention";
    mention.textContent = `@${entry.replyToName} `;
    content.append(mention, document.createTextNode(entry.text));
  } else {
    content.textContent = entry.text;
  }
  node.append(content);

  const unlockBlock = createUnlockBlock(entry.unlock);
  if (unlockBlock) {
    node.append(unlockBlock);
  }

  const imageWrap = createEntryImages(entry, useHeadAsAvatar);
  if (imageWrap) {
    node.append(imageWrap);
  }

  if (Array.isArray(entry.children) && entry.children.length > 0) {
    const children = document.createElement("div");
    children.className = "catchat-entry-children";
    for (const child of entry.children) {
      children.append(createEntryNode(child, depth + 1));
    }
    node.append(children);
  }

  return node;
}

function createScenarioCard(activity) {
  const section = document.createElement("section");
  section.className = "catchat-scenario";

  const threadList = document.createElement("div");
  threadList.className = "catchat-thread-list";

  if (!Array.isArray(activity.threads) || activity.threads.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-result";
    empty.textContent = "No CatChat entries found for this activity.";
    threadList.append(empty);
  } else {
    for (const thread of activity.threads) {
      threadList.append(createEntryNode(thread));
    }
  }

  section.append(threadList);
  return section;
}

function createFilterButtons(activities, activeId, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "catchat-filters";

  for (const activity of activities) {
    const isActive = activity.id === activeId;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-sm character-filter-btn ${isActive ? "btn-secondary" : "btn-outline-secondary"}`;
    button.textContent = `#${activity.id}`;
    button.addEventListener("click", () => onChange(activity.id));
    wrap.append(button);
  }

  return wrap;
}

export async function renderCatChatPage({ viewRoot, getLanguage }) {
  viewRoot.innerHTML = `<div class="empty-result">Loading CatChat...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const data = await loadCatChatData(language);
    const activities = Array.isArray(data.activities) ? data.activities : [];

    if (activities.length === 0) {
      viewRoot.innerHTML = `<div class="empty-result">No CatChat data found.</div>`;
      return;
    }

    viewRoot.innerHTML = "";
    let activeActivityId = activities[0].id;

    const filterRoot = document.createElement("div");
    const contentRoot = document.createElement("div");

    const render = () => {
      filterRoot.replaceChildren(
        createFilterButtons(activities, activeActivityId, (nextId) => {
          if (nextId === activeActivityId) return;
          activeActivityId = nextId;
          render();
        }),
      );

      contentRoot.innerHTML = "";
      const activeActivity = data.activityById.get(activeActivityId);
      if (!activeActivity) {
        contentRoot.innerHTML = `<div class="empty-result">Selected CatChat activity not found.</div>`;
        return;
      }
      contentRoot.append(createScenarioCard(activeActivity));
    };

    render();
    viewRoot.append(filterRoot, contentRoot);
  } catch (error) {
    console.error(error);
    viewRoot.innerHTML = `<div class="empty-result">Failed to load CatChat data.</div>`;
  }
}
