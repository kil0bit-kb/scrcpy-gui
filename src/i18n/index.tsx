import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { en, type Translations } from './locales/en';
import { fr } from './locales/fr';
import { ptBR } from './locales/pt-BR';
import { zhCN } from './locales/zh-CN';
import { zhTW } from './locales/zh-TW';
import { ru } from './locales/ru';
import { id } from './locales/id';
import { ar } from './locales/ar';

export type Locale = 'en' | 'fr' | 'pt-BR' | 'zh-CN' | 'zh-TW' | 'ru' | 'id' | 'ar';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'pt-BR', 'zh-CN', 'zh-TW', 'ru', 'id', 'ar'];
const STORAGE_KEY = 'scrcpy_locale';
const localeBundles: Record<Locale, Translations> = {
    en,
    fr,
    'pt-BR': ptBR,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    ru,
    id,
    ar
};

type Primitive = string | number | boolean;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
    if (!isPlainObject(base) || !isPlainObject(override)) {
        return (override === undefined || override === null) ? base : (override as T);
    }
    const result: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
        }
        const baseVal = Object.prototype.hasOwnProperty.call(base, key)
            ? (base as Record<string, unknown>)[key]
            : undefined;
        const overrideVal = Object.prototype.hasOwnProperty.call(override, key)
            ? (override as Record<string, unknown>)[key]
            : undefined;
        if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
            result[key] = deepMerge(baseVal, overrideVal);
        } else if (overrideVal === undefined || overrideVal === null || overrideVal === '') {
            result[key] = baseVal;
        } else {
            result[key] = overrideVal;
        }
    }
    return result as T;
}

function detectInitialLocale(): Locale {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && (SUPPORTED_LOCALES as string[]).includes(stored)) {
            return stored as Locale;
        }
    } catch {
        // ignore storage failures (e.g. SSR)
    }

    const navigatorLanguages: string[] = [];
    if (typeof navigator !== 'undefined') {
        if (Array.isArray(navigator.languages)) navigatorLanguages.push(...navigator.languages);
        if (navigator.language) navigatorLanguages.push(navigator.language);
    }

    for (const raw of navigatorLanguages) {
        if (!raw) continue;
        const lower = raw.toLowerCase();
        if (lower === 'zh-tw' || lower.startsWith('zh-tw')) return 'zh-TW';
        if (lower === 'zh-hk' || lower.startsWith('zh-hk')) return 'zh-TW';
        if (lower === 'zh-mo' || lower.startsWith('zh-mo')) return 'zh-TW';
        if (lower === 'zh-hant' || lower.startsWith('zh-hant')) return 'zh-TW';
        if (lower === 'zh-cn' || lower.startsWith('zh-cn')) return 'zh-CN';
        if (lower === 'zh-sg' || lower.startsWith('zh-sg')) return 'zh-CN';
        if (lower === 'zh-hans' || lower.startsWith('zh-hans')) return 'zh-CN';
        if (lower.startsWith('zh')) return 'zh-CN';
        if (lower === 'pt-br' || lower.startsWith('pt-br')) return 'pt-BR';
        if (lower.startsWith('pt')) return 'pt-BR';
        if (lower.startsWith('ru')) return 'ru';
        if (lower.startsWith('fr')) return 'fr';
        if (lower.startsWith('id')) return 'id';
        if (lower.startsWith('ar')) return 'ar';
        if (lower.startsWith('en')) return 'en';
    }

    return 'en';
}

function resolveByPath(source: unknown, path: string): unknown {
    if (!path) return source;
    const segments = path.split('.');
    let current: unknown = source;
    for (const segment of segments) {
        if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
            return undefined;
        }
        if (isPlainObject(current) && Object.prototype.hasOwnProperty.call(current, segment)) {
            current = (current as Record<string, unknown>)[segment];
        } else {
            return undefined;
        }
    }
    return current;
}

function formatTemplate(template: string, vars?: Record<string, Primitive>): string {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            return match;
        }
        if (Object.prototype.hasOwnProperty.call(vars, key)) {
            const value = vars[key];
            return value === undefined || value === null ? match : String(value);
        }
        return match;
    });
}

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, vars?: Record<string, Primitive>) => string;
    translations: Translations;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
    children: React.ReactNode;
    initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
    const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectInitialLocale());

   useEffect(() => {
    try {
        localStorage.setItem(STORAGE_KEY, locale);
    } catch {
        // ignore storage failures
    }

    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', locale);
        document.documentElement.setAttribute(
            'dir',
            locale === 'ar' ? 'rtl' : 'ltr'
        );
    }
}, [locale]);

    const translations = useMemo<Translations>(() => {
        const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
        const overrides = localeBundles[safeLocale] ?? en;
        // Deep-merge into the English base so that any missing key in another
        // locale falls back to the English string automatically.
        return deepMerge(en, overrides);
    }, [locale]);

    const value = useMemo<I18nContextValue>(() => {
        const t = (key: string, vars?: Record<string, Primitive>): string => {
            const localized = resolveByPath(translations, key);
            if (typeof localized === 'string') {
                return formatTemplate(localized, vars);
            }
            const fallback = resolveByPath(en, key);
            if (typeof fallback === 'string') {
                return formatTemplate(fallback, vars);
            }
            return key;
        };
        return {
            locale,
            setLocale: setLocaleState,
            t,
            translations
        };
    }, [locale, translations]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        // Allow components to be used outside the provider in tests by falling
        // back to a no-op implementation backed by English.
        const t = (key: string, vars?: Record<string, Primitive>): string => {
            const fallback = resolveByPath(en, key);
            if (typeof fallback === 'string') return formatTemplate(fallback, vars);
            return key;
        };
        return {
            locale: 'en',
            setLocale: () => undefined,
            t,
            translations: en
        };
    }
    return ctx;
}

export function useTranslation() {
    const { t, locale, setLocale, translations } = useI18n();
    return { t, locale, setLocale, translations };
}
