import { open } from '@tauri-apps/plugin-dialog';
import { 
  Coffee, 
  DesktopAccessDisabled, 
  VolumeUp, 
  Layers, 
  Fullscreen, 
  CropSquare, 
  RadioButtonUnchecked, 
  Folder,
  FolderOpen
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { RefreshCcw, Zap, SlidersHorizontal } from 'lucide-react';
import { ScrcpyConfig } from '../hooks/useScrcpy';
import Tooltip from './Tooltip';
import CustomDropdown from './CustomDropdown';
import { useI18n } from '../i18n';

function formatMiddleTruncatePath(path: string, maxLength: number = 28): string {
    if (!path || path.length <= maxLength) return path;
    const startLen = Math.ceil((maxLength - 3) / 2);
    const endLen = Math.floor((maxLength - 3) / 2);
    return `${path.slice(0, startLen)}...${path.slice(-endLen)}`;
}

type AudioCodec = 'auto' | 'opus' | 'aac' | 'flac' | 'raw';
const AUDIO_CODEC_VALUES: AudioCodec[] = ['auto', 'opus', 'aac', 'flac', 'raw'];

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
        const codecOptions = AUDIO_CODEC_VALUES.map((opt) => ({
            value: opt,
            label: opt === 'auto' ? t('sessionBehavior.audioCodecAuto') :
                   opt === 'opus' ? t('sessionBehavior.audioCodecOpus') :
                   opt === 'aac' ? t('sessionBehavior.audioCodecAac') :
                   opt === 'flac' ? t('sessionBehavior.audioCodecFlac') :
                   t('sessionBehavior.audioCodecRaw')
        }));

        return (
            <div className={`my-1 pl-7 pr-2.5 py-1.5 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold text-[var(--text-base)] truncate">{t('sessionBehavior.audioCodec')}</span>
                        <Tooltip text={t('sessionBehavior.audioCodecTooltip')} />
                    </div>
                    <CustomDropdown
                        value={value}
                        onChange={(val) => onChange(val as AudioCodec)}
                        options={codecOptions}
                        compact={true}
                        disabled={disabled}
                        className="w-28 max-w-full"
                    />
                </div>
            </div>
        );
    };

    const Toggle = ({ checked, onChange, icon: Icon, label, tooltip, danger = false }: { checked: boolean, onChange: (v: boolean) => void, icon: any, label: string, tooltip: string, danger?: boolean }) => (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between gap-3 group cursor-pointer py-1.5 px-2.5 bg-(--md-sys-color-surface-container) rounded-xl hover:bg-(--md-sys-color-surface-container-high) transition-all duration-75 ease-out"
        >
            <div className="flex items-center gap-2 min-w-0">
                <Icon size={14} className={`shrink-0 ${checked ? (danger ? 'text-red-400' : 'text-primary') : 'text-(--text-muted) group-hover:text-(--text-base)'}`} />
                <span className="text-[10px] font-bold text-(--text-base) truncate">{label}</span>
                <Tooltip text={tooltip} />
            </div>
            <div className={`w-8 h-4.5 rounded-full transition-colors duration-150 relative shrink-0 ui-switch-track ${checked ? (danger ? 'bg-red-500 is-danger' : 'bg-primary is-active') : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}>
                <div className={`ui-switch-thumb ${checked ? 'bg-on-primary translate-x-3.5 shadow-sm' : 'bg-(--text-muted) translate-x-0'}`} />
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="glass p-3.5 rounded-2xl space-y-2 bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md border border-[var(--md-sys-color-surface-container-highest)]">
                <div className="flex items-center gap-2 border-b border-[var(--md-sys-color-surface-container-highest)] pb-1.5 mb-1">
                    <SlidersHorizontal size={18} className="text-primary shrink-0" />
                    <h2 className="text-card-title">{t('sessionBehavior.title')}</h2>
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
                        icon={Zap}
                        label={t('sessionBehavior.keepActive')}
                        tooltip={t('sessionBehavior.keepActiveTooltip')}
                    />
                    <Toggle
                        checked={config.turnOff || false}
                        onChange={(v) => handleChange('turnOff', v)}
                        icon={DesktopAccessDisabled}
                        label={t('sessionBehavior.screenOff')}
                        tooltip={t('sessionBehavior.screenOffTooltip')}
                    />
                    <div>
                        <Toggle
                            checked={config.audioEnabled || false}
                            onChange={(v) => handleChange('audioEnabled', v)}
                            icon={VolumeUp}
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
                        icon={Fullscreen}
                        label={t('sessionBehavior.fullScreen')}
                        tooltip={t('sessionBehavior.fullScreenTooltip')}
                    />
                    <Toggle
                        checked={config.borderless || false}
                        onChange={(v) => handleChange('borderless', v)}
                        icon={CropSquare}
                        label={t('sessionBehavior.borderless')}
                        tooltip={t('sessionBehavior.borderlessTooltip')}
                    />
                    <Toggle
                        checked={config.record || false}
                        onChange={(v) => handleChange('record', v)}
                        icon={RadioButtonUnchecked}
                        label={t('sessionBehavior.recordFeed')}
                        tooltip={t('sessionBehavior.recordFeedTooltip')}
                        danger={true}
                    />
                </div>

                <div className="pt-2 border-t border-[var(--md-sys-color-surface-container-highest)] space-y-1.5 font-sans">
                    <div className="flex items-center justify-between mb-0.5 px-0.5">
                        <div className="flex items-center gap-1.5">
                            <Folder size={14} className="text-primary shrink-0" />
                            <span className="text-[10px] font-bold text-[var(--text-base)] uppercase tracking-tight">{t('sessionBehavior.recordPath')}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 bg-[var(--md-sys-color-surface-container-highest)] p-1 rounded-2xl">
                        <button
                            type="button"
                            onClick={handlePickFolder}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[10px] font-bold text-[var(--text-base)] hover:bg-(--md-sys-color-surface-container) transition-all cursor-pointer overflow-hidden min-w-0"
                            title={config.recordPath || t('sessionBehavior.defaultVideosFolder')}
                        >
                            <FolderOpen size={14} className="text-primary shrink-0" />
                            <span className="truncate text-center w-full font-sans text-[10px]">
                                {formatMiddleTruncatePath(config.recordPath || t('sessionBehavior.defaultVideosFolder'))}
                            </span>
                        </button>
                        {config.recordPath && (
                            <Tooltip text="Reset Record Path">
                                <button
                                    type="button"
                                    onClick={() => handleChange('recordPath', '')}
                                    className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-white bg-(--md-sys-color-surface-container) hover:bg-red-600 border border-transparent hover:border-red-500 transition-all cursor-pointer shrink-0 shadow-sm flex items-center justify-center group/reset"
                                >
                                    <RefreshCcw size={14} className="group-hover/reset:rotate-180 transition-transform duration-300" />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
