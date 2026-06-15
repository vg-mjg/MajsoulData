import locales from "./src/_data/locales.js";
import { localizeText, regionForLanguage, resolveResourceUrl } from "./lib/localization.js";

const localeCodes = locales.map((locale) => locale.code);

// First non-empty path segment, if it is one of our locale codes.
function currentLocaleCode(url) {
  const parts = String(url || "").split("/").filter(Boolean);
  return localeCodes.includes(parts[0]) ? parts[0] : "";
}

// Swap the locale segment of a (path-prefix-less) URL to another locale. Sibling
// locale pages live at parallel URLs (`/en/...` <-> `/jp/...`), so a prefix swap
// is all that is needed. Pipe the result through `| url` to add the path prefix.
function localeUrl(url, code) {
  const parts = String(url || "").split("/");
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] !== "") {
      parts[i] = code;
      break;
    }
  }
  return parts.join("/");
}

// All locales other than the current one, each with the sibling URL — the data
// behind the language switcher. Our locale codes (jp/chs/chs_t/kr) are not valid
// ISO-639-1 tags, so the bundled EleventyI18nPlugin's locale_links would reject
// them; these engine-agnostic universal filters take its place and stay v4-ready.
function localeLinks(url) {
  const current = currentLocaleCode(url);
  return locales
    .filter((locale) => locale.code !== current)
    .map((locale) => ({
      code: locale.code,
      label: locale.label,
      htmlLang: locale.htmlLang,
      url: localeUrl(url, locale.code),
    }));
}

function hasVersionFields(entry) {
  return Boolean(entry && entry.product_version && entry.resource_version);
}

export function gameVersionLabel(versions, code) {
  if (!versions || typeof versions !== "object") return "-";
  const region = regionForLanguage(code);
  const entry = hasVersionFields(versions[region]) ? versions[region] : versions.en;
  if (!hasVersionFields(entry)) return "-";
  return `${entry.product_version} (${entry.resource_version})`;
}

// The universal filters, registered separately so the build-output test can
// drive Eleventy over a fixture input directory with the identical filter set
// (without inheriting this config's hardcoded `dir.input`).
export function registerFilters(eleventyConfig) {
  eleventyConfig.addFilter("locale_url", localeUrl);
  eleventyConfig.addFilter("locale_links", localeLinks);
  eleventyConfig.addFilter("game_version_label", gameVersionLabel);

  // Resolve a per-language text map `{en, jp, …}` to a string for `code`, using
  // the documented fallback chain. Shared with the ingest pipeline so text reads
  // identically in both stages.
  eleventyConfig.addFilter("localize", (textMap, code) => localizeText(textMap, code));

  // Resolve a baked asset value-map (string | {region: url}) to the URL for
  // `code`, applying the region/locale fallback chain.
  eleventyConfig.addFilter("asset", (value, code) => resolveResourceUrl(value, code));

  const itemFilterKey = (value) =>
    String(value || "Other")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  eleventyConfig.addFilter("item_filter_key", itemFilterKey);

  eleventyConfig.addFilter("item_category_groups", (items) => {
    const groups = new Map();
    for (const item of items || []) {
      const label = item && item.categoryLabel ? String(item.categoryLabel) : "Other";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(item);
    }
    return Array.from(groups.entries())
      .map(([label, list]) => ({ label, key: itemFilterKey(label), list }))
      .sort((a, b) => b.list.length - a.list.length || a.label.localeCompare(b.label));
  });

  eleventyConfig.addFilter("readable_item_label", (value) =>
    String(value || "").replace(/(\d)([A-Za-z])/g, "$1 $2"),
  );
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/@esotericsoftware/spine-player/dist/iife/spine-player.min.js":
      "assets/vendor/spine-player/spine-player.min.js",
  });
  registerFilters(eleventyConfig);

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    pathPrefix: "/MajsoulData/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
