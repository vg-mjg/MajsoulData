import { STATE } from '../core/state.js';
import { getAssetUrl, loadImage, loadJson } from '../core/utils.js';
import { getLocalizedName } from '../core/i18n.js';

const DOM = {
    app: document.getElementById('app-container')
};

// Global helper for skin switching (needed for onclick in HTML strings)
window.changeCharImage = function (rawPath) {
    const url = getAssetUrl(rawPath);
    if (url) {
        const imgEl = document.getElementById('detail-img');
        const loader = document.getElementById('detail-loading');

        if (imgEl) {
            imgEl.style.opacity = '0';
            if (loader) loader.style.display = 'block';

            const newImg = new Image();
            newImg.onload = () => {
                imgEl.src = newImg.src;
                imgEl.style.opacity = '1';
                if (loader) loader.style.display = 'none';
            };
            newImg.onerror = () => {
                console.warn('Failed to load image:', rawPath);
                if (loader) loader.style.display = 'none';
            }

            loadImage(newImg, url);
        }
    }
};

window.changeSkin = function (skinId) {
    if (!STATE.currentCharSkins) return;
    const skin = STATE.currentCharSkins.find(s => s.id === skinId);
    if (!skin) return;

    // 1. Update Image
    const fullPath = `${skin.path}/full.png`;
    window.changeCharImage(fullPath);

    // 2. Update Border
    document.querySelectorAll('.skin-card').forEach(el => el.classList.remove('border-primary'));
    const card = document.getElementById(`skin-card-${skinId}`);
    if (card) card.classList.add('border-primary');

    // 3. Update Skin Info
    const skinInfoEl = document.getElementById('skin-info-container');
    if (skinInfoEl) {
        const name = getLocalizedName(skin);
        const desc = getLocalizedName({
            nameEn: skin.descEn, nameKr: skin.descKr, nameJp: skin.descJp, nameChs: skin.descChs, nameChsT: skin.descChsT
        });
        const lockTips = getLocalizedName({
            nameEn: skin.lockTipsEn, nameKr: skin.lockTipsKr, nameJp: skin.lockTipsJp, nameChs: skin.lockTipsChs, nameChsT: skin.lockTipsChsT
        });

        const hasContent = desc || lockTips;

        if (hasContent) {
            skinInfoEl.classList.remove('d-none');
            let html = `<h6 class="fw-bold mb-2 text-primary">${name}</h6>`;
            if (desc) {
                html += `<div class="mb-2 text-dark small" style="white-space: pre-line;">${desc}</div>`;
            }
            if (lockTips) {
                html += `<div class="mt-2 pt-2 border-top small text-muted"><i class="ri-lock-line me-1"></i> ${lockTips}</div>`;
            }
            skinInfoEl.innerHTML = html;
        } else {
            skinInfoEl.classList.add('d-none');
        }
    }
};

export async function renderCharacterDetail(id) {
    const charId = parseInt(id);

    // Load necessary data sequentially to ensure STATE is populated
    if (!STATE.characters) STATE.characters = await loadJson('ItemDefinitionCharacter.json');
    if (!STATE.resVersion) try { STATE.resVersion = await loadJson('../resversion.json'); } catch (e) { console.error('Failed to load resversion', e); }
    if (!STATE.skins) try { STATE.skins = await loadJson('ItemDefinitionSkin.json'); } catch (e) { }
    if (!STATE.itemDefs) try { STATE.itemDefs = await loadJson('ItemDefinitionItem.json'); } catch (e) { }
    if (!STATE.currencies) try { STATE.currencies = await loadJson('ItemDefinitionCurrency.json'); } catch (e) { }
    if (!STATE.emojis) try { STATE.emojis = await loadJson('CharacterEmoji.json'); } catch (e) { }
    if (!STATE.spotSpot) try { STATE.spotSpot = await loadJson('SpotSpot.json'); } catch (e) { }
    if (!STATE.spotRewards) try { STATE.spotRewards = await loadJson('SpotRewards.json'); } catch (e) { }

    const charData = STATE.characters.find(c => c.id === charId);
    if (!charData) {
        DOM.app.innerHTML = `<div class="alert alert-danger">Character ${id} not found.</div>`;
        return;
    }
    STATE.currentCharData = charData;

    const name = getLocalizedName(charData);
    const desc = getLocalizedName({
        nameEn: charData.descEn,
        nameKr: charData.descKr,
        nameJp: charData.descJp,
        nameChs: charData.descChs,
        nameChsT: charData.descChsT
    });

    const props = [
        { label: 'CV', value: getLocalizedName({ nameEn: charData.descCvEn, nameKr: charData.descCvKr, nameJp: charData.descCvJp, nameChs: charData.descCvChs, nameChsT: charData.descCvChsT }) },
        { label: 'Birthday', value: getLocalizedName({ nameEn: charData.descBirthEn, nameKr: charData.descBirthKr, nameJp: charData.descBirthJp, nameChs: charData.descBirthChs, nameChsT: charData.descBirthChsT }) },
        { label: 'Height', value: getLocalizedName({ nameEn: charData.descStatureEn, nameKr: charData.descStatureKr, nameJp: charData.descStatureJp, nameChs: charData.descStatureChs, nameChsT: charData.descStatureChsT }) },
        { label: 'Age', value: getLocalizedName({ nameEn: charData.descAgeEn, nameKr: charData.descAgeKr, nameJp: charData.descAgeJp, nameChs: charData.descAgeChs, nameChsT: charData.descAgeChsT }) },
        { label: 'Blood Type', value: getLocalizedName({ nameEn: charData.descBloodtypeEn, nameKr: charData.descBloodtypeKr, nameJp: charData.descBloodtypeJp, nameChs: charData.descBloodtypeChs, nameChsT: charData.descBloodtypeChsT }) },
        { label: 'Hobby', value: getLocalizedName({ nameEn: charData.descHobbyEn, nameKr: charData.descHobbyKr, nameJp: charData.descHobbyJp, nameChs: charData.descHobbyChs, nameChsT: charData.descHobbyChsT }) }
    ];

    // Bond Materials Logic (Always Visible)
    let bondMaterialsHtml = '';
    if (charData.star_5Material && STATE.itemDefs) {
        const matStr = charData.star_5Material;
        const materials = [];
        const groups = matStr.split(',');

        groups.forEach(group => {
            const finalP = group.includes('|') ? group.split('|').pop() : group;
            const subParts = finalP.split('-');
            const id = parseInt(subParts[0]);
            const count = subParts.length > 1 ? parseInt(subParts[1]) : 1;
            if (!isNaN(id)) materials.push({ id, count });
        });

        if (materials.length > 0) {
            const matItems = materials.map(m => {
                const item = STATE.itemDefs.find(i => i.id === m.id);
                if (!item) return '';
                const itemName = getLocalizedName(item);
                const iconPath = item.icon;
                return `
                    <div class="d-inline-block text-center me-3 mb-2" style="width: 60px; vertical-align: top;">
                        <a href="#/items/${m.id}" class="d-block text-decoration-none text-reset">
                            <div class="position-relative mb-1 mx-auto" style="width: 48px; height: 48px;">
                                <img class="mat-img img-fluid rounded border bg-white" 
                                     style="width: 100%; height: 100%; object-fit: contain;" 
                                     title="${itemName}" loading="lazy" data-src="${iconPath}" 
                                     onerror="this.style.display='none'">
                                <span class="position-absolute bottom-0 end-0 badge bg-dark text-white rounded-pill border border-light" 
                                      style="font-size: 10px; padding: 1px 4px;">x${m.count}</span>
                            </div>
                            <div class="text-truncate small text-muted" style="font-size: 10px; max-width: 60px;" title="${itemName}">${itemName}</div>
                        </a>
                    </div>
                `;
            }).join('');
            if (matItems) {
                bondMaterialsHtml = `
                    <div class="bond-materials mb-4">
                        <h5 class="mb-3 border-bottom pb-2">Bond Requirements</h5>
                        <div>${matItems}</div>
                    </div>
                `;
            }
        }
    }

    // Skins Logic
    let skinHtml = '';
    if (STATE.skins) {
        const charSkins = STATE.skins.filter(s => s.characterId === charId);
        STATE.currentCharSkins = charSkins;
        if (charSkins.length > 0) {
            const skinItems = charSkins.map(skin => {
                const skinName = getLocalizedName(skin);
                const iconPath = `${skin.path}/bighead.png`;
                return `
                    <div class="col-4 col-sm-3 mb-3">
                        <div id="skin-card-${skin.id}" 
                             class="skin-card cursor-pointer p-2 text-center bg-light rounded border ${skin.id === charData.initSkin ? 'border-primary' : ''}" 
                             onclick="changeSkin(${skin.id})" title="${skinName}">
                            <div class="skin-img-wrapper mb-2">
                                <img class="skin-img img-fluid" loading="lazy" data-src="${iconPath}" alt="${skinName}">
                            </div>
                            <div class="small text-truncate fw-bold">${skinName}</div>
                        </div>
                    </div>
                `;
            }).join('');
            skinHtml = `
                <div class="char-skins mt-4 mb-5">
                    <h5 class="mb-3 border-bottom pb-2">Skins</h5>
                    <div class="row g-2">${skinItems}</div>
                </div>
            `;
        }
    }

    // Emoji Logic
    let emojiHtml = '';
    if (charData.emo && STATE.resVersion && STATE.resVersion.res) {
        const availableEmos = new Set();
        const emoBase = charData.emo;
        Object.keys(STATE.resVersion.res).forEach(key => {
            const idx = key.indexOf(emoBase);
            if (idx !== -1) {
                const suffix = key.substring(idx + emoBase.length);
                if (suffix.startsWith('/') && suffix.indexOf('/', 1) === -1 && suffix.endsWith('.png')) {
                    const filename = suffix.substring(1);
                    const subId = filename.replace('.png', '');
                    if (/^\d+$/.test(subId)) availableEmos.add(subId);
                }
            }
        });

        if (availableEmos.size > 0) {
            const sortedIds = Array.from(availableEmos).map(id => parseInt(id)).sort((a, b) => a - b);
            const emojiItems = sortedIds.map(subId => {
                const emoPath = `${charData.emo}/${subId}.png`;
                const emoId = `emo-${subId}`;
                let meta = STATE.emojis ? STATE.emojis.find(e => e.charid === charId && e.subId === subId) : null;
                const title = meta ? getLocalizedName({ nameEn: meta.unlockDescEn, nameKr: meta.unlockDescKr, nameJp: meta.unlockDescJp, nameChs: meta.unlockDescChs, nameChsT: meta.unlockDescChsT }) : `Stamp ${subId}`;
                return `
                    <div class="col-4 col-sm-3 col-md-2 mb-3">
                        <div class="emoji-card p-1 text-center bg-light rounded border" title="${title}" onclick="window.open(this.querySelector('img').src, '_blank')">
                            <img id="${emoId}" class="emoji-img img-fluid" loading="lazy" data-src="${emoPath}" alt="${subId}">
                        </div>
                    </div>
                `;
            }).join('');
            emojiHtml = `
                <div class="char-emojis mt-5">
                    <h5 class="mb-3 border-bottom pb-2">Stamps</h5>
                    <div class="row g-2">${emojiItems}</div>
                </div>
            `;
        }
    }

    // Voice Logic Construction
    let voiceTabContent = '';

    if (charData.sound && charData.soundFolder) {
        if (!STATE.voiceSound) try { STATE.voiceSound = await loadJson('VoiceSound.json'); } catch (e) { }

        if (STATE.voiceSound) {
            // Filter by ID and ensure no "hide" items
            const voices = STATE.voiceSound.filter(v => v.id === charData.sound && !v.hide);

            if (voices.length > 0) {
                // Group by Category
                // Category 1: Lobby, Category 2: In-Game
                const lobbyVoices = voices.filter(v => v.category === 1);
                const gameVoices = voices.filter(v => v.category === 2);

                const createVoiceCard = (v) => {
                    const title = getLocalizedName(v);
                    const words = getLocalizedName({
                        nameEn: v.wordsEn, nameKr: v.wordsKr, nameJp: v.wordsJp, nameChs: v.wordsChs, nameChsT: v.wordsChsT
                    });

                    // Construct Path
                    const assetPath = `audio/sound/${charData.soundFolder}/${v.path}.mp3`;

                    return `
                        <div class="col-12 col-md-6 mb-3">
                            <div class="d-flex align-items-center p-2 bg-light rounded border h-100">
                                <button class="btn btn-primary btn-sm rounded-circle me-3 flex-shrink-0 shadow-none" 
                                        onclick="playVoice('${assetPath}')" 
                                        style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                                    <i class="ri-play-fill text-white fs-5"></i>
                                </button>
                                <div class="overflow-hidden w-100">
                                    <div class="fw-bold text-dark mb-1">${title}</div>
                                    <div class="text-muted small text-break" style="font-size: 0.85rem;">
                                        ${words || ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                };

                const renderSection = (title, items) => {
                    if (items.length === 0) return '';
                    return `
                        <div class="voice-category mb-4">
                            <h5 class="mb-3 border-bottom pb-2">${title}</h5>
                            <div class="row g-2">
                                ${items.map(createVoiceCard).join('')}
                            </div>
                        </div>
                    `;
                };

                // Use unified container style
                voiceTabContent = `
                    <div class="char-info-card shadow-sm p-4 bg-white rounded">
                        ${renderSection('Lobby', lobbyVoices)}
                        ${renderSection('In-Game', gameVoices)}
                    </div>
                `;
            }
        }
    }

    // Fallback if no voices
    if (!voiceTabContent) {
        voiceTabContent = `<div class="p-4 text-center text-muted">No voice data available.</div>`;
    }

    // Story Logic
    let storyTabContent = '';

    const getStoryText = (s) => {
        const map = { 'en': 'contentEn', 'kr': 'contentKr', 'jp': 'contentJp', 'chs': 'contentChs', 'chsT': 'contentChsT' };
        const key = map[STATE.lang] || 'contentEn';
        return s[key] || s.contentEn || s.contentChs || '';
    };
    const getRewardTitle = (r) => {
        const map = { 'en': 'contentEn', 'kr': 'contentKr', 'jp': 'contentJp', 'chs': 'contentChs', 'chsT': 'contentChsT' };
        const key = map[STATE.lang] || 'contentEn';
        return r[key] || r.contentEn || r.contentChs || 'Untitled';
    };

    const fetchStoryContent = async (contentPath) => {
        if (!contentPath || !STATE.resVersion || !STATE.resVersion.res) return null;

        const langSuffixMap = { 'en': '_en', 'kr': '_kr', 'jp': '_jp', 'chs': '_chs', 'chsT': '_chs_t' };
        const suffix = langSuffixMap[STATE.lang] || '_en';

        // Try specific language, then fallback to En
        const attemptPaths = [`docs/spot/${contentPath}${suffix}.bytes`];
        if (suffix !== '_en') attemptPaths.push(`docs/spot/${contentPath}_en.bytes`);

        for (const key of attemptPaths) {
            const resInfo = STATE.resVersion.res[key];
            if (resInfo && resInfo.prefix) {
                const url = `https://mahjongsoul.game.yo-star.com/${resInfo.prefix}/${key}`;
                // Skip fetch on local environment to avoid CORS error logs in console
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') continue;
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const text = await res.text();
                        // Parse Key:Value map
                        const lines = text.split(/\r?\n/);
                        const content = [];
                        lines.forEach(line => {
                            const parts = line.split(':');
                            if (parts.length >= 2) {
                                // Join back parts (value may contain colons)
                                // Also handle cases like "1: Text" -> "Text"
                                const val = parts.slice(1).join(':').trim();
                                if (val) content.push(val);
                            }
                        });
                        return content.join('\n');
                    }
                } catch (e) {
                    // console.warn('Fetch story content failed (CORS/Network error). Skipping detail text load.');
                }
            }
        }
        return null;
    };

    if (STATE.spotSpot && STATE.spotRewards) {
        const stories = STATE.spotSpot.filter(s => s.id === charId).sort((a, b) => (a.queque || 0) - (b.queque || 0));

        if (stories.length > 0) {

            // Pre-fetch external content
            await Promise.all(stories.map(async (s) => {
                const text = getStoryText(s);
                if (!text && s.contentPath) {
                    const external = await fetchStoryContent(s.contentPath);
                    if (external) s.externalText = external;
                }
            }));

            let storyRows = '';

            stories.forEach((story, sIndex) => {
                const storyTitle = getLocalizedName(story);

                let rawText = getStoryText(story);
                if ((!rawText || rawText === '') && story.externalText) rawText = story.externalText;

                const storyText = (rawText || '').replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
                const storyId = `story-collapse-${sIndex}`;

                const endings = [];

                if (story.jieju && Array.isArray(story.jieju)) {
                    story.jieju.forEach(endId => {
                        if (endId !== 0) {
                            const endData = STATE.spotRewards.find(r => r.id === endId);
                            if (endData) {
                                const endTitle = getRewardTitle(endData);
                                // Parse rewards
                                const rewardStr = endData.reward || '';
                                const rewardItems = rewardStr.split(',').map(r => {
                                    const parts = r.split('-');
                                    if (parts.length >= 2) {
                                        const itemId = parseInt(parts[0]);
                                        const count = parseInt(parts[1]);

                                        // Try ItemDefs
                                        let itemDef = STATE.itemDefs ? STATE.itemDefs.find(i => i.id === itemId) : null;
                                        // Try Currencies
                                        if (!itemDef && STATE.currencies) itemDef = STATE.currencies.find(i => i.id === itemId);

                                        const itemName = itemDef ? getLocalizedName(itemDef) : `Item ${itemId}`;
                                        return `<a href="#/items/${itemId}" class="badge bg-light text-dark border me-1 text-decoration-none reward-link" style="transition: all 0.2s;" onmouseover="this.classList.add('bg-secondary', 'text-white'); this.classList.remove('bg-light', 'text-dark');" onmouseout="this.classList.remove('bg-secondary', 'text-white'); this.classList.add('bg-light', 'text-dark');">${itemName} x${count}</a>`;
                                    }
                                    return r;
                                }).join('');

                                endings.push({ title: endTitle, rewards: rewardItems });
                            }
                        }
                    });
                }

                // Construct Row
                const hasText = storyText && storyText.length > 0;
                const toggleAttr = hasText ? `data-bs-toggle="collapse" data-bs-target="#${storyId}" aria-expanded="false" aria-controls="${storyId}" style="cursor:pointer;"` : '';
                const icon = hasText ? `<i class="ri-arrow-down-s-line float-end text-muted story-toggle-icon"></i>` : '';

                if (endings.length === 0) {
                    storyRows += `
                        <tr ${toggleAttr} class="${hasText ? 'story-trigger' : ''}">
                            <td class="fw-bold align-middle">${storyTitle} ${icon}</td>
                            <td class="text-muted small align-middle">-</td>
                            <td class="text-muted small align-middle">-</td>
                        </tr>
                     `;
                } else {
                    endings.forEach((end, index) => {
                        storyRows += `
                            <tr ${toggleAttr} class="${hasText ? 'story-trigger' : ''}">
                                <td class="fw-bold align-middle" style="background-color: transparent;">${index === 0 ? storyTitle + ' ' + icon : ''}</td>
                                <td class="align-middle">${end.title}</td>
                                <td class="align-middle">${end.rewards}</td>
                            </tr>
                        `;
                    });
                }

                // Collapsible Row (Story Text)
                if (hasText) {
                    storyRows += `
                        <tr class="collapse-row">
                            <td colspan="3" class="p-0 border-0">
                                <div class="collapse bg-light" id="${storyId}">
                                    <div class="p-4 text-dark" style="line-height: 1.8; white-space: pre-line; font-size: 0.95rem;">
                                        ${storyText.replace(/<br>/g, '\n')}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            });

            storyTabContent = `
                <div class="char-info-card shadow-sm p-4 bg-white rounded">

                    <div class="table-responsive">
                       <table class="table table-hover mb-0">
                           <thead class="table-light">
                               <tr>
                                   <th scope="col" style="width: 30%">Story</th>
                                   <th scope="col" style="width: 40%">Ending</th>
                                   <th scope="col" style="width: 30%">Reward</th>
                               </tr>
                           </thead>
                           <tbody class="border-top-0">
                               ${storyRows}
                           </tbody>
                       </table>
                    </div>
                </div>
            `;
        } else {
            storyTabContent = `<div class="p-4 text-center text-muted">No story data available.</div>`;
        }
    } else {
        storyTabContent = `<div class="p-4 text-center text-muted">Story data not loaded.</div>`;
    }

    // Render Template
    DOM.app.innerHTML = `
        <div class="container-fluid p-0">
            <div class="mb-4">
                <a href="#/characters" class="btn btn-outline-secondary btn-sm">
                    <i class="ri-arrow-left-line me-1"></i> Back to Characters
                </a>
            </div>
            
            <!-- Main Character Info Section -->
            <div class="row align-items-start mb-5">
                <!-- Left Column: Image -->
                <div class="col-lg-5 mb-4 mb-lg-0 text-center sticky-lg-top" style="top: 2rem; z-index: 1;">
                    <div class="char-detail-img-wrapper">
                        <div class="spinner-border text-secondary position-absolute top-50 start-50" role="status" id="detail-loading"></div>
                        <img id="detail-img" class="char-detail-img" alt="${name}" style="opacity:0; transition: opacity 0.3s;">
                    </div>
                </div>

                <!-- Right Column: Basic Info -->
                <div class="col-lg-7">
                    <div class="char-info-card shadow-sm p-4 bg-white rounded">
                        <h1 class="display-4 fw-bold mb-2">${name}</h1>
                        <div class="char-desc mb-4">${desc}</div>
                        <div id="skin-info-container" class="mb-4 p-3 bg-light rounded d-none"></div>

                        <div class="char-props mb-4">
                            <h5 class="mb-3 border-bottom pb-2">Profile</h5>
                            <div class="row g-3">
                                ${props.map(p => `
                                    <div class="col-6 col-md-4">
                                        <div class="text-uppercase text-muted small fw-bold">${p.label}</div>
                                        <div class="fw-medium">${p.value}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        ${bondMaterialsHtml}
                        ${skinHtml}
                        ${emojiHtml}
                    </div>
                </div>
            </div>

            <!-- Extra Content Tabs (Pills Style) -->
            <div class="row mt-5">
                <div class="col-12">
                    <ul class="nav nav-pills mb-4 justify-content-center" id="charExtraTab" role="tablist">
                        <li class="nav-item me-2" role="presentation">
                            <button class="nav-link active px-4 rounded-pill" id="voices-tab" data-bs-toggle="tab" data-bs-target="#voices" type="button" role="tab" aria-controls="voices" aria-selected="true">Voices</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link px-4 rounded-pill" id="story-tab" data-bs-toggle="tab" data-bs-target="#story" type="button" role="tab" aria-controls="story" aria-selected="false">Story</button>
                        </li>
                    </ul>

                    <div class="tab-content" id="charExtraTabContent">
                        
                        <!-- Voices Tab -->
                        <div class="tab-pane fade show active" id="voices" role="tabpanel" aria-labelledby="voices-tab">
                            <div class="p-2">
                                ${voiceTabContent}
                            </div>
                        </div>
                        
                        <!-- Story Tab -->
                        <div class="tab-pane fade" id="story" role="tabpanel" aria-labelledby="story-tab">
                            <div class="p-2">
                                ${storyTabContent}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize Images
    if (charData.initSkin) window.changeSkin(charData.initSkin);

    // Lazy Load Helpers
    const loadImagesBySelector = (selector) => {
        document.querySelectorAll(selector).forEach(img => {
            const rawPath = img.dataset.src;
            const url = getAssetUrl(rawPath);
            if (url) loadImage(img, url);
        });
    };

    if (skinHtml) loadImagesBySelector('.skin-img');
    if (emojiHtml) loadImagesBySelector('.emoji-img');
    if (bondMaterialsHtml) loadImagesBySelector('.mat-img');
}

// Global Voice Player
let currentAudio = null;
window.playVoice = function (path) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    // Sanitize path: remove redundant 'lobby/' segment if present
    // Server structure is flat: audio/sound/{char}/lobby_xxx.mp3
    // But data has: audio/sound/{char}/lobby/lobby_xxx.mp3
    let cleanPath = path.replace('/lobby/', '/');

    // 1. Try to get URL with clean path
    let url = getAssetUrl(cleanPath);

    // 2. Fallback: If not found, try to construct manually using a valid prefix
    if (!url) {
        const server = 'https://game.maj-soul.com/1/';
        let prefix = 'v0.10.1.w'; // Default safe fallback

        if (STATE.resVersion && STATE.resVersion.res) {
            // Try to find a prefix from the SAME character folder or at least same category
            // This prevents using a 'v0.10.268.w' (from a new event) for an old audio file
            const keys = Object.keys(STATE.resVersion.res);

            // Try specific char folder first
            const charFolder = cleanPath.split('/').slice(0, 3).join('/'); // audio/sound/{char}
            const sibling = keys.find(k => k.startsWith(charFolder));

            if (sibling) {
                prefix = STATE.resVersion.res[sibling].prefix;
            } else {
                // Try any audio file
                const anyAudio = keys.find(k => k.startsWith('audio/'));
                if (anyAudio) prefix = STATE.resVersion.res[anyAudio].prefix;
            }
        }

        url = `${server}${prefix}/${cleanPath}`;
    }

    // console.log(`Playing: ${cleanPath} -> ${url}`);
    const audio = new Audio(url);
    audio.play().catch(e => console.warn('Audio play failed', e));
    currentAudio = audio;
};
