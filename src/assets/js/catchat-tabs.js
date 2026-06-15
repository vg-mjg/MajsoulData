const roots = document.querySelectorAll("[data-catchat-root]");

function setActive(root, id) {
  for (const button of root.querySelectorAll("[data-catchat-tab]")) {
    const active = button.dataset.catchatTab === id;
    button.classList.toggle("btn-secondary", active);
    button.classList.toggle("btn-outline-secondary", !active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  }

  for (const panel of root.querySelectorAll("[data-catchat-panel]")) {
    panel.hidden = panel.dataset.catchatPanel !== id;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("tab", id);
  window.history.replaceState({}, "", url);
}

function initTabs(root) {
  const buttons = Array.from(root.querySelectorAll("[data-catchat-tab]"));
  const ids = new Set(buttons.map((button) => button.dataset.catchatTab));
  const requested = new URLSearchParams(window.location.search).get("tab");
  if (requested && ids.has(requested)) setActive(root, requested);

  for (const button of buttons) {
    button.addEventListener("click", () => setActive(root, button.dataset.catchatTab));
  }
}

function openLightbox(src, alt) {
  let root = document.querySelector(".catchat-lightbox");
  if (!root) {
    root = document.createElement("div");
    root.className = "catchat-lightbox d-none";
    root.innerHTML = `
      <button type="button" class="catchat-lightbox-close" aria-label="Close image preview">×</button>
      <img class="catchat-lightbox-image" alt="" />
    `;
    document.body.append(root);
    const close = () => {
      root.classList.add("d-none");
      root.querySelector("img").removeAttribute("src");
    };
    root.querySelector("button").addEventListener("click", close);
    root.addEventListener("click", (event) => {
      if (event.target === root) close();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  const image = root.querySelector("img");
  image.src = src;
  image.alt = alt || "CatChat image";
  root.classList.remove("d-none");
}

for (const root of roots) {
  initTabs(root);
  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-lightbox-src]");
    if (target) openLightbox(target.dataset.lightboxSrc, target.dataset.lightboxAlt);
  });
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest("[data-lightbox-src]");
    if (!target) return;
    event.preventDefault();
    openLightbox(target.dataset.lightboxSrc, target.dataset.lightboxAlt);
  });
}
