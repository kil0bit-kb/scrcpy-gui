/**
 * Scrcpy GUI - Internationalization (i18n) Engine
 * Supports 30+ languages with auto-detection and persistence.
 */

// Guard for non-Electron environments (browser preview)
let fs, pathModule;
try {
    fs = require('fs');
    pathModule = require('path');
} catch (e) {
    fs = null;
    pathModule = null;
}

const I18n = (() => {
    let currentLang = 'en';
    let translations = {};
    let fallback = {};
    const LANG_KEY = 'scrcpy_gui_language';

    const SUPPORTED_LANGUAGES = {
        'en':    { name: 'English',              native: 'English',             flag: '🇬🇧' },
        'pt-BR': { name: 'Portuguese (Brazil)',   native: 'Português (Brasil)',  flag: '🇧🇷' },
        'pt-PT': { name: 'Portuguese (Portugal)', native: 'Português (Portugal)',flag: '🇵🇹' },
        'es':    { name: 'Spanish',               native: 'Español',            flag: '🇪🇸' },
        'fr':    { name: 'French',                native: 'Français',           flag: '🇫🇷' },
        'de':    { name: 'German',                native: 'Deutsch',            flag: '🇩🇪' },
        'it':    { name: 'Italian',               native: 'Italiano',           flag: '🇮🇹' },
        'nl':    { name: 'Dutch',                 native: 'Nederlands',         flag: '🇳🇱' },
        'ru':    { name: 'Russian',               native: 'Русский',            flag: '🇷🇺' },
        'zh-CN': { name: 'Chinese (Simplified)',  native: '简体中文',             flag: '🇨🇳' },
        'zh-TW': { name: 'Chinese (Traditional)', native: '繁體中文',             flag: '🇹🇼' },
        'ja':    { name: 'Japanese',              native: '日本語',               flag: '🇯🇵' },
        'ko':    { name: 'Korean',                native: '한국어',               flag: '🇰🇷' },
        'ar':    { name: 'Arabic',                native: 'العربية',             flag: '🇸🇦' },
        'hi':    { name: 'Hindi',                 native: 'हिन्दी',                flag: '🇮🇳' },
        'bn':    { name: 'Bengali',               native: 'বাংলা',               flag: '🇧🇩' },
        'tr':    { name: 'Turkish',               native: 'Türkçe',             flag: '🇹🇷' },
        'pl':    { name: 'Polish',                native: 'Polski',             flag: '🇵🇱' },
        'uk':    { name: 'Ukrainian',             native: 'Українська',         flag: '🇺🇦' },
        'vi':    { name: 'Vietnamese',            native: 'Tiếng Việt',         flag: '🇻🇳' },
        'th':    { name: 'Thai',                  native: 'ไทย',                flag: '🇹🇭' },
        'id':    { name: 'Indonesian',            native: 'Bahasa Indonesia',   flag: '🇮🇩' },
        'ms':    { name: 'Malay',                 native: 'Bahasa Melayu',      flag: '🇲🇾' },
        'cs':    { name: 'Czech',                 native: 'Čeština',            flag: '🇨🇿' },
        'ro':    { name: 'Romanian',              native: 'Română',             flag: '🇷🇴' },
        'hu':    { name: 'Hungarian',             native: 'Magyar',             flag: '🇭🇺' },
        'el':    { name: 'Greek',                 native: 'Ελληνικά',           flag: '🇬🇷' },
        'sv':    { name: 'Swedish',               native: 'Svenska',            flag: '🇸🇪' },
        'fi':    { name: 'Finnish',               native: 'Suomi',              flag: '🇫🇮' },
        'da':    { name: 'Danish',                native: 'Dansk',              flag: '🇩🇰' }
    };
    /**
     * Load a language JSON file from the locales directory.
     */
    function loadLocale(lang) {
        if (!fs || !pathModule) return null;
        try {
            const filePath = pathModule.join(__dirname, 'locales', `${lang}.json`);
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (e) {
            console.warn(`[i18n] Failed to load locale: ${lang}`, e);
        }
        return null;
    }
    function detectLanguage() {
        // Check localStorage first
        const saved = localStorage.getItem(LANG_KEY);
        if (saved && SUPPORTED_LANGUAGES[saved]) return saved;

        const sysLang = navigator.language || navigator.userLanguage || 'en';
        
        if (SUPPORTED_LANGUAGES[sysLang]) return sysLang;

        const base = sysLang.split('-')[0];

        if (sysLang.toLowerCase().startsWith('pt-br')) return 'pt-BR';
        if (sysLang.toLowerCase().startsWith('pt')) return 'pt-PT';
        if (sysLang.toLowerCase().startsWith('zh-tw') || sysLang.toLowerCase().startsWith('zh-hant')) return 'zh-TW';
        if (sysLang.toLowerCase().startsWith('zh')) return 'zh-CN';
        if (sysLang.toLowerCase().startsWith('nb') || sysLang.toLowerCase().startsWith('nn') || sysLang.toLowerCase().startsWith('no')) return 'da'; // Close enough

        // Base language match
        if (SUPPORTED_LANGUAGES[base]) return base;

        return 'en';
    }


    function init() {
        fallback = loadLocale('en') || {};
        currentLang = detectLanguage();
        translations = loadLocale(currentLang) || {};
        if (currentLang === 'en') {
            translations = fallback;
        }

        applyTranslations();
        return currentLang;
    }

    /**
     * Translate a key with optional parameter interpolation.
     * @param {string} key 
     * @param {object} params 
     * @returns {string} 
     */
    function t(key, params = {}) {
        let str = translations[key] || fallback[key] || key;

        Object.keys(params).forEach(param => {
            str = str.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
        });

        return str;
    }
    function applyTranslations() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });

        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key) el.innerHTML = t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = t(key);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = t(key);
        });


        document.documentElement.lang = currentLang;
        const rtlLangs = ['ar', 'he', 'fa'];
        document.documentElement.dir = rtlLangs.includes(currentLang) ? 'rtl' : 'ltr';
    }

    /**
     * Switch to a new language.
     * @param {string} lang 
     */
    function setLanguage(lang) {
        if (!SUPPORTED_LANGUAGES[lang]) return false;

        const loaded = loadLocale(lang);
        if (!loaded && lang !== 'en') return false;

        currentLang = lang;
        translations = loaded || fallback;
        localStorage.setItem(LANG_KEY, lang);

        applyTranslations();
        return true;
    }


    function getCurrentLanguage() {
        return currentLang;
    }

  
    function getSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    function getLanguageInfo(code) {
        return SUPPORTED_LANGUAGES[code] || null;
    }

    return {
        init,
        t,
        setLanguage,
        getCurrentLanguage,
        getSupportedLanguages,
        getLanguageInfo,
        applyTranslations,
        SUPPORTED_LANGUAGES
    };
})();

if (typeof window !== 'undefined') {
    window.I18n = I18n;
    window.t = I18n.t;
}
