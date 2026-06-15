// Minimal dropdown behaviour: a click toggles the menu's open state, an
// outside-click or Escape closes it, and aria-expanded tracks the state. Wires
// every `.dropdown` that pairs a `.dropdown-toggle` with a `.dropdown-menu` —
// today the theme switcher and the language switcher.
(function () {
  "use strict";

  const dropdowns = Array.from(document.querySelectorAll(".dropdown"))
    .map((root) => ({
      root,
      toggle: root.querySelector(".dropdown-toggle"),
      menu: root.querySelector(".dropdown-menu"),
    }))
    .filter((d) => d.toggle && d.menu);

  const close = (d) => {
    d.menu.classList.remove("show");
    d.toggle.setAttribute("aria-expanded", "false");
  };

  dropdowns.forEach((d) => {
    d.toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const willOpen = !d.menu.classList.contains("show");
      dropdowns.forEach(close);
      if (willOpen) {
        d.menu.classList.add("show");
        d.toggle.setAttribute("aria-expanded", "true");
      }
    });
    // Selecting a menu item closes the menu.
    d.menu.addEventListener("click", (event) => {
      if (event.target.closest(".dropdown-item")) close(d);
    });
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((d) => {
      if (!d.root.contains(event.target)) close(d);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dropdowns.forEach(close);
  });
})();
