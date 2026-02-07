
import { STATE } from '../core/state.js';
import { loadJson, getAssetUrl, loadImage } from '../core/utils.js';
import { getLocalizedName } from '../core/i18n.js';

const DOM = {
    app: document.getElementById('app-container')
};

function getEventString(strId) {
    if (!STATE.strEvent) return '';
    const entry = STATE.strEvent.find(x => x.id === strId);
    if (!entry) return '';

    const lang = STATE.lang || 'en';
    if (entry[lang]) return entry[lang];
    if (entry['en']) return entry['en'];
    if (entry['chs']) return entry['chs'];
    return '';
}

function getCharInfo(item) {
    const charId = item.charId;
    const charStrId = item.charStrId;
    const choiceId = item.choiceId;

    // Choice message = Player's message (the only player messages!)
    if (choiceId && choiceId !== 0) {
        return { name: '', icon: '', isMe: true, isChoice: true };
    }

    // charId = 0 without choice
    if (!charId || charId === 0) {
        // Check if has custom name via charStrId
        if (charStrId && charStrId !== 0) {
            // Has name = Character message (not system)
            const name = getEventString(charStrId);
            return { name, icon: '', isMe: false, isChoice: false, isSystem: false };
        }
        // No name = System/Narration message
        return { name: '', icon: '', isMe: false, isChoice: false, isSystem: true };
    }

    // Character message
    if (!STATE.characters) return { name: 'Unknown', icon: '' };
    const char = STATE.characters.find(c => c.id === charId);

    if (!char) {
        return { name: `Char_${charId}`, icon: '' };
    }

    const name = getLocalizedName(char);
    let icon = '';

    if (STATE.skins && char.initSkin) {
        const skin = STATE.skins.find(s => s.id === char.initSkin);
        if (skin) {
            icon = `${skin.path}/bighead.png`;
        }
    }

    return { name, icon, isMe: false, isChoice: false, isSystem: false };
}

export async function renderCatChat() {
    if (!STATE.sns) STATE.sns = await loadJson('ActivitySnsActivity.json');
    if (!STATE.strEvent) STATE.strEvent = await loadJson('StrEvent.json');
    if (!STATE.characters) STATE.characters = await loadJson('ItemDefinitionCharacter.json');
    if (!STATE.skins) try { STATE.skins = await loadJson('ItemDefinitionSkin.json'); } catch (e) { }

    const groups = {};
    const replyMap = {};

    STATE.sns.forEach(item => {
        if (item.parentId === 0) {
            if (!groups[item.activityId]) groups[item.activityId] = [];
            groups[item.activityId].push(item);
        } else {
            if (!replyMap[item.parentId]) replyMap[item.parentId] = [];
            replyMap[item.parentId].push(item);
        }
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => b - a);
    sortedGroupKeys.forEach(key => groups[key].sort((a, b) => a.id - b.id));

    DOM.app.innerHTML = `
        <div class="container-fluid p-0 mb-3">
            <a href="#/" class="btn btn-outline-secondary btn-sm">
                <i class="ri-arrow-left-line me-1"></i> Home
            </a>
        </div>
        
        <div class="chat-container shadow-sm">
            <div class="chat-sidebar">
                <div class="chat-sidebar-header">Chats</div>
                <div class="chat-list" id="chat-list"></div>
            </div>
            <div class="chat-main">
                <div class="chat-header" id="chat-header">Select a chat</div>
                <div class="chat-messages" id="chat-messages">
                    <div class="chat-placeholder">
                        <i class="ri-wechat-line fs-1 mb-3"></i>
                        <p>Select a conversation from the left.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // CSS is now in style.css

    const listEl = document.getElementById('chat-list');
    sortedGroupKeys.forEach((key, idx) => {
        const posts = groups[key];
        const preview = posts.length > 0 ? getEventString(posts[0].contentStrId) : '';

        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `
            <div class="chat-item-title">Event ${key}</div>
            <div class="chat-item-preview">${preview}</div>
        `;
        div.onclick = () => {
            document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            renderChatMessages(key, posts, replyMap);
        };
        listEl.appendChild(div);
        if (idx === 0) div.click();
    });
}

function renderChatMessages(groupId, posts, replyMap) {
    const header = document.getElementById('chat-header');
    const container = document.getElementById('chat-messages');

    header.textContent = `Event ${groupId}`;
    container.innerHTML = '';

    const fragment = document.createDocumentFragment();

    posts.forEach(post => {
        const charInfo = getCharInfo(post);
        const text = getEventString(post.contentStrId);

        let iconUrl = '';
        if (charInfo.isMe) {
            // Player choice messages use mao.png
            iconUrl = './mao.png';
        } else if (!charInfo.isSystem && charInfo.icon) {
            // Character messages use their avatar
            iconUrl = getAssetUrl(charInfo.icon);
        }
        // System messages have no avatar (handled by CSS)

        const msgDiv = createMessageEl(charInfo, iconUrl, text, post.id);

        if (post.contentImage && post.contentImage.length > 0) {
            post.contentImage.forEach(img => {
                if (!img) return;
                const u = getAssetUrl(img);
                if (u) {
                    const imgEl = document.createElement('img');
                    imgEl.className = 'msg-img d-block';
                    imgEl.src = u;
                    imgEl.onclick = () => window.open(u);
                    msgDiv.querySelector('.msg-bubble').appendChild(imgEl);
                }
            });
        }
        fragment.appendChild(msgDiv);

        const replies = replyMap[post.id];
        if (replies) {
            replies.forEach(reply => {
                const rCharInfo = getCharInfo(reply);
                const rText = getEventString(reply.contentStrId);
                let rIconUrl = '';
                if (rCharInfo.isMe) {
                    rIconUrl = './mao.png';
                } else if (!rCharInfo.isSystem && rCharInfo.icon) {
                    rIconUrl = getAssetUrl(rCharInfo.icon);
                }
                const rDiv = createMessageEl(rCharInfo, rIconUrl, rText, reply.id);
                fragment.appendChild(rDiv);
            });
        }
    });

    container.appendChild(fragment);
}

function createMessageEl(charInfo, iconUrl, text, id) {
    const div = document.createElement('div');

    // Determine message type
    if (charInfo.isChoice) {
        div.className = 'msg choice';
    } else if (charInfo.isSystem) {
        div.className = 'msg system';
    } else if (charInfo.isMe) {
        div.className = 'msg me';
    } else {
        div.className = 'msg other';
    }

    const nameHtml = (!charInfo.isMe && charInfo.name) ? `<div class="msg-name">${charInfo.name}</div>` : '';

    div.innerHTML = `
        <div class="msg-avatar">
            <i class="ri-user-smile-line fs-4"></i>
        </div>
        <div class="msg-content">
            ${nameHtml}
            <div class="msg-bubble">${text}</div>
        </div>
    `;

    // Load avatar image (skip for choice messages)
    if (!charInfo.isChoice && iconUrl) {
        const avatarEl = div.querySelector('.msg-avatar');
        const img = document.createElement('img');
        img.alt = charInfo.name || 'Avatar';

        img.onerror = function () {
            this.remove();
        };

        avatarEl.innerHTML = '';
        avatarEl.appendChild(img);

        if (iconUrl.startsWith('./') || iconUrl.startsWith('/')) {
            img.src = iconUrl;
        } else {
            loadImage(img, iconUrl);
        }
    }

    return div;
}
