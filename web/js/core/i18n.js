import { STATE } from './state.js';

export function getLocalizedName(obj) {
    if (!obj) return 'Unknown';

    const map = {
        'en': 'nameEn',
        'kr': 'nameKr',
        'jp': 'nameJp',
        'chs': 'nameChs',
        'chsT': 'nameChsT'
    };

    const key = map[STATE.lang] || 'nameEn';
    return obj[key] || obj.nameEn || obj.nameChs || obj.nameJp || 'Untitled';
}
