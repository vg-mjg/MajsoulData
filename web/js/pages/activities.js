import { STATE } from '../core/state.js';
import { loadJson, getAssetUrl, loadImage } from '../core/utils.js';
import { getLocalizedName } from '../core/i18n.js';

const DOM = {
    app: document.getElementById('app-container')
};

// Activity type config
const TYPE_CONFIG = {
    'flip_task': { label: 'Flip Task', color: '#9c27b0' },
    'period_task': { label: 'Period Task', color: '#2196f3' },
    'game_task': { label: 'Game Task', color: '#4caf50' },
    'task': { label: 'Task', color: '#607d8b' },
    'exchange': { label: 'Exchange', color: '#ff9800' },
    'rank': { label: 'Rank', color: '#f44336' },
    'gacha': { label: 'Gacha', color: '#e91e63' },
    'daily_sign': { label: 'Daily Sign', color: '#00bcd4' },
    'upgrade': { label: 'Upgrade', color: '#8bc34a' },
    'combining': { label: 'Combining', color: '#795548' },
    'festival': { label: 'Festival', color: '#ff5722' },
    'sns': { label: 'SNS', color: '#673ab7' },
    'random_task': { label: 'Random Task', color: '#00acc1' },
    'feed': { label: 'Feed', color: '#26a69a' },
    'arena': { label: 'Arena', color: '#ef5350' },
    'spot': { label: 'Spot', color: '#66bb6a' },
    'simulation': { label: 'Simulation', color: '#42a5f5' },
    'liver': { label: 'Liver', color: '#7e57c2' },
    'other': { label: 'Other', color: '#9e9e9e' }
};

const DATA_FILES = [
    { name: 'ActivityActivityBanner.json', key: 'banners', idField: 'id' },
    { name: 'ActivityFlipInfo.json', key: 'flipInfo', idField: 'id' },
    { name: 'ActivityGachaActivityInfo.json', key: 'gachaInfo', idField: 'activityId' },
    { name: 'ActivityCombiningActivityInfo.json', key: 'combiningInfo', idField: 'activityId' },
    { name: 'ActivityFeedActivityInfo.json', key: 'feedInfo', idField: 'activityId' },
    { name: 'ActivitySimulationActivityInfo.json', key: 'simulationInfo', idField: 'activityId' },
    { name: 'ActivityFestivalActivity.json', key: 'festivalInfo', idField: 'activityId' },
    { name: 'ActivityIslandActivity.json', key: 'islandInfo', idField: 'activityId' },
    { name: 'ActivityBingoInfo.json', key: 'bingoInfo', idField: 'activityId' },
    { name: 'ActivityRichmanInfo.json', key: 'richmanInfo', idField: 'activityId' },
    { name: 'ActivityLiverEventInfo.json', key: 'liverInfo', idField: 'activityId' },
    { name: 'ActivityRandomTaskInfo.json', key: 'randomTaskInfo', idField: 'activityId' },
    { name: 'ActivityUpgradeActivity.json', key: 'upgradeInfo', idField: 'activityId' },
    { name: 'ActivityVillageActivityInfo.json', key: 'villageInfo', idField: 'activityId' }
];

async function loadAllActivityData() {

    if (!STATE.activities) {
        try { STATE.activities = await loadJson('ActivityActivity.json'); } catch (e) { console.error(e); }
    }

    const loadPromises = DATA_FILES.map(async (file) => {
        if (!STATE[file.key]) {
            try {
                STATE[file.key] = await loadJson(file.name);
            } catch (e) {

                STATE[file.key] = [];
            }
        }
    });

    await Promise.all(loadPromises);
}


function buildActivityMaps() {
    const maps = {};

    DATA_FILES.forEach(file => {
        maps[file.key] = {};
        const data = STATE[file.key] || [];
        data.forEach(item => {
            const id = item[file.idField];
            if (id) maps[file.key][id] = item;
        });
    });

    return maps;
}


function enrichActivity(activity, maps) {
    const id = activity.id;
    const enriched = { ...activity };

    const banner = maps.banners?.[id];
    if (banner) {
        enriched.bannerImg = banner.bannerBig || banner.bannerLeft || banner.enterIcon || null;
        enriched.bannerData = banner;
    }

    const flipInfo = maps.flipInfo?.[id];
    if (flipInfo) {
        enriched.startTime = flipInfo.startTime;
        enriched.endTime = flipInfo.endTime;
        enriched.flipCount = flipInfo.flipCount;
    }

    const gachaInfo = maps.gachaInfo?.[id];
    if (gachaInfo) {
        enriched.gachaPool = gachaInfo.gachaPool;
        enriched.spRewards = gachaInfo.spRewards;
    }

    const festivalInfo = maps.festivalInfo?.[id];
    if (festivalInfo) {
        enriched.festivalData = festivalInfo;
    }

    const islandInfo = maps.islandInfo?.[id];
    if (islandInfo) {
        enriched.islandData = islandInfo;
    }

    const combiningInfo = maps.combiningInfo?.[id];
    if (combiningInfo) {
        enriched.combiningData = combiningInfo;
    }

    const simulationInfo = maps.simulationInfo?.[id];
    if (simulationInfo) {
        enriched.simulationData = simulationInfo;
    }

    const bingoInfo = maps.bingoInfo?.[id];
    if (bingoInfo) {
        enriched.bingoData = bingoInfo;
    }

    const richmanInfo = maps.richmanInfo?.[id];
    if (richmanInfo) {
        enriched.richmanData = richmanInfo;
    }

    const upgradeInfo = maps.upgradeInfo?.[id];
    if (upgradeInfo) {
        enriched.upgradeData = upgradeInfo;
    }

    enriched.dataCount = [banner, flipInfo, gachaInfo, festivalInfo, islandInfo, combiningInfo, simulationInfo, bingoInfo, richmanInfo, upgradeInfo].filter(Boolean).length;

    return enriched;
}


export async function renderActivities() {
    DOM.app.innerHTML = `<div class="text-center py-5"><div class="spinner-border"></div><p class="mt-2">Loading activity data...</p></div>`;

    await loadAllActivityData();

    if (!STATE.activities) {
        DOM.app.innerHTML = `<div class="alert alert-danger">Failed to load activity data.</div>`;
        return;
    }

    const maps = buildActivityMaps();

    const namedActivities = STATE.activities
        .filter(a => {
            const name = a.nameEn || a.nameChs || a.nameJp || a.nameKr;
            return name && name.trim() !== '';
        })
        .map(a => enrichActivity(a, maps))
        .sort((a, b) => b.id - a.id);

    const byType = {};
    namedActivities.forEach(a => {
        const rawType = a.type || 'other';
        const t = TYPE_CONFIG[rawType] ? rawType : 'other';
        if (!byType[t]) byType[t] = [];
        byType[t].push(a);
    });

    const typeKeys = Object.keys(byType).sort((a, b) => byType[b].length - byType[a].length);

    const allBtn = `<button class="category-btn active" data-type="all">All<span class="badge">${namedActivities.length}</span></button>`;
    const typeBtns = typeKeys.map(t => {
        const cfg = TYPE_CONFIG[t] || TYPE_CONFIG['other'];
        return `<button class="category-btn" data-type="${t}">${cfg.label}<span class="badge">${byType[t].length}</span></button>`;
    }).join('');

    DOM.app.innerHTML = `
        <div class="container-fluid p-0 mb-3">
            <a href="#/" class="btn btn-outline-secondary btn-sm">
                <i class="ri-arrow-left-line me-1"></i> Home
            </a>
        </div>
        
        <div class="category-filter" id="activity-filter">
            ${allBtn}${typeBtns}
        </div>
        
        <div id="activities-grid" class="activity-grid-container"></div>
    `;

    const renderActivitiesList = (type) => {
        const grid = document.getElementById('activities-grid');
        const list = type === 'all' ? namedActivities : (byType[type] || []);

        if (list.length === 0) {
            grid.innerHTML = `<div class="text-center text-muted py-5 w-100">No activities found.</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        list.forEach(a => {
            const name = getLocalizedName(a);
            const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG['other'];

            const card = document.createElement('div');
            card.className = 'activity-card-detailed';
            card.dataset.id = a.id;

            let dateStr = '';
            if (a.startTime && a.endTime) {
                const start = a.startTime.split(' ')[0];
                const end = a.endTime.split(' ')[0];
                dateStr = `<div class="activity-date"><i class="ri-calendar-line"></i> ${start} ~ ${end}</div>`;
            }

            let bannerHtml = '';
            if (a.bannerImg) {
                bannerHtml = `<div class="activity-banner-wrapper"><img class="activity-banner-img" data-src="${a.bannerImg}" alt=""></div>`;
            }

            card.innerHTML = `
                ${bannerHtml}
                <div class="activity-card-info">
                    <div class="activity-card-header">
                        <span class="activity-type-badge" style="background: ${cfg.color}20; color: ${cfg.color};">${cfg.label}</span>
                    </div>
                    <div class="activity-card-name" title="${name}">${name}</div>
                    ${dateStr}
                </div>
            `;

            if (a.bannerImg) {
                const imgEl = card.querySelector('.activity-banner-img');
                const imgUrl = getAssetUrl(a.bannerImg);
                if (a.bannerImg.endsWith('.png')) {
                    loadImage(imgUrl).then(url => {
                        imgEl.src = url;
                    }).catch(() => {
                        imgEl.parentElement.remove();
                    });
                } else {
                    imgEl.src = imgUrl;
                    imgEl.onerror = () => imgEl.parentElement.remove();
                }
            }

            fragment.appendChild(card);
        });

        grid.innerHTML = '';
        grid.appendChild(fragment);
    };

    renderActivitiesList('all');

    document.getElementById('activity-filter').addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;

        document.querySelectorAll('#activity-filter .category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        renderActivitiesList(btn.dataset.type);
    });
}
