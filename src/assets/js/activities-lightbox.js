// Activities lightbox. The index renders complete, lazily-loaded banner images as
// static HTML; this island only adds the click-to-zoom overlay. One overlay is
// lazily created and shared by every card. Cards opt in with `data-lightbox-src`
// (and an optional `data-lightbox-alt`), so a card whose image fails to load can
// simply omit the attribute and stay inert.

let overlay = null;
let overlayImage = null;

function close() {
  if (!overlay) return;
  overlay.classList.add("d-none");
  overlayImage.src = "";
  overlayImage.alt = "";
}

function ensureOverlay() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.className = "activity-lightbox d-none";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "activity-lightbox-close";
  closeButton.setAttribute("aria-label", "Close image preview");
  closeButton.textContent = "×";
  overlay.append(closeButton);

  overlayImage = document.createElement("img");
  overlayImage.className = "activity-lightbox-image";
  overlay.append(overlayImage);

  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.classList.contains("d-none")) close();
  });

  document.body.append(overlay);
}

function open(src, alt) {
  if (!src) return;
  ensureOverlay();
  overlayImage.src = src;
  overlayImage.alt = alt || "Activity image";
  overlay.classList.remove("d-none");
}

function init() {
  const cards = document.querySelectorAll("[data-lightbox-src]");
  for (const card of cards) {
    card.addEventListener("click", () => open(card.dataset.lightboxSrc, card.dataset.lightboxAlt));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(card.dataset.lightboxSrc, card.dataset.lightboxAlt);
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
