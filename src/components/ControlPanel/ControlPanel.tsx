import { useState, useEffect } from 'react';
import { DesktopWindows, PhotoCamera, GridView, Keyboard, PlayArrow, Square, Tune, Videocam, FolderOpen } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { ExternalLink, Mouse, RefreshCcw, Download } from 'lucide-react';
import { RenderDriverSupport, ScrcpyConfig } from '../../hooks/useScrcpy';
import Tooltip from '../Tooltip';
import CustomDropdown from '../CustomDropdown';
import { buildRendererOptions, mapRendererSelection } from './rendererOptions';
import { useI18n } from '../../i18n';

interface ControlPanelProps {
    config: ScrcpyConfig;
    setConfig: (c: ScrcpyConfig) => void;
    onStart: () => void;
    onStop: () => void;
    isRunning: boolean;
    onListOptions: (arg: string) => void;
    detectedCameras?: { id: string, name: string }[];
    renderDriverSupport?: RenderDriverSupport;
    binaryStatus?: { found: boolean; message: string };
    onDownload?: () => void;
    onSetPath?: () => void;
    onResetPath?: () => void;
    isDownloading?: boolean;
    downloadProgress?: number;
}

const BitrateControl = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => {
    const [localValue, setLocalValue] = useState(value);

    // Sync from parent if parent changes externally (e.g. preset load)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center h-4">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</label>
                <span className="text-[10px] font-black text-primary tabular-nums">{localValue}M</span>
            </div>
            <input
                type="range"
                min="1"
                max="50"
                value={localValue}
                onChange={(e) => setLocalValue(parseInt(e.target.value))}
                onMouseUp={() => onChange(localValue)}
                onTouchEnd={() => onChange(localValue)}
                className="w-full h-1 accent-primary bg-zinc-800 rounded-full appearance-none cursor-pointer hover:bg-zinc-700 transition-colors"
            />
        </div>
    );
};

const VDSlider = ({ label, value, min, max, unit = "", onChange }: { label: string, value: number, min: number, max: number, unit?: string, onChange: (val: number) => void }) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center h-4">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</label>
                <span className="text-[10px] font-black text-primary tabular-nums">{localValue}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={localValue}
                onChange={(e) => setLocalValue(parseInt(e.target.value))}
                onMouseUp={() => onChange(localValue)}
                className="w-full h-1 accent-primary bg-zinc-800 rounded-full appearance-none cursor-pointer"
            />
        </div>
    );
};

export default function ControlPanel({
    config,
    setConfig,
    onStart,
    onStop,
    isRunning,
    onListOptions,
    detectedCameras = [],
    renderDriverSupport = { hostOs: 'unknown', supportsRenderDriver: false, supportedDrivers: [] },
    binaryStatus,
    onDownload,
    onSetPath,
    onResetPath,
    isDownloading = false,
    downloadProgress: _downloadProgress = 0
}: ControlPanelProps) {
    const { t } = useI18n();

    const handleChange = (field: keyof ScrcpyConfig, value: any) => {
        setConfig({ ...config, [field]: value });
    };

    const rendererOptions = buildRendererOptions(renderDriverSupport, t('controlPanel.rendererAuto'));

    const CustomSelect = CustomDropdown;

    const PerformanceGrid = ({ showResolution = true, showCodec = true }: { showResolution?: boolean, showCodec?: boolean }) => (
        <>
        <div className={`grid ${showResolution ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
            {showResolution && (
                <CustomSelect
                    label={t('controlPanel.resolution')}
                    value={config.res || "0"}
                    onChange={(val) => handleChange('res', val)}
                    options={[
                        { value: "0", label: t('controlPanel.resolutionOriginal') },
                        { value: "3840", label: "4K" },
                        { value: "2560", label: "2K" },
                        { value: "1920", label: "1080p" },
                        { value: "1600", label: "900p" },
                        { value: "1280", label: "720p" },
                        { value: "1024", label: "576p" },
                        { value: "800", label: "480p" },
                    ]}
                />
            )}
            {showCodec && (
                <CustomSelect
                    label={t('controlPanel.codec')}
                    value={config.codec || "h264"}
                    onChange={(val) => handleChange('codec', val)}
                    options={[
                        { value: "h264", label: "H.264" },
                        { value: "h265", label: "H.265" },
                        { value: "av1", label: "AV1" },
                    ]}
                />
            )}
            <CustomSelect
                label={t('controlPanel.fps')}
                value={config.fps === undefined || config.fps === null ? 0 : config.fps}
                onChange={(val) => handleChange('fps', Number(val) === 0 ? undefined : Number(val))}
                options={[
                    { value: 0, label: t('controlPanel.rendererAuto') || "Auto" },
                    { value: 30, label: "30" },
                    { value: 60, label: "60" },
                    { value: 90, label: "90" },
                    { value: 120, label: "120" },
                ]}
            />
            <CustomSelect
                label={t('controlPanel.rotation')}
                value={config.rotation || "0"}
                onChange={(val) => handleChange('rotation', val)}
                options={[
                    { value: "0", label: "0°" },
                    { value: "270", label: "-90°" },
                    { value: "90", label: "+90°" },
                    { value: "180", label: "180°" },
                ]}
            />
            <CustomSelect
                label={t('controlPanel.graphicsRenderer')}
                value={config.renderDriver || 'auto'}
                onChange={(val) => handleChange('renderDriver', mapRendererSelection(val))}
                options={rendererOptions}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
            <Tooltip text={t('controlPanel.vsyncTooltip')}>
                <div
                    onClick={() => handleChange('vsync', config.vsync === false)}
                    className="flex items-center justify-between gap-3 group cursor-pointer py-1.5 px-2.5 bg-[var(--md-sys-color-surface-container)] rounded-xl hover:bg-[var(--md-sys-color-surface-container-high)] transition-all duration-75 ease-out h-full"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-[var(--text-base)] truncate">{t('controlPanel.vsync')}</span>
                        <span className="text-[8px] font-black uppercase tracking-tighter text-[var(--text-subtle)]">{t('controlPanel.vsyncHint')}</span>
                    </div>
                    <div className={`w-8 h-4.5 rounded-full transition-colors duration-150 relative shrink-0 ui-switch-track ${config.vsync !== false ? 'bg-primary is-active' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}>
                        <div className={`ui-switch-thumb ${config.vsync !== false ? 'bg-on-primary translate-x-3.5 shadow-sm' : 'bg-[var(--text-muted)] translate-x-0'}`} />
                    </div>
                </div>
            </Tooltip>
            <BitrateControl label={t('controlPanel.bitrate')} value={config.bitrate || 8} onChange={(v) => handleChange('bitrate', v)} />
        </div>
        </>
    );

    return (
        <main className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                {/* 1. Capture Source Card (Left) */}
                <div className="sm:col-span-7 glass p-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md border border-[var(--md-sys-color-surface-container-highest)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <label className="text-card-title">{t('controlPanel.captureSource')}</label>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5 bg-[var(--md-sys-color-surface-container-highest)] p-1 rounded-2xl">
                        <button
                            onClick={() => handleChange('sessionMode', 'mirror')}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold transition-all duration-150 ease-out cursor-pointer ${
                                config.sessionMode === 'mirror'
                                    ? 'bg-primary text-on-primary font-black shadow-md rounded-2xl z-10 scale-[1.02]'
                                    : 'rounded-l-2xl rounded-r-xs text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-(--md-sys-color-surface-container)'
                            }`}
                        >
                            <DesktopWindows size={16} className="shrink-0" />
                            <span>{t('controlPanel.screen')}</span>
                        </button>

                        <button
                            onClick={() => handleChange('sessionMode', 'camera')}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold transition-all duration-150 ease-out cursor-pointer ${
                                config.sessionMode === 'camera'
                                    ? 'bg-primary text-on-primary font-black shadow-md rounded-2xl z-10 scale-[1.02]'
                                    : 'rounded-xs text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-(--md-sys-color-surface-container)'
                            }`}
                        >
                            <PhotoCamera size={16} className="shrink-0" />
                            <span>{t('controlPanel.camera')}</span>
                        </button>

                        <button
                            onClick={() => handleChange('sessionMode', 'desktop')}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold transition-all duration-150 ease-out cursor-pointer ${
                                config.sessionMode === 'desktop'
                                    ? 'bg-primary text-on-primary font-black shadow-md rounded-2xl z-10 scale-[1.02]'
                                    : 'rounded-r-2xl rounded-l-xs text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-(--md-sys-color-surface-container)'
                            }`}
                        >
                            <GridView size={16} className="shrink-0" />
                            <span>{t('controlPanel.desktop')}</span>
                        </button>
                    </div>
                </div>

                {/* 2. Custom Engine Path Card (Right) */}
                <div className="sm:col-span-5 glass p-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md border border-[var(--md-sys-color-surface-container-highest)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <label className="text-card-title">Engine Path</label>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 bg-[var(--md-sys-color-surface-container-highest)] p-1 rounded-2xl">
                        {onSetPath && (
                            <button
                                onClick={onSetPath}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[10px] font-bold text-[var(--text-base)] hover:bg-(--md-sys-color-surface-container) transition-all cursor-pointer"
                                title="Custom Scrcpy Core Folder"
                            >
                                <FolderOpen size={14} className="text-primary shrink-0" />
                                <span className="truncate">Select Folder</span>
                            </button>
                        )}
                        {onResetPath && (
                            <Tooltip text="Reset Core Path">
                                <button
                                    onClick={onResetPath}
                                    className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-white bg-(--md-sys-color-surface-container) hover:bg-red-600 border border-transparent hover:border-red-500 transition-all cursor-pointer shrink-0 shadow-sm flex items-center justify-center group/reset"
                                >
                                    <RefreshCcw size={14} className="group-hover/reset:rotate-180 transition-transform duration-300" />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass p-3.5 rounded-2xl space-y-3 transition-all duration-75 ease-out bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md relative z-20 border border-[var(--md-sys-color-surface-container-highest)]">
                <div className="flex justify-between items-center border-b border-[var(--md-sys-color-surface-container-highest)] pb-1.5 mb-1">
                    <div className="flex items-center gap-2.5">
                        <Tune size={18} className="text-primary shrink-0" />
                        <h2 className="text-card-title">{t('controlPanel.engineConfiguration')}</h2>
                    </div>

                    <div className="flex items-center gap-1">
                        {binaryStatus && !binaryStatus.found && !isDownloading && onDownload && (
                            <button
                                onClick={onDownload}
                                className="px-2 py-0.5 bg-emerald-500 text-black border border-emerald-400 rounded-md text-[8px] font-black hover:bg-emerald-400 transition-all uppercase tracking-tighter shadow-sm cursor-pointer flex items-center gap-1"
                            >
                                <Download size={10} /> {t('header.installCore')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2.5 relative z-30">
                    {/* Screen Config */}
                    {config.sessionMode === 'mirror' && (
                        <div key="mirror" className="space-y-2.5 animate-in fade-in zoom-in-98 duration-300 ease-out">
                            <div className="space-y-3 p-3 rounded-2xl bg-(--md-sys-color-surface-container) text-[var(--text-base)]">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Keyboard size={14} className="text-primary shrink-0" />
                                    <span className="text-sm font-black text-[var(--text-base)]">{t('controlPanel.inputEnhancements')}</span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-1 font-medium">
                                    {t('controlPanel.inputEnhancementsDescription')}
                                </p>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {/* HID Keyboard */}
                                    <div
                                        onClick={() => handleChange('hidKeyboard', !config.hidKeyboard)}
                                        className="flex items-center justify-between gap-3 group cursor-pointer py-1.5 px-3 bg-[var(--md-sys-color-surface-container-high)] rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all duration-75 ease-out"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Keyboard size={14} className={`shrink-0 ${config.hidKeyboard ? 'text-primary' : 'text-[var(--text-muted)] group-hover:text-[var(--text-base)]'}`} />
                                            <span className="text-[10px] font-bold text-[var(--text-base)] truncate">{t('controlPanel.hidKeyboard')}</span>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Tooltip text={t('controlPanel.hidKeyboardTooltip')} />
                                            </div>
                                        </div>
                                        <div className={`w-8 h-4.5 rounded-full transition-colors duration-150 relative shrink-0 ui-switch-track ${config.hidKeyboard ? 'bg-primary is-active' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}>
                                            <div className={`ui-switch-thumb ${config.hidKeyboard ? 'bg-on-primary translate-x-3.5 shadow-sm' : 'bg-[var(--text-muted)] translate-x-0'}`} />
                                        </div>
                                    </div>

                                    {/* HID Mouse */}
                                    <div
                                        onClick={() => handleChange('hidMouse', !config.hidMouse)}
                                        className="flex items-center justify-between gap-3 group cursor-pointer py-1.5 px-3 bg-[var(--md-sys-color-surface-container-high)] rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all duration-75 ease-out"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Mouse size={14} className={`shrink-0 ${config.hidMouse ? 'text-primary' : 'text-[var(--text-muted)] group-hover:text-[var(--text-base)]'}`} />
                                            <span className="text-[10px] font-bold text-[var(--text-base)] truncate">{t('controlPanel.hidMouse')}</span>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Tooltip text={t('controlPanel.hidMouseTooltip')} />
                                            </div>
                                        </div>
                                        <div className={`w-8 h-4.5 rounded-full transition-colors duration-150 relative shrink-0 ui-switch-track ${config.hidMouse ? 'bg-primary is-active' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}>
                                            <div className={`ui-switch-thumb ${config.hidMouse ? 'bg-on-primary translate-x-3.5 shadow-sm' : 'bg-[var(--text-muted)] translate-x-0'}`} />
                                        </div>
                                    </div>

                                    {/* Advanced: Pure HID (Old OTG Pure) */}
                                    {(config.hidKeyboard || config.hidMouse) && (
                                        <div
                                            onClick={() => handleChange('otgPure', !config.otgPure)}
                                            className="flex items-center justify-between gap-3 group cursor-pointer py-1.5 px-3 bg-[var(--md-sys-color-surface-container-high)] rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all duration-75 ease-out animate-in slide-in-from-top-1 duration-200"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`text-[10px] font-bold truncate ${config.otgPure ? 'text-red-400 font-black' : 'text-[var(--text-base)]'}`}>{t('controlPanel.pureHid')}</span>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip text={t('controlPanel.pureHidTooltip')} />
                                                </div>
                                            </div>
                                            <div className={`w-8 h-4.5 rounded-full transition-colors duration-150 relative shrink-0 ui-switch-track ${config.otgPure ? 'bg-red-500 is-danger' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}>
                                                <div className={`ui-switch-thumb ${config.otgPure ? 'bg-white translate-x-3.5 shadow-sm' : 'bg-[var(--text-muted)] translate-x-0'}`} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`space-y-2.5 pt-0.5 transition-all duration-300 ${config.otgPure ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                                <PerformanceGrid />
                            </div>
                        </div>
                    )}

                    {/* Camera Config */}
                    {config.sessionMode === 'camera' && (
                        <div key="camera" className="space-y-3 animate-in fade-in zoom-in-98 duration-300 ease-out">
                            {/* Webcam Pro Tip */}
                            <div className="bg-[var(--md-sys-color-primary-container)] border border-primary/30 rounded-2xl p-3.5 flex items-start gap-3.5 group/tip hover:bg-primary/20 transition-all font-sans shadow-sm">
                                <div className="p-2.5 rounded-2xl bg-primary/20 text-primary shrink-0 flex items-center justify-center">
                                    <Videocam size={22} className="shrink-0" />
                                </div>
                                <div className="space-y-1 flex-1 font-sans">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase text-primary tracking-wide select-none">{t('controlPanel.webcamProTip')}</h4>
                                        <a
                                            href="https://obsproject.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-[var(--text-muted)] hover:text-primary flex items-center gap-1 transition-colors select-none"
                                        >
                                            {t('controlPanel.getObs')} <ExternalLink size={12} />
                                        </a>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                                        {t('controlPanel.webcamProTipTextBefore')} <span className="text-[var(--text-base)] font-bold">{t('controlPanel.webcamProTipObs')}</span> {t('controlPanel.webcamProTipAndStart')} <span className="text-[var(--text-base)] font-bold">{t('controlPanel.webcamProTipVirtualCamera')}</span>{t('controlPanel.webcamProTipTextAfter')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center h-4">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">{t('controlPanel.cameraDevice')}</label>
                                        <Tooltip text={t('controlPanel.cameraDeviceTooltip')} placement="top" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Tooltip text={t('controlPanel.refreshLensesTooltip')} placement="top" />
                                        <button
                                            onClick={() => onListOptions("--list-cameras")}
                                            className="text-[8px] font-black uppercase text-primary hover:text-white transition-colors"
                                        >
                                            {t('controlPanel.refreshLenses')}
                                        </button>
                                    </div>
                                </div>
                                <CustomSelect
                                    value={config.cameraId || ""}
                                    onChange={(val) => handleChange('cameraId', val)}
                                    options={[
                                        { value: "", label: t('controlPanel.autoSelect') },
                                        ...detectedCameras.map(cam => ({ value: cam.id, label: cam.name }))
                                    ]}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <CustomSelect
                                    label={t('controlPanel.codec')}
                                    value={config.codec || "h264"}
                                    onChange={(val) => handleChange('codec', val)}
                                    options={[
                                        { value: "h264", label: "H.264" },
                                        { value: "h265", label: "H.265" },
                                        { value: "av1", label: "AV1" },
                                    ]}
                                />
                                <CustomSelect
                                    label={t('controlPanel.aspect')}
                                    value={config.cameraAr || "0"}
                                    onChange={(val) => handleChange('cameraAr', val)}
                                    options={[
                                        { value: "0", label: t('controlPanel.aspectDefault') },
                                        { value: "16:9", label: "16:9" },
                                        { value: "4:3", label: "4:3" },
                                    ]}
                                />
                            </div>

                            {/* v4: Camera Torch + Camera Zoom */}
                            <div className="space-y-2 p-2.5 rounded-xl border border-zinc-800/60 bg-zinc-950/20">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">v4 Controls</span>
                                    <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">{t('controlPanel.badgeNew')}</span>
                                </div>
                                <Tooltip text={t('controlPanel.cameraTorchTooltip')}>
                                    <div className="flex items-center justify-between gap-2 cursor-pointer group" onClick={() => handleChange('cameraTorch', !config.cameraTorch)}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${config.cameraTorch ? 'bg-primary border-primary' : 'border-zinc-700 group-hover:border-primary'}`}>
                                                {config.cameraTorch && <div className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase text-zinc-300 tracking-wide group-hover:text-primary transition-colors">{t('controlPanel.cameraTorch')}</span>
                                        </div>
                                    </div>
                                </Tooltip>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center h-4">
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">{t('controlPanel.cameraZoom')}</label>
                                            <Tooltip text={t('controlPanel.cameraZoomTooltip')} placement="top" />
                                        </div>
                                        <span className="text-[10px] font-black text-primary tabular-nums">{(config.cameraZoom || 1.0).toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={10}
                                        max={50}
                                        value={Math.round((config.cameraZoom || 1.0) * 10)}
                                        onChange={(e) => handleChange('cameraZoom', parseInt(e.target.value) / 10)}
                                        className="w-full h-1 accent-primary bg-zinc-800 rounded-full appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className={`space-y-2.5 pt-0.5`}>
                                <PerformanceGrid showCodec={false} />
                                <BitrateControl label={t('controlPanel.bitrate')} value={config.bitrate || 8} onChange={(v) => handleChange('bitrate', v)} />
                            </div>
                        </div>
                    )}

                    {/* Desktop Config */}
                    {config.sessionMode === 'desktop' && (
                        <div key="desktop" className="space-y-3 animate-in fade-in zoom-in-98 duration-300 ease-out">
                            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                                <div className="flex items-center justify-between border-b border-[var(--md-sys-color-surface-container-highest)] pb-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <DesktopWindows size={18} className="text-primary shrink-0" />
                                        <h3 className="text-xs font-bold uppercase text-primary tracking-wide select-none">{t('controlPanel.virtualDisplayEngine')}</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Flex Display Toggle */}
                                        <div
                                            onClick={() => handleChange('flexDisplay', !config.flexDisplay)}
                                            className="flex items-center gap-1.5 group cursor-pointer py-1 px-2.5 bg-[var(--md-sys-color-surface-container-high)] rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all border border-[var(--md-sys-color-surface-container-highest)]"
                                        >
                                            <span className="text-[10px] font-bold text-[var(--text-base)] select-none">{t('controlPanel.flexDisplay')}</span>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Tooltip text={t('controlPanel.flexDisplayTooltip')} />
                                            </div>
                                            <div className={`w-8 h-4.5 rounded-full transition-colors duration-150 relative shrink-0 ui-switch-track ${config.flexDisplay ? 'bg-primary is-active' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}>
                                                <div className={`ui-switch-thumb ${config.flexDisplay ? 'bg-on-primary translate-x-3.5 shadow-sm' : 'bg-[var(--text-muted)] translate-x-0'}`} />
                                            </div>
                                        </div>

                                        {/* Ratio Lock Toggle */}
                                        <div
                                            onClick={() => handleChange('aspectRatioLock', !config.aspectRatioLock)}
                                            className="flex items-center gap-1.5 group cursor-pointer py-1 px-2.5 bg-[var(--md-sys-color-surface-container-high)] rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all border border-[var(--md-sys-color-surface-container-highest)]"
                                        >
                                            <span className="text-[10px] font-bold text-[var(--text-base)] select-none">{t('controlPanel.ratioLock')}</span>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Tooltip text={t('controlPanel.ratioLockTitle')} />
                                            </div>
                                            <div className={`w-8 h-4.5 rounded-full transition-colors duration-150 relative shrink-0 ui-switch-track ${config.aspectRatioLock ? 'bg-primary is-active' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}>
                                                <div className={`ui-switch-thumb ${config.aspectRatioLock ? 'bg-on-primary translate-x-3.5 shadow-sm' : 'bg-[var(--text-muted)] translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <VDSlider
                                        label={t('controlPanel.width')}
                                        value={config.vdWidth || 1920}
                                        min={480} max={3840}
                                        unit="px"
                                        onChange={(val: number) => {
                                            if (config.aspectRatioLock && config.vdWidth && config.vdHeight) {
                                                const ratio = config.vdHeight / config.vdWidth;
                                                setConfig({ ...config, vdWidth: val, vdHeight: Math.round(val * ratio) });
                                            } else {
                                                handleChange('vdWidth', val);
                                            }
                                        }}
                                    />
                                    <VDSlider
                                        label={t('controlPanel.height')}
                                        value={config.vdHeight || 1080}
                                        min={360} max={2160}
                                        unit="px"
                                        onChange={(val: number) => {
                                            if (config.aspectRatioLock && config.vdWidth && config.vdHeight) {
                                                const ratio = config.vdWidth / config.vdHeight;
                                                setConfig({ ...config, vdHeight: val, vdWidth: Math.round(val * ratio) });
                                            } else {
                                                handleChange('vdHeight', val);
                                            }
                                        }}
                                    />
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center h-4">
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('controlPanel.uiScaling')}</label>
                                                <Tooltip text={t('controlPanel.uiScalingTooltip')} placement="top" />
                                            </div>
                                            <span className="text-[10px] font-black text-primary tabular-nums">{config.vdDpi || 420} DPI</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={120}
                                            max={640}
                                            value={config.vdDpi || 420}
                                            onChange={(e) => handleChange('vdDpi', parseInt(e.target.value))}
                                            className="w-full h-1 accent-primary bg-zinc-800 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <CustomSelect
                                        label={t('controlPanel.quickPresets')}
                                        value={(() => {
                                            const w = config.vdWidth;
                                            const h = config.vdHeight;
                                            if (w === 1920 && h === 1080) return "1080p";
                                            if (w === 2560 && h === 1440) return "1440p";
                                            if (w === 3840 && h === 2160) return "4k";
                                            if (w === 2560 && h === 1080) return "ultrawide";
                                            return "Custom";
                                        })()}
                                        onChange={(val: string) => {
                                            if (val === '1080p') setConfig({ ...config, vdWidth: 1920, vdHeight: 1080 });
                                            if (val === '1440p') setConfig({ ...config, vdWidth: 2560, vdHeight: 1440 });
                                            if (val === '4k') setConfig({ ...config, vdWidth: 3840, vdHeight: 2160 });
                                            if (val === 'ultrawide') setConfig({ ...config, vdWidth: 2560, vdHeight: 1080 });
                                        }}
                                        options={[
                                            { value: "1080p", label: t('controlPanel.preset1080p') },
                                            { value: "1440p", label: t('controlPanel.preset1440p') },
                                            { value: "4k", label: t('controlPanel.preset4k') },
                                            { value: "ultrawide", label: t('controlPanel.presetUltrawide') },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5 pt-0.5">
                                <PerformanceGrid showResolution={false} />
                                <BitrateControl label={t('controlPanel.bitrate')} value={config.bitrate || 8} onChange={(v) => handleChange('bitrate', v)} />
                                {/* v4: Background Color for Desktop mode */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">{t('controlPanel.backgroundColor')}</label>
                                        <Tooltip text={t('controlPanel.backgroundColorTooltip')} placement="top" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-5 h-5 rounded border border-zinc-700 shrink-0 transition-colors"
                                            style={{ backgroundColor: config.backgroundColor || '#222222' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="#1a1a1a"
                                            value={config.backgroundColor || ''}
                                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-[11px] text-zinc-300 focus:border-primary/60 focus:outline-none transition-colors font-mono"
                                        />
                                        {config.backgroundColor && (
                                            <button onClick={() => handleChange('backgroundColor', '')} className="text-[8px] font-black text-zinc-600 hover:text-red-400 uppercase transition-colors">
                                                {t('controlPanel.backgroundColorNone')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2 relative z-10">
                {!isRunning ? (
                    <button
                        onClick={onStart}
                        className="w-full py-3.5 rounded-full active:rounded-2xl text-sm font-black transition-[border-radius,opacity] duration-200 cubic-bezier(0.16,1,0.3,1) relative overflow-hidden group cursor-pointer shadow-md select-none"
                    >
                        {/* Pulse Glow Layer */}
                        <div className="absolute inset-0 bg-primary opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-primary animate-ping opacity-20 group-hover:opacity-40 pointer-events-none" />

                        <span className="relative z-10 flex items-center justify-center gap-2.5 text-on-primary">
                            <PlayArrow size={22} className="shrink-0" />
                            {config.sessionMode === 'mirror'
                                ? ((config.hidKeyboard || config.hidMouse) && config.otgPure ? t('controlPanel.initializeOtg') : t('controlPanel.startMission'))
                                : config.sessionMode === 'camera' ? t('controlPanel.engageCamera') : t('controlPanel.ejectToDesktop')}
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={onStop}
                        className="w-full py-3.5 rounded-full active:rounded-2xl text-sm font-black transition-[border-radius,opacity] duration-200 cubic-bezier(0.16,1,0.3,1) relative overflow-hidden group cursor-pointer shadow-md select-none"
                    >
                        {/* Dark Red Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 group-hover:from-red-500 group-hover:to-red-700 transition-all" />

                        <span className="relative z-10 flex items-center justify-center gap-2.5 text-white">
                            <Square size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                            {t('controlPanel.stopSession')}
                        </span>
                    </button>
                )}
            </div>
        </main>
    );
}
