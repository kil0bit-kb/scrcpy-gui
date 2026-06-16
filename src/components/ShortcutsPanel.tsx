import { useEffect, useState } from 'react';
import {
    Maximize,
    Home,
    ChevronLeft,
    List,
    Power,
    RotateCw,
    Clipboard,
    MonitorOff,
    Keyboard,
    Settings2,
    X
} from 'lucide-react';
import { useI18n } from '../i18n';

const STORAGE_KEY = 'scrcpy_shortcut_modifier';
const DEFAULT_MODIFIER = 'Alt';

const PRESETS = ['Alt', 'Ctrl', 'Ctrl+Alt'] as const;

type ShortcutModifier = typeof PRESETS[number];

function readStoredModifier(): ShortcutModifier {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (PRESETS.includes(stored as ShortcutModifier)) {
            return stored as ShortcutModifier;
        }
        // Overwrite stale / no-longer-valid value so handleStart never reads it.
        localStorage.setItem(STORAGE_KEY, DEFAULT_MODIFIER);
    } catch {
        // ignore
    }
    return DEFAULT_MODIFIER;
}

/** "Ctrl+Shift" → "Ctrl + Shift" for human display */
function displayModifier(modifier: string): string {
    return modifier.split('+').join(' + ');
}

export default function ShortcutsPanel() {
    const { t } = useI18n();
    const [modifier, setModifier] = useState<ShortcutModifier>(DEFAULT_MODIFIER);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [draftModifier, setDraftModifier] = useState<ShortcutModifier>(DEFAULT_MODIFIER);

    useEffect(() => {
        const stored = readStoredModifier();
        setModifier(stored);
        setDraftModifier(stored);
    }, []);

    const openSettings = () => {
        setDraftModifier(modifier);
        setIsSettingsOpen(true);
    };

    const saveSettings = () => {
        setModifier(draftModifier);
        try {
            localStorage.setItem(STORAGE_KEY, draftModifier);
        } catch {
            // ignore
        }
        setIsSettingsOpen(false);
    };

    const shortcuts = [
        { label: t('shortcuts.full'), key: 'F', icon: Maximize },
        { label: t('shortcuts.home'), key: 'H', icon: Home },
        { label: t('shortcuts.back'), key: 'B', icon: ChevronLeft },
        { label: t('shortcuts.recents'), key: 'S', icon: List },
        { label: t('shortcuts.power'), key: 'P', icon: Power },
        { label: t('shortcuts.rotate'), key: 'R', icon: RotateCw },
        { label: t('shortcuts.paste'), key: 'V', icon: Clipboard },
        { label: t('shortcuts.off'), key: 'O', icon: MonitorOff },
    ];

    return (
        <>
            <div className="glass p-3.5 rounded-2xl space-y-2 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/50 pb-1.5 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <Keyboard size={12} className="text-zinc-500 shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest truncate">{t('shortcuts.title')}</h2>
                            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-zinc-600 mt-0.5">
                                {displayModifier(modifier)} + {t('shortcuts.rotate')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={openSettings}
                        className="shrink-0 p-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-white hover:border-primary/40 hover:bg-primary/10 transition-all active:scale-95"
                        aria-label={t('shortcuts.settings')}
                        title={t('shortcuts.settings')}
                    >
                        <Settings2 size={12} />
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {shortcuts.map(s => (
                        <div key={s.key} className="group relative flex flex-col items-center justify-center bg-zinc-950/30 p-1.5 rounded-lg border border-transparent hover:border-zinc-700 transition-all cursor-help">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-300 text-[9px] font-bold px-2 py-1 rounded border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                {s.label}
                            </div>
                            <s.icon size={14} className="text-zinc-500 group-hover:text-primary transition-colors mb-1" />
                            <kbd className="min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-black bg-zinc-800/50 text-zinc-400 group-hover:text-white group-hover:bg-primary/20 px-1 rounded border border-zinc-800 group-hover:border-primary/50 transition-all">
                                {s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
            </div>

            {isSettingsOpen && (
                <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setIsSettingsOpen(false)}
                    />
                    <div className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.75)] overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-4">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.22em] text-white">
                                    {t('shortcuts.settings')}
                                </h3>
                                <p className="text-[10px] text-zinc-500 mt-1">
                                    {t('shortcuts.description')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen(false)}
                                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                                aria-label={t('common.close')}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Active modifier label */}
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                    {t('shortcuts.modifier')}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                                    {displayModifier(draftModifier)} + R
                                </span>
                            </div>

                            {/* Modifier options */}
                            <div className="grid grid-cols-3 gap-2">
                                {PRESETS.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setDraftModifier(item)}
                                        className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${draftModifier === item ? 'border-primary bg-primary/15 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.2)]' : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-white'}`}
                                    >
                                        {displayModifier(item)}
                                    </button>
                                ))}
                            </div>

                            {/* Preview grid */}
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                        {t('shortcuts.preview')}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                        {displayModifier(draftModifier)} + key
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {shortcuts.map((item) => (
                                        <div key={item.key} className="flex flex-col items-center justify-center bg-zinc-900/40 p-2 rounded-xl border border-zinc-800">
                                            <item.icon size={14} className="text-zinc-500 mb-1" />
                                            <kbd className="min-w-[14px] h-4 flex items-center justify-center text-[9px] font-black bg-zinc-800/70 text-zinc-300 px-1 rounded border border-zinc-700">
                                                {item.key}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="px-5 pb-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDraftModifier(DEFAULT_MODIFIER)}
                                className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-[0.18em] hover:text-white hover:border-zinc-700 transition-all active:scale-95"
                            >
                                {t('shortcuts.reset')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen(false)}
                                className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-[0.18em] hover:text-white hover:border-zinc-700 transition-all active:scale-95"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={saveSettings}
                                className="flex-1 py-3 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-[0.18em] hover:scale-[1.02] transition-all active:scale-95"
                            >
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
