import { useEffect, useState } from 'react';
import { LayoutGrid, Play } from 'lucide-react';
import { useI18n } from '../i18n';
import type { MultiDeviceSettings } from '../lib/multiDevice';

interface MultiDevicePanelProps {
    devices: string[];
    runningDevices: string[];
    settings: MultiDeviceSettings;
    onChange: (patch: Partial<MultiDeviceSettings>) => void;
    onLaunchAll: () => void | Promise<unknown>;
    isLaunching: boolean;
}

function NumberField({
    label,
    value,
    min,
    max,
    unit,
    onChange
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    unit?: string;
    onChange: (value: number) => void;
}) {
    const [draft, setDraft] = useState(String(value));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) setDraft(String(value));
    }, [focused, value]);

    const commit = () => {
        const numeric = Number(draft);
        if (draft.trim() !== '' && Number.isFinite(numeric)) {
            onChange(numeric);
        } else {
            setDraft(String(value));
        }
    };

    return (
        <label className="block space-y-1">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
            <div className="relative">
                <input
                    type="number"
                    aria-label={label}
                    value={draft}
                    min={min}
                    max={max}
                    step={1}
                    onFocus={() => setFocused(true)}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => {
                        setFocused(false);
                        commit();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-[11px] text-zinc-300 focus:border-primary/60 focus:outline-none transition-colors tabular-nums"
                />
                {unit && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600 pointer-events-none">{unit}</span>
                )}
            </div>
        </label>
    );
}

export default function MultiDevicePanel({
    devices,
    runningDevices,
    settings,
    onChange,
    onLaunchAll,
    isLaunching
}: MultiDevicePanelProps) {
    const { t } = useI18n();
    const pending = devices.filter(device => !runningDevices.includes(device)).length;
    const disabled = pending === 0 || isLaunching;

    const buttonLabel = isLaunching
        ? t('multiDevice.launching')
        : devices.length === 0
            ? t('multiDevice.noDevices')
            : pending === 0
                ? t('multiDevice.allRunning')
                : t('multiDevice.launchAllCount', { count: pending });

    return (
        <div className="glass p-3.5 rounded-2xl space-y-3 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-1.5">
                <LayoutGrid size={12} className="text-primary" />
                <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{t('multiDevice.title')}</h2>
            </div>

            <p className="text-[9px] text-zinc-500 leading-relaxed font-medium">{t('multiDevice.subtitle')}</p>

            <button
                type="button"
                onClick={() => void onLaunchAll()}
                disabled={disabled}
                className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-primary text-on-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
                <Play size={12} fill="currentColor" />
                {buttonLabel}
            </button>

            <div className="grid grid-cols-2 gap-2">
                <NumberField
                    label={t('multiDevice.windowWidth')}
                    value={settings.windowWidth}
                    min={100}
                    max={10000}
                    unit={t('multiDevice.pixels')}
                    onChange={(value) => onChange({ windowWidth: value })}
                />
                <NumberField
                    label={t('multiDevice.windowHeight')}
                    value={settings.windowHeight}
                    min={100}
                    max={10000}
                    unit={t('multiDevice.pixels')}
                    onChange={(value) => onChange({ windowHeight: value })}
                />
                <NumberField
                    label={t('multiDevice.columns')}
                    value={settings.columns}
                    min={1}
                    max={12}
                    onChange={(value) => onChange({ columns: value })}
                />
                <NumberField
                    label={t('multiDevice.gap')}
                    value={settings.gap}
                    min={0}
                    max={500}
                    unit={t('multiDevice.pixels')}
                    onChange={(value) => onChange({ gap: value })}
                />
                <NumberField
                    label={t('multiDevice.startX')}
                    value={settings.startX}
                    min={-10000}
                    max={10000}
                    unit={t('multiDevice.pixels')}
                    onChange={(value) => onChange({ startX: value })}
                />
                <NumberField
                    label={t('multiDevice.startY')}
                    value={settings.startY}
                    min={-10000}
                    max={10000}
                    unit={t('multiDevice.pixels')}
                    onChange={(value) => onChange({ startY: value })}
                />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800/50">
                <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-tight text-zinc-300">{t('multiDevice.autoLaunch')}</p>
                    <p className="text-[8px] text-zinc-600 leading-tight">{t('multiDevice.autoLaunchTooltip')}</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={settings.autoLaunch}
                    aria-label={t('multiDevice.autoLaunch')}
                    onClick={() => onChange({ autoLaunch: !settings.autoLaunch })}
                    className={`w-6 h-3.5 shrink-0 rounded-full p-0.5 transition-all duration-300 ${settings.autoLaunch ? 'bg-primary' : 'bg-zinc-800'}`}
                >
                    <span className={`block w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-300 ${settings.autoLaunch ? 'bg-[var(--text-on-primary)] translate-x-2.5' : 'bg-white translate-x-0'}`} />
                </button>
            </div>

            <p className="text-[8px] text-zinc-600 leading-relaxed">{t('multiDevice.layoutNote')}</p>
        </div>
    );
}
