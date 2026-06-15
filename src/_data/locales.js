// The five UI locales the site is generated for. `code` is the app/game locale
// (used as the URL prefix and persisted preference); it is deliberately NOT a
// valid ISO-639-1/BCP-47 tag for jp/chs/chs_t/kr, which is why localization runs
// through our own engine-agnostic `locale_url`/`locale_links` filters rather than
// the bundled EleventyI18nPlugin. `htmlLang` is the closest real BCP-47 tag for
// the `<html lang>` attribute, and `fontQuery` is the single Google Fonts family
// each locale page links.
export default [
  {
    code: "en",
    label: "English",
    htmlLang: "en",
    font: "Noto Sans",
    fontQuery: "Noto+Sans:wght@400;500;600;700",
  },
  {
    code: "jp",
    label: "日本語",
    htmlLang: "ja",
    font: "Noto Sans JP",
    fontQuery: "Noto+Sans+JP:wght@400;500;700",
  },
  {
    code: "chs",
    label: "简体中文",
    htmlLang: "zh-Hans",
    font: "Noto Sans SC",
    fontQuery: "Noto+Sans+SC:wght@400;500;700",
  },
  {
    code: "chs_t",
    label: "繁體中文",
    htmlLang: "zh-Hant",
    font: "Noto Sans TC",
    fontQuery: "Noto+Sans+TC:wght@400;500;700",
  },
  {
    code: "kr",
    label: "한국어",
    htmlLang: "ko",
    font: "Noto Sans KR",
    fontQuery: "Noto+Sans+KR:wght@400;500;700",
  },
];
