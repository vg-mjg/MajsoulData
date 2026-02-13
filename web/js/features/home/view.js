const REGION_LINKS = [
  {
    key: "jp",
    name: "Japan",
    links: [
      { label: "Website", url: "https://mahjongsoul.com/" },
      { label: "X", url: "https://x.com/MahjongSoul_JP" },
      { label: "Discord", url: "https://discord.com/invite/mahjongsoul" },
      { label: "YouTube", url: "https://www.youtube.com/@MahjongSoul_JP" },
      { label: "Twitch", url: "https://www.twitch.tv/mahjongsoul_jp" },
    ],
  },
  {
    key: "en",
    name: "English",
    links: [
      { label: "Website", url: "https://mahjongsoul.yo-star.com/" },
      { label: "Steam", url: "https://store.steampowered.com/app/2739990/" },
      { label: "X", url: "https://x.com/MahjongSoul_EN" },
      { label: "Discord", url: "https://discord.com/invite/mahjongsoul" },
      { label: "YouTube", url: "https://www.youtube.com/c/MahjongSoulOfficialYostar" },
      { label: "Twitch", url: "https://www.twitch.tv/mahjongsoulofficial" },
      { label: "Facebook", url: "https://www.facebook.com/MahjongSoulEN/" },
    ],
  },
  {
    key: "cn",
    name: "China",
    links: [
      { label: "Website", url: "https://www.maj-soul.com/#/home" },
      { label: "Steam", url: "https://store.steampowered.com/app/1329410/" },
      { label: "Bilibili", url: "https://space.bilibili.com/353240497" },
      { label: "Weibo", url: "https://weibo.com/majsoul" },
      { label: "Facebook", url: "https://www.facebook.com/MahjongSoul.TC/" },
    ],
  },
  {
    key: "kr",
    name: "Korea",
    links: [
      { label: "Website", url: "https://mahjongsoul.yo-star.com/kr/" },
      { label: "Steam", url: "https://store.steampowered.com/app/2739990/" },
      { label: "X", url: "https://x.com/MahjongSoul_KR" },
      { label: "YouTube", url: "https://www.youtube.com/@MahjongSoul_KR_Official" },
      { label: "Facebook", url: "https://www.facebook.com/MahjongSoulKR/" },
    ],
  },
];

function createRegionBlock(region, isLast) {
  const wrapper = document.createElement("section");
  wrapper.className = `home-region${isLast ? "" : " home-region-divider"}`;

  const title = document.createElement("h5");
  title.className = "home-region-title";
  title.textContent = region.name;

  const list = document.createElement("div");
  list.className = "home-region-links";

  for (const entry of region.links || []) {
    const link = document.createElement("a");
    link.className = "home-region-link";
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = entry.label;
    list.append(link);
  }

  wrapper.append(title, list);
  return wrapper;
}

export function renderHomePage({ viewRoot }) {
  viewRoot.innerHTML = "";

  const layout = document.createElement("div");
  layout.className = "home-links-layout";

  REGION_LINKS.forEach((region, index) => {
    const isLast = index === REGION_LINKS.length - 1;
    layout.append(createRegionBlock(region, isLast));
  });

  viewRoot.append(layout);
}
