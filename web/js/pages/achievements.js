import { STATE } from '../core/state.js';
import { loadJson, getAssetUrl } from '../core/utils.js';
import { getLocalizedName } from '../core/i18n.js';

const DOM = {
    app: document.getElementById('app-container')
};

const RARITY_CONFIG = {
    1: { class: 'rarity-bronze', label: 'Bronze', color: '#cd7f32' },
    2: { class: 'rarity-silver', label: 'Silver', color: '#c0c0c0' },
    3: { class: 'rarity-gold', label: 'Gold', color: '#ffd700' }
};

function getLocalizedDesc(item) {
    const lang = STATE.lang || 'en';
    const map = { en: 'descEn', kr: 'descKr', jp: 'descJp', chs: 'descChs', chsT: 'descChsT' };
    const key = map[lang] || 'descEn';
    return item[key] || item.descEn || item.descChs || '';
}

export async function renderAchievements() {
    DOM.app.innerHTML = '<div class="d-flex justify-content-center pt-5"><div class="spinner-border text-primary"></div></div>';

    if (!STATE.achievements) STATE.achievements = await loadJson('AchievementAchievement.json');
    if (!STATE.achievementGroups) STATE.achievementGroups = await loadJson('AchievementAchievementGroup.json');
    if (!STATE.items) STATE.items = await loadJson('ItemDefinitionItem.json');

    if (!STATE.achievements || !STATE.achievementGroups) {
        DOM.app.innerHTML = '<div class="alert alert-danger m-3">Failed to load data.</div>';
        return;
    }

    const groups = STATE.achievementGroups
        .filter(g => g.deprecated !== 1)
        .sort((a, b) => (a.sort || 99) - (b.sort || 99));

    const achievementsByGroup = {};
    STATE.achievements.forEach(a => {
        if (a.deprecated === 1 || a.hidden === 1) return;
        const gid = a.groupId;
        if (!achievementsByGroup[gid]) achievementsByGroup[gid] = [];
        achievementsByGroup[gid].push(a);
    });

    Object.values(achievementsByGroup).forEach(arr => {
        arr.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    });

    const categoryBtns = groups.map((g, idx) => {
        const name = getLocalizedName(g);
        const count = (achievementsByGroup[g.id] || []).length;
        return `
            <button class="category-btn${idx === 0 ? ' active' : ''}" data-gid="${g.id}">
                ${name}<span class="badge">${count}</span>
            </button>
        `;
    }).join('');

    DOM.app.innerHTML = `
        <div class="container-fluid p-0 mb-3">
            <a href="#/" class="btn btn-outline-secondary btn-sm">
                <i class="ri-arrow-left-line me-1"></i> Home
            </a>
        </div>
        
        <div class="category-filter" id="achievement-filter">
            ${categoryBtns}
        </div>
        
        <div id="achievements-grid" class="achievement-grid-container"></div>
    `;

    const renderGroup = (groupId) => {
        const grid = document.getElementById('achievements-grid');
        const list = achievementsByGroup[groupId] || [];

        if (list.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No achievements found.</div>';
            return;
        }

        grid.innerHTML = list.map(a => {
            const name = getLocalizedName(a);
            const desc = getLocalizedDesc(a);
            const rConf = RARITY_CONFIG[a.rare] || RARITY_CONFIG[1];

            // Reward Parsing - Show Item Name and Count
            let rewardHtml = '';
            if (a.reward && a.reward.trim()) {
                const rewards = a.reward.split(',').map(str => {
                    const [iid, cnt] = str.split('-');
                    const item = STATE.items ? STATE.items.find(i => i.id == iid) : null;
                    const iName = item ? getLocalizedName(item) : `Item ${iid}`;
                    const iCount = cnt || 1;
                    return { name: iName, count: iCount, id: iid };
                });

                rewardHtml = rewards.map(r => `
                    <a href="#/items/${r.id}" class="achievement-reward text-decoration-none" title="View Item">
                        <i class="ri-gift-line"></i> ${r.name} x${r.count}
                    </a>
                `).join('');
            }

            return `
                <div class="achievement-card ${rConf.class}">
                    <div class="achievement-card-header">
                        <span class="achievement-rarity-badge" style="background: ${rConf.color}20; color: ${rConf.color};">
                            ${rConf.label}
                        </span>
                    </div>
                    <div class="achievement-card-body">
                        <div class="achievement-card-name" title="${name}">${name}</div>
                        <div class="achievement-card-desc" title="${desc}">${desc}</div>
                        ${rewardHtml}
                    </div>
                </div>
            `;
        }).join('');
    };

    if (groups.length > 0) renderGroup(groups[0].id);

    document.getElementById('achievement-filter').addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;

        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        renderGroup(parseInt(btn.dataset.gid));
    });
}
