export const STATE = {
    // Data caches
    characters: null,
    items: null,
    skins: null,
    chestShop: null,
    resVersion: null,
    emojis: null,
    itemDefs: null,
    currencies: null,

    // Achievement data
    achievements: null,
    achievementGroups: null,

    // Activity data
    activities: null,
    banners: null,
    flipInfo: null,
    gachaInfo: null,
    combiningInfo: null,
    feedInfo: null,
    simulationInfo: null,
    festivalInfo: null,
    islandInfo: null,
    bingoInfo: null,
    richmanInfo: null,
    liverInfo: null,
    randomTaskInfo: null,
    upgradeInfo: null,
    villageInfo: null,

    // CatChat data
    sns: null,
    strEvent: null,

    // Character detail data
    voiceSound: null,
    spotSpot: null,
    spotRewards: null,

    // Item detail data
    loadingImages: null,
    audioBgm: null,
    itemViews: null,
    titlesLoaded: false,

    // App state
    route: '',
    lang: localStorage.getItem('majsoul-lang') || 'en',
    currentCharSkins: null,
    currentCharData: null
};

export function setLang(lang) {
    STATE.lang = lang;
    localStorage.setItem('majsoul-lang', lang);
}
