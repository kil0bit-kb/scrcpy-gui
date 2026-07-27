import { Settings, Check, LightMode, DarkMode, DesktopWindows, FormatSize, Translate } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { SUPPORTED_LOCALES, useI18n, type Locale } from '../i18n';
import CustomDropdown from './CustomDropdown';

interface SettingsPanelProps {
    currentTheme: string;
    onThemeChange: (theme: string) => void;
    colorMode: 'light' | 'dark' | 'system';
    onColorModeChange: (mode: 'light' | 'dark' | 'system') => void;
    fontScale: number;
    onFontScaleChange: (scale: number) => void;
}

const FONT_SCALE_OPTIONS = [
    { value: 80, label: 'Small (80%)' },
    { value: 100, label: 'Normal (100%)' },
    { value: 125, label: 'Large (125%)' },
    { value: 175, label: 'Extra Large (175%)' }
];

const THEME_OPTIONS = [
    { id: 'monochrome', color: '#8e8e93', label: 'Monochrome' },
    { id: 'red', color: '#ef4444', label: 'Red' },
    { id: 'blue', color: '#3b82f6', label: 'Blue' },
    { id: 'green', color: '#10b981', label: 'Green' },
    { id: 'yellow', color: '#eab308', label: 'Yellow' },
    { id: 'pink', color: '#ec4899', label: 'Pink' },
    { id: 'purple', color: '#a855f7', label: 'Purple' },
];

export default function SettingsPanel({
    currentTheme,
    onThemeChange,
    colorMode,
    onColorModeChange,
    fontScale,
    onFontScaleChange,
}: SettingsPanelProps) {
    const { locale, setLocale, translations } = useI18n();

    return (
        <div className="glass p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md space-y-3 shadow-sm border border-[var(--md-sys-color-surface-container-highest)]">
            <div className="flex items-center gap-2 border-b border-[var(--md-sys-color-surface-container-highest)] pb-1.5 mb-1">
                <Settings size={18} className="text-primary shrink-0" />
                <h2 className="text-card-title">Settings</h2>
            </div>

            <div className="flex flex-col gap-3">

{/* 2. Color Mode Toggle */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-(--text-muted) block">
                        Theme
                    </label>
                    <div className="grid grid-cols-3 gap-0.5 bg-(--md-sys-color-surface-container-highest) p-1 rounded-2xl">
                        {([
                            { id: 'light' as const, Icon: LightMode, label: 'Light' },
                            { id: 'dark' as const, Icon: DarkMode, label: 'Dark' },
                            { id: 'system' as const, Icon: DesktopWindows, label: 'System' },
                        ] as const).map(({ id, Icon, label }) => (
                            <button
                                key={id}
                                onClick={() => onColorModeChange(id)}
                                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold transition-all duration-150 ease-out cursor-pointer rounded-2xl ${
                                    colorMode === id
                                        ? 'bg-primary text-on-primary font-black shadow-md z-10 scale-[1.02]'
                                        : 'text-(--text-muted) hover:text-(--text-base) hover:bg-(--md-sys-color-surface-container)'
                                }`}
                            >
                                <Icon size={15} className="shrink-0" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 1. Theme Color Swatches */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-(--text-muted) block">
                        Accent
                    </label>
                    <div className="flex items-center justify-start gap-2.5 py-1 px-0.5">
                        {THEME_OPTIONS.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => onThemeChange(theme.id)}
                                title={theme.label}
                                className={`w-7 h-7 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                                    currentTheme === theme.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-black scale-110' : 'hover:scale-105 opacity-85 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: theme.color }}
                            >
                                {currentTheme === theme.id && (
                                    <Check size={14} className="text-white drop-shadow-sm" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                

                {/* 3 & 4. Font Scale & Language (Single Line) */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                    <CustomDropdown
                        label="Font Scaling"
                        value={fontScale}
                        onChange={(val) => onFontScaleChange(Number(val))}
                        options={FONT_SCALE_OPTIONS}
                        icon={<FormatSize size={14} />}
                        className="w-full max-w-full"
                    />
                    <CustomDropdown
                        label="Language"
                        value={locale}
                        onChange={(val) => setLocale(val as Locale)}
                        options={SUPPORTED_LOCALES.map((loc: Locale) => ({
                            value: loc,
                            label: translations.languages[loc]
                        }))}
                        icon={<Translate size={14} />}
                        className="w-full max-w-full"
                    />
                </div>
            </div>
        </div>
    );
}
