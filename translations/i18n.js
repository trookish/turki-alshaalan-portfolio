// Lightweight i18n helper: returns the value for the current language
// from a { en, ar } pair, falling back to en if the key is missing.

import { ar as arStatic } from './ar.js';
import { en as enStatic } from './en.js';
import { termTranslations } from './dynamic.js';

export const staticTranslations = { en: enStatic, ar: arStatic };

/**
 * Returns the Arabic translation for a given English term, or the
 * English term if no Arabic translation is defined.
 */
export function t(text) {
    return termTranslations[text] || text;
}

/**
 * Returns the value for `key` from the static map for the current
 * language, or the key itself if missing.
 */
export function ts(key, lang = currentLang()) {
    const map = staticTranslations[lang] || staticTranslations.en;
    return map[key] !== undefined ? map[key] : key;
}

export function currentLang() {
    return localStorage.getItem('lang') || 'en';
}

export function isArabic() {
    return currentLang() === 'ar';
}
