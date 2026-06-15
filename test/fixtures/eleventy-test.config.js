// Minimal Eleventy config for the build-output test. It reuses the production
// universal filters but deliberately omits `dir.input`, so the temp fixture
// directory passed to the Eleventy constructor governs both template scanning
// and the `_data` cascade (the real config's `dir.input: "src"` would otherwise
// anchor `_data` back to the committed collection).

import { registerFilters } from "../../eleventy.config.js";

export default function (eleventyConfig) {
  registerFilters(eleventyConfig);
  return {
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
