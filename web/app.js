import { STATE, setLang } from './js/core/state.js';
import { loadJson, getAssetUrl, loadImage } from './js/core/utils.js';
import { getLocalizedName } from './js/core/i18n.js';
import { renderCharacterDetail } from './js/pages/character.js';
import { renderItemsList, renderItemDetail } from './js/pages/items.js';
import { renderCatChat } from './js/pages/catchat.js';
import { renderAchievements } from './js/pages/achievements.js';
import { renderActivities } from './js/pages/activities.js';

const DOM = {
    app: document.getElementById('app-container'),
    langSelect: document.getElementById('language-select')
};

function renderHome() {
    updateSidebarActive('');
    DOM.app.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center" style="height: 80vh;">
            <div class="d-flex gap-4">
                <a href="https://github.com/4n3u/MajsoulData" target="_blank" class="text-decoration-none social-icon-link" title="GitHub">
                    <i class="ri-github-fill" style="font-size: 4rem;"></i>
                </a>
                <a href="https://discord.com/users/245702966085025802" target="_blank" class="text-decoration-none social-icon-link" title="Discord">
                    <i class="ri-discord-fill" style="font-size: 4rem;"></i>
                </a>
                <a href="https://x.com/xflVsSnvB6cx8ZM" target="_blank" class="text-decoration-none social-icon-link" title="X (Twitter)">
                    <i class="ri-twitter-x-fill" style="font-size: 4rem;"></i>
                </a>
            </div>
        </div>
    `;
}

function createGridSection(title, data, type) {
    if (!data || data.length === 0) return document.createDocumentFragment();

    const section = document.createElement('div');
    section.className = 'container-fluid p-0 mb-5';

    section.innerHTML = `
        <div class="page-header">
            <h2 class="page-title">
                ${title}
                <span class="page-count">${data.length}</span>
            </h2>
        </div>
        <div class="char-grid-container"></div>
    `;

    const grid = section.querySelector('.char-grid-container');
    const fragment = document.createDocumentFragment();

    for (const item of data) {
        const name = getLocalizedName(item);
        let iconPath = '';
        let link = '';

        if (type === 'char') {
            let skinIcon = '';
            if (STATE.skins && item.initSkin) {
                const skin = STATE.skins.find(s => s.id === item.initSkin);
                if (skin) skinIcon = `${skin.path}/bighead.png`;
            }
            iconPath = skinIcon;
            link = `#/characters/${item.id}`;
        } else if (type === 'item') {
            iconPath = item.icon;
            link = '#';
        }

        const card = document.createElement('a');
        card.href = link;
        card.className = 'char-card';
        card.innerHTML = `
            <div class="char-card-img-wrapper">
                <img class="char-card-img" loading="lazy" data-src="${iconPath}" alt="${name}">
            </div>
            <div class="char-card-name" title="${name}">${name}</div>
        `;
        fragment.appendChild(card);
    }
    grid.appendChild(fragment);

    // Image Loading
    const imgs = grid.querySelectorAll('.char-card-img');
    imgs.forEach(img => {
        const url = getAssetUrl(img.dataset.src);
        if (url) loadImage(img, url);
    });

    return section;
}

function updateSidebarActive(route) {
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.route === route) el.classList.add('active');
    });
}

// --- Router ---

async function router() {
    const hash = window.location.hash || '#/';
    STATE.route = hash;

    const charDetailMatch = hash.match(/^#\/characters\/(\d+)$/);
    const itemDetailMatch = hash.match(/^#\/items\/(\d+)$/);


    try {
        if (!STATE.resVersion) {
            const res = await fetch('./resversion.json');
            if (!res.ok) throw new Error('Failed to load resversion.json');
            STATE.resVersion = await res.json();
        }

        if (hash === '#/' || hash === '') {
            renderHome();
        }
        else if (charDetailMatch) {
            updateSidebarActive('characters');
            await renderCharacterDetail(charDetailMatch[1]);
        }
        else if (itemDetailMatch) {
            updateSidebarActive('items');
            await renderItemDetail(itemDetailMatch[1]);
        }

        else if (hash === '#/characters') {
            updateSidebarActive('characters');
            if (!STATE.characters) STATE.characters = await loadJson('ItemDefinitionCharacter.json');
            if (!STATE.skins) try { STATE.skins = await loadJson('ItemDefinitionSkin.json'); } catch (e) { }

            // Group characters by category
            const all = STATE.characters;
            const standard = STATE.characters.filter(c => !c.limited && !c.collaboration);
            const limited = STATE.characters.filter(c => c.limited && !c.collaboration);
            const collab = STATE.characters.filter(c => c.collaboration);

            const categories = {
                all: { name: 'All', data: all },
                standard: { name: 'Standard', data: standard },
                limited: { name: 'Limited', data: limited },
                collaboration: { name: 'Collaboration', data: collab }
            };

            // Build category buttons
            const categoryBtns = Object.entries(categories).map(([key, cat], idx) =>
                `<button class="category-btn${idx === 0 ? ' active' : ''}" data-key="${key}">${cat.name}<span class="badge">${cat.data.length}</span></button>`
            ).join('');

            DOM.app.innerHTML = `
                <div class="container-fluid p-0 mb-3">
                    <a href="#/" class="btn btn-outline-secondary btn-sm">
                        <i class="ri-arrow-left-line me-1"></i> Home
                    </a>
                </div>
                <div class="category-filter" id="category-filter">
                    ${categoryBtns}
                </div>
                <div id="char-grid" class="char-grid-container"></div>
            `;

            // Render characters for category
            const renderCharsForCategory = (key) => {
                const chars = categories[key]?.data || [];
                const grid = document.getElementById('char-grid');
                grid.innerHTML = '';

                const fragment = document.createDocumentFragment();
                chars.forEach(item => {
                    const name = getLocalizedName(item);
                    let iconPath = '';
                    if (STATE.skins && item.initSkin) {
                        const skin = STATE.skins.find(s => s.id === item.initSkin);
                        if (skin) iconPath = `${skin.path}/bighead.png`;
                    }

                    const card = document.createElement('a');
                    card.href = `#/characters/${item.id}`;
                    card.className = 'char-card';
                    card.innerHTML = `
                        <div class="char-card-img-wrapper">
                            <img class="char-card-img" loading="lazy" data-src="${iconPath}" alt="${name}">
                        </div>
                        <div class="char-card-name" title="${name}">${name}</div>
                    `;
                    fragment.appendChild(card);
                });
                grid.appendChild(fragment);

                // Load images
                grid.querySelectorAll('.char-card-img').forEach(img => {
                    const url = getAssetUrl(img.dataset.src);
                    if (url) loadImage(img, url);
                });
            };

            // Initial render (All)
            renderCharsForCategory('all');

            // Category button click handler
            document.getElementById('category-filter').addEventListener('click', (e) => {
                const btn = e.target.closest('.category-btn');
                if (!btn) return;

                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                renderCharsForCategory(btn.dataset.key);
            });
        }
        else if (hash === '#/items') {
            updateSidebarActive('items');
            await renderItemsList();
        }
        else if (hash === '#/achievements') {
            updateSidebarActive('achievements');
            await renderAchievements();
        }
        else if (hash === '#/activities') {
            updateSidebarActive('activities');
            await renderActivities();
        }
        else if (hash === '#/catchat') {
            updateSidebarActive('catchat');
            await renderCatChat();
        }
        else {
            DOM.app.innerHTML = `<div class="text-center py-5"><h3>404 Not Found</h3><a href="#/" class="btn btn-primary">Go Home</a></div>`;
        }
    } catch (err) {
        console.error(err);
        DOM.app.innerHTML = `
            <div class="alert alert-danger text-center">
                <h4 class="alert-heading">Error Loading Data</h4>
                <p>${err.message}</p>
            </div>
        `;
    }
}

// --- Initialization ---

window.addEventListener('hashchange', router);

if (DOM.langSelect) {
    DOM.langSelect.addEventListener('change', (e) => {
        setLang(e.target.value);
        router();
    });
}

async function loadVersion() {
    try {
        const res = await fetch('./version.json');
        if (!res.ok) return;
        const version = await res.json();
        const versionEl = document.getElementById('game-version');
        if (versionEl && version?.version) {
            versionEl.textContent = `v${version.version}`;
        }
    } catch (e) { }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    // Load saved lang
    if (STATE.lang && DOM.langSelect) {
        DOM.langSelect.value = STATE.lang;
    }
    loadVersion();
    router();

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuToggle && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
            // Toggle icon
            const icon = menuToggle.querySelector('i');
            if (sidebar.classList.contains('open')) {
                icon.className = 'ri-close-line';
            } else {
                icon.className = 'ri-menu-line';
            }
        };

        menuToggle.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);

        // Close menu on navigation
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                    menuToggle.querySelector('i').className = 'ri-menu-line';
                }
            });
        });
    }
});
