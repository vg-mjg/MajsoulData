/**
 * Items Page Module
 */
import { STATE } from '../core/state.js';
import { loadJson, getAssetUrl, loadImage } from '../core/utils.js';
import { getLocalizedName } from '../core/i18n.js';

const DOM = {
    app: document.getElementById('app-container')
};

// Get localized description for item
function getLocalizedDesc(item) {
    const lang = STATE.lang || 'en';
    const descFieldMap = {
        kr: ['descKr', 'descFuncKr'],
        jp: ['descJp', 'descFuncJp'],
        en: ['descEn', 'descFuncEn'],
        chs: ['descChs', 'descFuncChs'],
        cht: ['descChsT', 'descFuncChsT']
    };
    const fields = descFieldMap[lang] || descFieldMap['en'];
    for (const f of fields) {
        if (item[f] && item[f].trim()) return item[f];
    }
    // Fallback
    for (const fallback of ['en', 'chs', 'jp']) {
        for (const f of descFieldMap[fallback] || []) {
            if (item[f] && item[f].trim()) return item[f];
        }
    }
    return '';
}

// Sub-category definitions
const SUBCATEGORY_MAP = {
    // Category 5 - split by type
    '5_0': { name: 'Riichi Sticks', order: 1 },
    '5_1': { name: 'Winning Effects', order: 2 },
    '5_2': { name: 'Riichi Effects', order: 3 },
    '5_10': { name: 'Call Effects', order: 4 },
    '5_3': { name: 'Hand Decorations', order: 5 },
    '5_5': { name: 'Portrait Frames', order: 6 },
    '5_6': { name: 'Tablecloths', order: 7 },
    '5_7': { name: 'Tile Backs', order: 8 },
    '5_13': { name: 'Tile Faces', order: 9 },
    '5_8': { name: 'Backgrounds', order: 10 },
    '5_9': { name: 'BGM', order: 11 },
    '5_4': { name: 'Riichi BGM', order: 12 },
    // Other categories
    '2_*': { name: 'Gifts', order: 20 },
    '7_*': { name: 'Titles', order: 21 },
    '8_*': { name: 'Loading Screens', order: 22 },
    '6_*': { name: 'Event Items', order: 23 },
    '1_*': { name: 'Consumables', order: 24 },
    '3_*': { name: 'Packages', order: 25 },
    '0_*': { name: 'Other', order: 99 }
};

// Helper to load titles once
async function ensureTitlesLoaded() {
    if (STATE.titlesLoaded) return;
    try {
        const titles = await loadJson('ItemDefinitionTitle.json');
        if (titles) {
            titles.forEach(t => {
                t.category = 7;
                t.type = 0;
                t.iconFull = t.icon || t.iconItem;
                t.icon = t.iconItem || t.icon;
            });
            STATE.items = STATE.items.concat(titles);
            STATE.titlesLoaded = true;
        }
    } catch (e) { console.warn('Failed to load titles:', e); }
}

function getSubcategoryKey(item) {
    const cat = item.category ?? 0;
    const type = item.type ?? 0;
    let key = `${cat}_${type}`;
    if (SUBCATEGORY_MAP[key]) return key;
    key = `${cat}_*`;
    if (SUBCATEGORY_MAP[key]) return key;
    return '0_*';
}

/**
 * Render Items List Page
 */
export async function renderItemsList() {
    if (!STATE.items) {
        STATE.items = await loadJson('ItemDefinitionItem.json');
    }
    // Load Titles
    await ensureTitlesLoaded();

    // Group items by sub-category
    const grouped = {};
    STATE.items.forEach(item => {
        const key = getSubcategoryKey(item);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    // Sort sub-categories by order
    const sortedKeys = Object.keys(grouped)
        .sort((a, b) => (SUBCATEGORY_MAP[a]?.order || 99) - (SUBCATEGORY_MAP[b]?.order || 99));

    // Build category buttons HTML
    let categoryBtns = sortedKeys.map((key, idx) => {
        const info = SUBCATEGORY_MAP[key] || { name: key };
        const count = grouped[key].length;
        return `<button class="category-btn${idx === 0 ? ' active' : ''}" data-key="${key}">${info.name}<span class="badge">${count}</span></button>`;
    }).join('');

    // Initial key
    const initKey = sortedKeys[0];

    DOM.app.innerHTML = `
        <div class="container-fluid p-0 mb-3">
            <a href="#/" class="btn btn-outline-secondary btn-sm">
                <i class="ri-arrow-left-line me-1"></i> Home
            </a>
        </div>
        <div class="category-filter" id="category-filter">
            ${categoryBtns}
        </div>
        <div id="items-grid" class="item-grid-container"></div>
    `;

    // Render items for key
    const renderItemsForKey = (key) => {
        const items = grouped[key] || [];
        const grid = document.getElementById('items-grid');
        grid.innerHTML = '';

        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const name = getLocalizedName(item);
            const div = document.createElement('a');
            div.href = `#/items/${item.id}`;
            div.className = 'item-card';
            div.title = name;
            div.innerHTML = `
                <img class="item-card-img" data-src="${item.icon}" loading="lazy">
                <div class="item-card-name">${name}</div>
            `;
            fragment.appendChild(div);
        });
        grid.appendChild(fragment);

        // Load images
        grid.querySelectorAll('.item-card-img').forEach(img => {
            const url = getAssetUrl(img.dataset.src);
            if (url) loadImage(img, url);
        });
    };

    // Initial render
    renderItemsForKey(initKey);

    // Category button click handler
    document.getElementById('category-filter').addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;

        // Update active state
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Render items
        const key = btn.dataset.key;
        renderItemsForKey(key);
    });
}

/**
 * Render Item Detail Page
 */
export async function renderItemDetail(itemId) {
    if (!STATE.items) {
        STATE.items = await loadJson('ItemDefinitionItem.json');
    }
    // Load Titles
    await ensureTitlesLoaded();
    // Load Loading Images
    if (!STATE.loadingImages) {
        try { STATE.loadingImages = await loadJson('ItemDefinitionLoadingImage.json'); } catch (e) { }
    }
    // Load AudioBgm for BGM paths
    if (!STATE.audioBgm) {
        try { STATE.audioBgm = await loadJson('AudioBgm.json'); } catch (e) { }
    }
    // Load ItemDefinitionView for extra resources
    if (!STATE.itemViews) {
        try { STATE.itemViews = await loadJson('ItemDefinitionView.json'); } catch (e) { }
    }

    const item = STATE.items.find(i => i.id === parseInt(itemId));
    if (!item) {
        DOM.app.innerHTML = `<div class="alert alert-danger">Item not found: ${itemId}</div>`;
        return;
    }

    const name = getLocalizedName(item);
    const desc = getLocalizedDesc(item);

    let iconUrl = getAssetUrl(item.icon);
    // Use full-res icon for Titles - REMOVED to show thumbnail in main view
    // if (item.category === 7 && item.iconFull) {
    //     iconUrl = getAssetUrl(item.iconFull);
    // }

    // Resource Preview Logic
    let extraHtml = '';
    let previewUrl = null;
    let previewAlt = 'Resource Preview';

    const isFrame = item.category === 5 && item.type === 5;
    const isTablecloth = item.category === 5 && item.type === 6;
    const isTileFace = item.category === 5 && item.type === 13;
    const isTitle = item.category === 7;
    const isLoadingScreen = item.category === 8;
    const isBgm = item.category === 5 && item.type === 9;
    const isRiichiBGM = item.category === 5 && item.type === 4;
    const isBackground = item.category === 5 && item.type === 8;

    if (isFrame || isTablecloth || isTileFace || isTitle || isLoadingScreen || isBgm || isRiichiBGM || isBackground) {
        // Default Alt
        if (isFrame) previewAlt = 'Frame Resource';
        if (isTablecloth) previewAlt = 'Tablecloth Preview';
        if (isTileFace) previewAlt = 'Tile Face Preview';
        if (isTitle) previewAlt = 'Title Preview';
        if (isLoadingScreen) previewAlt = 'Loading Screen Preview';
        if (isBgm) previewAlt = 'BGM Audio';
        if (isRiichiBGM) previewAlt = 'Riichi BGM';
        if (isBackground) previewAlt = 'Background Preview';

        // BGM Logic
        if (isBgm && STATE.audioBgm) {
            const bgm = STATE.audioBgm.find(b => b.id === item.id);
            if (bgm && bgm.path) {
                const paths = [`audio/${bgm.path}`, `audio/bgm/${bgm.path}`, bgm.path];
                for (const p of paths) {
                    const u = getAssetUrl(p);
                    if (u) { previewUrl = u; break; }
                }
            }
        }
        // Riichi BGM Logic
        else if (isRiichiBGM) {
            if (item.sargs && item.sargs[0]) {
                const path = item.sargs[0];
                const paths = [`audio/${path}`, `audio/bgm/${path}`, path];
                for (const p of paths) {
                    const u = getAssetUrl(p);
                    if (u) { previewUrl = u; break; }
                }
            }
        }
        // Title Preview
        else if (isTitle && item.iconFull) {
            previewUrl = getAssetUrl(item.iconFull);
        }
        // Loading Screen Preview
        else if (isLoadingScreen) {
            if (STATE.loadingImages) {
                const def = STATE.loadingImages.find(x => x.unlockItems && x.unlockItems.includes(item.id));
                if (def && def.imgPath) {
                    const rawPath = def.imgPath;
                    const paths = [
                        rawPath,
                        `chs_t/${rawPath}`,
                        `scene/${rawPath}`,
                        `lang/scene/${rawPath}`,
                        `lang/base/${rawPath}`,
                        `lang/base_q7/${rawPath}`,
                        `kr/${rawPath}`,
                        `jp/${rawPath}`,
                        `en/${rawPath}`
                    ];
                    // Also try icon-based path if _thumb exists
                    if (item.icon && item.icon.includes('_thumb')) {
                        const raw = item.icon.replace('_thumb', '');
                        paths.push(raw);
                        paths.push(`chs_t/${raw}`);
                        paths.push(`scene/${raw}`);
                    }

                    for (const p of paths) {
                        const u = getAssetUrl(p);
                        if (u) { previewUrl = u; break; }
                    }
                }
            }
        }

        // Try to get high-res path from View definition
        if (STATE.itemViews) {
            const view = STATE.itemViews.find(v => v.id === item.id);
            if (view && view.resName) {
                // Portrait Frames
                if (isFrame) {
                    previewUrl = getAssetUrl(`extendRes/head_frame/${view.resName}.png`);
                    if (!previewUrl) {
                        previewUrl = getAssetUrl(`extendRes/items/headframe_${view.resName}.jpg`);
                    }
                }
                // Tablecloths
                else if (isTablecloth) {
                    const paths = [
                        `lang/scene/Assets/Resource/tablecloth/${view.resName}/Table_Dif.jpg`,
                        `scene/Assets/Resource/tablecloth/${view.resName}/Table_Dif.jpg`,
                        `Resource/tablecloth/${view.resName}/Table_Dif.jpg`
                    ];
                    for (const p of paths) {
                        previewUrl = getAssetUrl(p);
                        if (previewUrl) break;
                    }
                }
                // Backgrounds
                else if (isBackground) {
                    const paths = [
                        // Try 'lobby' folder (based on user feedback)
                        `lang/scene/Assets/Resource/lobby/${view.resName}.jpg`,
                        `scene/Assets/Resource/lobby/${view.resName}.jpg`,

                        // Try 'background' folder paths (fallback)
                        `lang/scene/Assets/Resource/background/${view.resName}/background.jpg`,
                        `scene/Assets/Resource/background/${view.resName}/background.jpg`,
                        `lang/scene/Assets/Resource/background/${view.resName}/ui.png`,
                        `scene/Assets/Resource/background/${view.resName}/ui.png`
                    ];
                    for (const p of paths) {
                        previewUrl = getAssetUrl(p);
                        if (previewUrl) break;
                    }
                }
                // Tile Faces
                else if (isTileFace) {
                    previewUrl = getAssetUrl(`res/atlas/myres2/mjpm/${view.resName}/ui.png`);
                    if (!previewUrl) {
                        previewUrl = getAssetUrl(`myres2/mjpm/${view.resName}/ui.png`);
                    }
                }
            }
        }

        // Fallback: If no specific resource found (or View missing), use Icon
        if (!previewUrl) {
            previewUrl = iconUrl;
        }
    }

    if (previewUrl) {
        if (isBgm || isRiichiBGM) {
            extraHtml = `
            <div class="row mt-4">
                <div class="col-12 text-center">
                    <audio controls name="media" style="width: 100%; max-width: 400px;">
                        <source src="${previewUrl}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>`;
        } else {
            extraHtml = `
            <div class="row mt-4">
                <div class="col-12 text-center">
                    <img id="item-resource-preview" style="max-width: 100%; height: auto; border-radius: 4px;" alt="${previewAlt}">
                </div>
            </div>
            `;
        }
    }

    DOM.app.innerHTML = `
        <div class="container-fluid p-0 mb-4">
            <a href="#/items" class="btn btn-outline-secondary btn-sm">
                <i class="ri-arrow-left-line me-1"></i> Back to Items
            </a>
        </div>
        <div class="row g-4">
            <div class="col-lg-5">
                <div class="item-detail-img-wrapper">
                    <img class="item-detail-img" id="item-main-img" alt="${name}">
                </div>
            </div>
            <div class="col-lg-7">
                <div class="char-info-card">
                    <h2 class="fw-bold mb-3">${name}</h2>
                    ${desc ? `<p class="char-desc mb-4">${desc}</p>` : '<p class="text-muted">No description available.</p>'}
                </div>
            </div>
        </div>
        ${extraHtml}
    `;

    // Load main image
    const mainImg = document.getElementById('item-main-img');
    if (iconUrl) loadImage(mainImg, iconUrl);

    // Load preview image
    if (previewUrl && !isBgm && !isRiichiBGM) {
        const previewImg = document.getElementById('item-resource-preview');
        if (previewImg) {
            loadImage(previewImg, previewUrl);
        }
    }
}
