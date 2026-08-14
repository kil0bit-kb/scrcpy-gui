import { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { ScrcpyConfig } from '../hooks/useScrcpy';
import Tooltip from './Tooltip';
import { Coffee, MonitorOff, Volume2, Layers, Maximize, Square, Circle, Folder, Settings2, ChevronDown, ActivitySquare, Move } from 'lucide-react';
import { useI18n } from '../i18n';

const AUDIO_CODEC_VALUES = ['auto', 'opus', 'aac', 'flac', 'raw'] as const;
type AudioCodec = typeof AUDIO_CODEC_VALUES[number];

interface SessionBehaviorProps {
    config: ScrcpyConfig;
    setConfig: (c: ScrcpyConfig) => void;
}

export default function SessionBehavior({ config, setConfig }: SessionBehaviorProps) {
    const { t } = useI18n();

    const handleChange = (field: keyof ScrcpyConfig, value: any) => {
        const newConfig = { ...config, [field]: value };
        setConfig(newConfig);
        if (field === 'recordPath') {
            localStorage.setItem('scrcpy_record_path', value);
        }
    };

    const handlePickFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: t('sessionBehavior.selectRecordingFolderTitle')
            });
            if (selected) {
                handleChange('recordPath', selected);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const AudioCodecPicker = ({ value, onChange, disabled }: { value: AudioCodec, onChange: (v: AudioCodec) => void, disabled: boolean }) => {
        const [isOpen, setIsOpen] = useState(false);
        const ref = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const onDoc = (e: MouseEvent) => {
                if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
            };
            if (isOpen) document.addEventListener('mousedown', onDoc);
            return () => document.removeEventListener('mousedown', onDoc);
        }, [isOpen]);

        useEffect(() => {
            if (disabled) setIsOpen(false);
        }, [disabled]);

        const labelFor = (v: AudioCodec) =>
            v === 'auto' ? t('sessionBehavior.audioCodecAuto') :
                v === 'opus' ? t('sessionBehavior.audioCodecOpus') :
                    v === 'aac' ? t('sessionBehavior.audioCodecAac') :
                        v === 'flac' ? t('sessionBehavior.audioCodecFlac') :
                            t('sessionBehavior.audioCodecRaw');

        return (
            <div
                ref={ref}
                onClick={(e) => e.stopPropagation()}
                className={`mt-0.5 pl-7 pr-2 pb-1 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
            >
                <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">{t('sessionBehavior.audioCodec')}</span>
                    <Tooltip text={t('sessionBehavior.audioCodecTooltip')} />
                    <div className="relative ml-auto">
                        <button
                            type="button"
                            onClick={() => !disabled && setIsOpen(o => !o)}
                            disabled={disabled}
                            className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 hover:border-primary/60 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300 hover:text-primary transition-colors"
                        >
                            <span>{labelFor(value)}</span>
                            <ChevronDown size={10} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                            <div className="absolute right-0 top-full mt-1 z-50 min-w-[88px] bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl py-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                                {AUDIO_CODEC_VALUES.map((opt) => (
                                    <div
                                        key={opt}
                                        onClick={() => { onChange(opt); setIsOpen(false); }}
                                        className={`px-2 py-1 text-[9px] uppercase tracking-wider font-bold cursor-pointer transition-colors ${value === opt ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:bg-primary hover:text-on-primary'}`}
                                    >
                                        {labelFor(opt)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const Toggle = ({ checked, onChange, icon: Icon, label, tooltip, danger = false }: { checked: boolean, onChange: (v: boolean) => void, icon: any, label: string, tooltip: string, danger?: boolean }) => (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between gap-3 group cursor-pointer py-1 bg-zinc-950/30 rounded-lg px-2 border border-transparent hover:border-zinc-800 transition-all"
        >
            <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1 rounded-md shrink-0 transition-colors ${checked ? (danger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary') : 'bg-zinc-800/50 text-zinc-500 group-hover:text-zinc-300'}`}>
                    <Icon size={12} />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-tight truncate transition-colors ${checked ? (danger ? 'text-red-400' : 'text-zinc-200') : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                        {label}
                    </span>
                    <div className="shrink-0">
                        <Tooltip text={tooltip} />
                    </div>
                </div>
            </div>
            <div className={`w-6 h-3.5 shrink-0 rounded-full p-0.5 transition-all duration-300 ${checked ? (danger ? 'bg-red-600' : 'bg-primary') : 'bg-zinc-800'}`}>
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-300 ${checked ? (danger ? 'bg-white translate-x-2.5' : 'bg-[var(--text-on-primary)] translate-x-2.5') : 'bg-white translate-x-0'}`} />
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="glass p-3.5 rounded-2xl space-y-2 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-1.5 mb-1">
                    <Settings2 size={12} className="text-zinc-500" />
                    <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{t('sessionBehavior.title')}</h2>
                </div>

                <div className="flex flex-col gap-1">
                    <Toggle
                        checked={config.stayAwake || false}
                        onChange={(v) => handleChange('stayAwake', v)}
                        icon={Coffee}
                        label={t('sessionBehavior.stayAwake')}
                        tooltip={t('sessionBehavior.stayAwakeTooltip')}
                    />
                    {/* v4: Keep Active */}
                    <Toggle
                        checked={config.keepActive || false}
                        onChange={(v) => handleChange('keepActive', v)}
                        icon={ActivitySquare}
                        label={t('sessionBehavior.keepActive')}
                        tooltip={t('sessionBehavior.keepActiveTooltip')}
                    />
                    <Toggle
                        checked={config.turnOff || false}
                        onChange={(v) => handleChange('turnOff', v)}
                        icon={MonitorOff}
                        label={t('sessionBehavior.screenOff')}
                        tooltip={t('sessionBehavior.screenOffTooltip')}
                    />
                    <div>
                        <Toggle
                            checked={config.audioEnabled || false}
                            onChange={(v) => handleChange('audioEnabled', v)}
                            icon={Volume2}
                            label={t('sessionBehavior.forwardAudio')}
                            tooltip={t('sessionBehavior.forwardAudioTooltip')}
                        />
                        {config.audioEnabled && (
                            <AudioCodecPicker
                                value={(AUDIO_CODEC_VALUES.includes((config.audioCodec as AudioCodec)) ? config.audioCodec : 'auto') as AudioCodec}
                                onChange={(v) => handleChange('audioCodec', v)}
                                disabled={!config.audioEnabled}
                            />
                        )}
                    </div>
                    <Toggle
                        checked={config.alwaysOnTop || false}
                        onChange={(v) => handleChange('alwaysOnTop', v)}
                        icon={Layers}
                        label={t('sessionBehavior.alwaysOnTop')}
                        tooltip={t('sessionBehavior.alwaysOnTopTooltip')}
                    />
                    <Toggle
                        checked={config.fullscreen || false}
                        onChange={(v) => handleChange('fullscreen', v)}
                        icon={Maximize}
                        label={t('sessionBehavior.fullScreen')}
                        tooltip={t('sessionBehavior.fullScreenTooltip')}
                    />
                    <Toggle
                        checked={config.borderless || false}
                        onChange={(v) => handleChange('borderless', v)}
                        icon={Square}
                        label={t('sessionBehavior.borderless')}
                        tooltip={t('sessionBehavior.borderlessTooltip')}
                    />
                    <Toggle
                        checked={config.rememberWindowPosition !== false}
                        onChange={(v) => handleChange('rememberWindowPosition', v)}
                        icon={Move}
                        label={t('sessionBehavior.rememberWindowPosition')}
                        tooltip={t('sessionBehavior.rememberWindowPositionTooltip')}
                    />
                    <Toggle
                        checked={config.record || false}
                        onChange={(v) => handleChange('record', v)}
                        icon={Circle}
                        label={t('sessionBehavior.recordFeed')}
                        tooltip={t('sessionBehavior.recordFeedTooltip')}
                        danger={true}
                    />
                </div>

                <div className="pt-2 border-t border-zinc-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Folder size={12} className="text-zinc-500" />
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{t('sessionBehavior.recordPath')}</span>
                        </div>
                        <button
                            onClick={handlePickFolder}
                            className="text-[8px] font-black uppercase text-primary hover:text-white transition-colors"
                        >
                            {t('sessionBehavior.change')}
                        </button>
                    </div>
                    <div className="bg-black/40 border border-zinc-800/50 rounded-lg px-2.5 py-1.5">
                        <p className="text-[9px] text-zinc-500 font-mono truncate leading-none">
                            {config.recordPath || t('sessionBehavior.defaultVideosFolder')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
