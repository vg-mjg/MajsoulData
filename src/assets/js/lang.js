// Persist the locale of the page the visitor is currently on, so the bare-root
// redirect can reopen the site in the last-used language. Every locale page is a
// real URL, so simply recording the page's own `data-lang` on load makes the
// preference follow navigation without any in-page language toggle.
(function () {
  "use strict";
  var KEY = "mahjong-soul-data.language";
  try {
    var lang = document.documentElement.getAttribute("data-lang");
    if (lang) {
      localStorage.setItem(KEY, lang);
    }
  } catch (e) {
    // storage blocked (private mode, etc.) — preference just won't persist
  }
})();
