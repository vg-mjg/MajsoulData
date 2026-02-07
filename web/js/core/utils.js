import { STATE } from './state.js';

const XOR_KEY = 73;

const SERVERS = {
    en: 'https://mahjongsoul.game.yo-star.com/',
    kr: 'https://mahjongsoul.game.yo-star.com/',
    jp: 'https://game.mahjongsoul.com/',
    chs: 'https://game.maj-soul.com/1/',
    chs_t: 'https://game.maj-soul.com/1/',
    default: 'https://game.maj-soul.com/1/'
};

function getServerForPath(path) {
    if (path.startsWith('en/')) return SERVERS.en;
    if (path.startsWith('kr/')) return SERVERS.kr;
    if (path.startsWith('jp/')) return SERVERS.jp;
    if (path.startsWith('chs_t/')) return SERVERS.chs_t;
    if (path.startsWith('chs/')) return SERVERS.chs;
    return SERVERS.default;
}

export async function loadJson(file) {
    try {
        const res = await fetch(`./data/${file}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`Failed to load ${file}`, e);
        throw e;
    }
}

export function getAssetUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const hasExt = cleanPath.includes('.');
    const candidates = [];

    // Add prefixes including 'lang/base/' which is common for CN server assets
    const prefixes = ['chs/', 'jp/', 'en/', 'chs_t/', 'kr/', 'lang/base/', 'lang/scene/', ''];
    prefixes.forEach(prefix => {
        candidates.push(prefix + cleanPath);
        if (!hasExt) candidates.push(prefix + cleanPath + '.png');
    });

    if (STATE.resVersion && STATE.resVersion.res) {
        for (const candidate of candidates) {
            if (STATE.resVersion.res[candidate]) {
                const prefix = STATE.resVersion.res[candidate].prefix;
                const server = getServerForPath(candidate);
                return `${server}${prefix}/${candidate}`;
            }
        }

        // Fallback checks for specific hidden assets (like Table_Dif.jpg)
        // If exact match failed, try to construct a URL using a borrowed prefix.
        // This is necessary because some assets exist on the server but are missing from resversion.json.
        const allowForce = cleanPath.includes('Table_Dif.jpg') || cleanPath.includes('ui.png') || cleanPath.includes('loading_cg') || cleanPath.includes('achievementgroup') || cleanPath.includes('bighead.png') || cleanPath.includes('smallhead.png') || cleanPath.includes('half.png') || cleanPath.includes('mao.png') || cleanPath.includes('sns') || cleanPath.includes('background') || cleanPath.includes('myres') || cleanPath.includes('lobby');
        if (allowForce) {

            const keys = Object.keys(STATE.resVersion.res);
            if (keys.length > 0) {
                const borrowedPrefix = STATE.resVersion.res[keys[0]].prefix;

                const bestCandidate = candidates.find(c => c.includes('lang/scene/')) || candidates[0];
                const server = getServerForPath(bestCandidate);

                return `${server}${borrowedPrefix}/${bestCandidate}`;
            }
        }
    }
    return null;
}

export async function loadImage(imgElement, url) {
    if (!url) return;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buffer = await res.arrayBuffer();
        let view = new Uint8Array(buffer);

        // Auto-decrypt logic
        // PNG: 89 50 4E 47
        // JPG: FF D8
        const isPng = view[0] === 0x89 && view[1] === 0x50;
        const isJpg = view[0] === 0xFF && view[1] === 0xD8;

        // If not PNG and not JPG, assume XOR-encrypted and decrypt it
        if (!isPng && !isJpg) {
            for (let i = 0; i < view.length; i++) {
                view[i] ^= XOR_KEY;
            }
        }

        // Determine MIME type based on header (after potential decryption)
        let mimeType = 'image/png';
        if (view[0] === 0xFF && view[1] === 0xD8) {
            mimeType = 'image/jpeg';
        }

        const blob = new Blob([view], { type: mimeType });
        const objectURL = URL.createObjectURL(blob);
        imgElement.src = objectURL;

    } catch (e) {
        // Fallback: Try direct load which bypasses CORS for display-only
        imgElement.removeAttribute('crossorigin');
        imgElement.src = url;

        imgElement.onerror = () => {
            const wrapper = imgElement.closest('.asset-img-wrapper') || imgElement.parentElement;
            if (wrapper && wrapper.classList.contains('asset-img-wrapper')) {
                wrapper.innerHTML = `<div class="d-flex align-items-center justify-content-center h-100"><i class="ri-image-line text-muted fs-4"></i></div>`;
            }
        };
    }
}
