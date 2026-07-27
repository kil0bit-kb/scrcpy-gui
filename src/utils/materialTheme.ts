import { argbFromHex, hexFromArgb, Hct, SchemeVibrant, SchemeTonalSpot } from '@material/material-color-utilities';

export interface ThemeColors {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    surface: string;
    onSurface: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
}

const SEED_COLORS: Record<string, string> = {
    monochrome: '#8e8e93',
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#eab308',
    pink: '#ec4899',
    purple: '#a855f7',
    // Backwards compatibility mappings for legacy theme IDs
    ultraviolet: '#a855f7',
    astro: '#3b82f6',
    carbon: '#8e8e93',
    emerald: '#10b981',
    bloodmoon: '#ef4444',
};

export function generateVibrantMaterialTheme(themeName: string, isDark: boolean = true): ThemeColors {
    const seedHex = SEED_COLORS[themeName] || SEED_COLORS.monochrome;
    const seedArgb = argbFromHex(seedHex);
    const hct = Hct.fromInt(seedArgb);

    let scheme;
    if (themeName === 'monochrome' || themeName === 'carbon') {
        scheme = new SchemeTonalSpot(hct, isDark, 0.0);
    } else {
        scheme = new SchemeVibrant(hct, isDark, 0.0);
    }

    const base: ThemeColors = {
        primary: hexFromArgb(scheme.primary),
        onPrimary: hexFromArgb(scheme.onPrimary),
        primaryContainer: hexFromArgb(scheme.primaryContainer),
        onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
        secondary: hexFromArgb(scheme.secondary),
        onSecondary: hexFromArgb(scheme.onSecondary),
        secondaryContainer: hexFromArgb(scheme.secondaryContainer),
        onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
        tertiary: hexFromArgb(scheme.tertiary),
        onTertiary: hexFromArgb(scheme.onTertiary),
        tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
        onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),
        surface: hexFromArgb(scheme.surface),
        onSurface: hexFromArgb(scheme.onSurface),
        surfaceContainer: hexFromArgb(scheme.surfaceContainer),
        surfaceContainerHigh: hexFromArgb(scheme.surfaceContainerHigh),
        surfaceContainerHighest: hexFromArgb(scheme.surfaceContainerHighest),
    };

    if (themeName === 'monochrome' || themeName === 'carbon') {
        // True neutral grayscale override (eliminating all blue tint)
        if (isDark) {
            base.primary = '#e2e2e2';
            base.onPrimary = '#18181b';
            base.primaryContainer = '#3f3f46';
            base.onPrimaryContainer = '#f4f4f5';
        } else {
            base.primary = '#27272a';
            base.onPrimary = '#ffffff';
            base.primaryContainer = '#e4e4e7';
            base.onPrimaryContainer = '#18181b';
        }
    }

    return base;
}

export function applyMaterialThemeToCss(themeName: string, colorMode: 'dark' | 'light' | 'system' = 'dark') {
    let isDark = true;
    if (colorMode === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
        isDark = colorMode === 'dark';
    }

    const colors = generateVibrantMaterialTheme(themeName, isDark);
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName);
    root.setAttribute('data-mode', isDark ? 'dark' : 'light');

    root.style.setProperty('--md-sys-color-primary', colors.primary);
    root.style.setProperty('--md-sys-color-on-primary', colors.onPrimary);
    root.style.setProperty('--md-sys-color-primary-container', colors.primaryContainer);
    root.style.setProperty('--md-sys-color-on-primary-container', colors.onPrimaryContainer);
    
    root.style.setProperty('--md-sys-color-secondary', colors.secondary);
    root.style.setProperty('--md-sys-color-on-secondary', colors.onSecondary);
    root.style.setProperty('--md-sys-color-secondary-container', colors.secondaryContainer);
    root.style.setProperty('--md-sys-color-on-secondary-container', colors.onSecondaryContainer);

    root.style.setProperty('--md-sys-color-tertiary', colors.tertiary);
    root.style.setProperty('--md-sys-color-on-tertiary', colors.onTertiary);
    root.style.setProperty('--md-sys-color-tertiary-container', colors.tertiaryContainer);
    root.style.setProperty('--md-sys-color-on-tertiary-container', colors.onTertiaryContainer);

    root.style.setProperty('--md-sys-color-surface', colors.surface);
    root.style.setProperty('--md-sys-color-on-surface', colors.onSurface);
    root.style.setProperty('--md-sys-color-surface-container', colors.surfaceContainer);
    root.style.setProperty('--md-sys-color-surface-container-high', colors.surfaceContainerHigh);
    root.style.setProperty('--md-sys-color-surface-container-highest', colors.surfaceContainerHighest);
    
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--text-on-primary', colors.onPrimary);
    root.style.setProperty('--text-base', colors.onSurface);
    root.style.setProperty('--text-muted', isDark ? 'rgba(255, 255, 255, 0.70)' : 'rgba(0, 0, 0, 0.70)');
    root.style.setProperty('--text-subtle', isDark ? 'rgba(255, 255, 255, 0.50)' : 'rgba(0, 0, 0, 0.50)');
    root.style.setProperty('--bg-base', colors.surface);
    root.style.setProperty('--bg-surface', colors.surfaceContainer);
    root.style.setProperty('--bg-elevated', colors.surfaceContainerHigh);
    root.style.setProperty('--bg-input', colors.surfaceContainerHighest);
}
