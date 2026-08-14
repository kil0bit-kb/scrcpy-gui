import { useState, useEffect, useRef } from 'react';
import { Play, Square, Monitor, Camera, LayoutGrid, ChevronDown, Lock, Unlock, Settings2, Video, ExternalLink, Keyboard, Mouse } from 'lucide-react';
import { RenderDriverSupport, ScrcpyConfig } from '../../hooks/useScrcpy';
import Tooltip from '../Tooltip';
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
    renderDriverSupport = { hostOs: 'unknown', supportsRenderDriver: false, supportedDrivers: [] }
}: ControlPanelProps) {
    const { t } = useI18n();

    const handleChange = (field: keyof ScrcpyConfig, value: any) => {
        setConfig({ ...config, [field]: value });
    };

    const rendererOptions = buildRendererOptions(renderDriverSupport, t('controlPanel.rendererAuto'));

    const CustomSelect = ({ value, onChange, options, label, className = "" }: { value: any, onChange: (val: any) => void, options: { value: any, label: string }[], label?: string, className?: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            if (isOpen) document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen]);

        const selectedOption = options.find(opt => opt.value === value) || { value, label: t('controlPanel.custom') };

        return (
            <div className={`relative ${className}`} ref={containerRef}>
                {label && <label className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter mb-1 block">{label}</label>}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-[11px] text-zinc-300 flex items-center justify-between hover:border-primary/60 hover:bg-black transition-all group"
                >
                    <span className="truncate">{selectedOption?.label}</span>
                    <ChevronDown size={14} className={`text-zinc-500 group-hover:text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl z-[100] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`px-2 py-1.5 text-[11px] cursor-pointer transition-colors ${opt.value === value ? 'bg-primary/20 text-primary font-bold' : 'text-zinc-400 hover:bg-primary hover:text-on-primary font-medium'}`}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // BitrateControl removed from here

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
                onChange={(val) => handleChange('fps', parseInt(val) === 0 ? undefined : parseInt(val))}
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
        <Tooltip text={t('controlPanel.vsyncTooltip')}>
            <div
                className="flex items-center justify-between gap-2 cursor-pointer group px-2 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-950/20 hover:border-primary/40 transition-colors"
                onClick={() => handleChange('vsync', config.vsync === false)}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${config.vsync !== false ? 'bg-primary border-primary' : 'border-zinc-700 group-hover:border-primary'}`}>
                        {config.vsync !== false && <div className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-zinc-300 tracking-wide group-hover:text-primary transition-colors">{t('controlPanel.vsync')}</span>
                </div>
                <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-600 group-hover:text-primary/70 transition-colors">{t('controlPanel.vsyncHint')}</span>
            </div>
        </Tooltip>
        </>
    );

    return (
        <main className="lg:col-span-6 space-y-4">
            <div className="glass p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{t('controlPanel.captureSource')}</label>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-950/50 p-1 rounded-xl border border-zinc-800">
                    <button
                        onClick={() => handleChange('sessionMode', 'mirror')}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all ${config.sessionMode === 'mirror' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-primary hover:bg-zinc-950 transition-all'}`}
                    >
                        <Monitor size={18} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider">{t('controlPanel.screen')}</span>
                    </button>
                    <button
                        onClick={() => handleChange('sessionMode', 'camera')}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all ${config.sessionMode === 'camera' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-primary hover:bg-zinc-950 transition-all'}`}
                    >
                        <Camera size={18} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider">{t('controlPanel.camera')}</span>
                    </button>
                    <button
                        onClick={() => handleChange('sessionMode', 'desktop')}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all ${config.sessionMode === 'desktop' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-primary hover:bg-zinc-950 transition-all'}`}
                    >
                        <LayoutGrid size={18} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider">{t('controlPanel.desktop')}</span>
                    </button>
                </div>
            </div>

            <div className="glass p-3.5 rounded-xl space-y-3 transition-all duration-300 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md relative z-20">
                <div className="flex justify-between items-center border-b border-zinc-800/60 pb-1.5 mb-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[11px] font-black uppercase text-zinc-400 tracking-widest">{t('controlPanel.engineConfiguration')}</h2>
                        <div className="flex gap-1.5">
                            {config.sessionMode === 'mirror' && (config.hidKeyboard || config.hidMouse) && config.otgPure && (
                                <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-500/80 border border-red-500/20">
                                    {t('controlPanel.otgOnly')}
                                </span>
                            )}
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${isRunning ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800/30 text-zinc-600 border-zinc-700/30'}`}>
                                {isRunning ? t('controlPanel.active') : t('controlPanel.ready')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5 relative z-30">
                    {/* Screen Config */}
                    {config.sessionMode === 'mirror' && (
                        <>
                            <div className="space-y-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/20">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Keyboard size={12} className="text-primary" />
                                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{t('controlPanel.inputEnhancements')}</span>
                                </div>
                                <p className="text-[8px] text-zinc-500 leading-relaxed mb-1">
                                    {t('controlPanel.inputEnhancementsDescription')}
                                </p>

                                <div className="grid grid-cols-1 gap-3">
                                    {/* HID Keyboard */}
                                    <Tooltip text={t('controlPanel.hidKeyboardTooltip')}>
                                        <div className="flex items-start gap-3 cursor-pointer group" onClick={() => handleChange('hidKeyboard', !config.hidKeyboard)}>
                                            <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${config.hidKeyboard ? 'bg-primary border-primary' : 'border-zinc-700 group-hover:border-primary'}`}>
                                                {config.hidKeyboard && <div className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <Keyboard size={10} className={config.hidKeyboard ? 'text-primary' : 'text-zinc-500'} />
                                                    <span className="text-[10px] font-bold uppercase text-zinc-300 tracking-wide group-hover:text-primary">{t('controlPanel.hidKeyboard')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Tooltip>

                                    {/* HID Mouse */}
                                    <Tooltip text={t('controlPanel.hidMouseTooltip')}>
                                        <div className="flex items-start gap-3 cursor-pointer group" onClick={() => handleChange('hidMouse', !config.hidMouse)}>
                                            <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${config.hidMouse ? 'bg-primary border-primary' : 'border-zinc-700 group-hover:border-primary'}`}>
                                                {config.hidMouse && <div className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <Mouse size={10} className={config.hidMouse ? 'text-primary' : 'text-zinc-500'} />
                                                    <span className="text-[10px] font-bold uppercase text-zinc-300 tracking-wide group-hover:text-primary">{t('controlPanel.hidMouse')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Tooltip>

                                    {/* Advanced: Pure HID (Old OTG Pure) */}
                                    {(config.hidKeyboard || config.hidMouse) && (
                                        <Tooltip text={t('controlPanel.pureHidTooltip')}>
                                            <div className="flex items-start gap-3 ml-0.5 cursor-pointer group animate-in slide-in-from-top-1 duration-200" onClick={() => handleChange('otgPure', !config.otgPure)}>
                                                <div className={`mt-0.5 w-3 h-3 rounded border flex items-center justify-center transition-colors ${config.otgPure ? 'bg-red-500 border-red-500' : 'border-zinc-700 group-hover:border-red-500'}`}>
                                                    {config.otgPure && <div className="w-1 h-1 bg-white rounded-[1px]" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${config.otgPure ? 'text-red-400' : 'text-zinc-500 group-hover:text-red-400'}`}>{t('controlPanel.pureHid')}</span>
                                                </div>
                                            </div>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>

                            <div className={`space-y-2.5 pt-0.5 transition-all duration-300 ${config.otgPure ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                                <PerformanceGrid />
                                <BitrateControl label={t('controlPanel.bitrate')} value={config.bitrate || 8} onChange={(v) => handleChange('bitrate', v)} />
                            </div>
                        </>
                    )}

                    {/* Camera Config */}
                    {config.sessionMode === 'camera' && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {/* Webcam Pro Tip */}
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3 group/tip hover:bg-primary/10 transition-all">
                                <div className="mt-1">
                                    <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                                        <Video size={14} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">{t('controlPanel.webcamProTip')}</h4>
                                        <a
                                            href="https://obsproject.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] font-bold text-zinc-500 hover:text-primary flex items-center gap-1 transition-colors"
                                        >
                                            {t('controlPanel.getObs')} <ExternalLink size={10} />
                                        </a>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                                        {t('controlPanel.webcamProTipTextBefore')} <span className="text-zinc-200 font-bold">{t('controlPanel.webcamProTipObs')}</span> {t('controlPanel.webcamProTipAndStart')} <span className="text-zinc-200 font-bold">{t('controlPanel.webcamProTipVirtualCamera')}</span>{t('controlPanel.webcamProTipTextAfter')}
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
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                                <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Settings2 size={12} className="text-primary" />
                                        <h3 className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">{t('controlPanel.virtualDisplayEngine')}</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* v4: Flex Display toggle */}
                                        <Tooltip text={t('controlPanel.flexDisplayTooltip')}>
                                            <button
                                                onClick={() => handleChange('flexDisplay', !config.flexDisplay)}
                                                className={`flex items-center gap-1.5 transition-colors ${config.flexDisplay ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'}`}
                                                title={t('controlPanel.flexDisplay')}
                                            >
                                                <span className={`text-[8px] font-black uppercase tracking-tighter px-1 py-0.5 rounded border transition-colors ${config.flexDisplay ? 'bg-primary/10 border-primary/40 text-primary' : 'border-zinc-700 text-zinc-600'}`}>
                                                    {t('controlPanel.flexDisplay')}
                                                </span>
                                            </button>
                                        </Tooltip>
                                        <button
                                            onClick={() => handleChange('aspectRatioLock', !config.aspectRatioLock)}
                                            className={`flex items-center gap-1.5 transition-colors ${config.aspectRatioLock ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'}`}
                                            title={t('controlPanel.ratioLockTitle')}
                                        >
                                            {config.aspectRatioLock ? <Lock size={10} /> : <Unlock size={10} />}
                                            <span className="text-[8px] font-black uppercase tracking-tighter">{t('controlPanel.ratioLock')}</span>
                                        </button>
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
                                            return "custom";
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
                        className="w-full py-3.5 rounded-2xl text-base font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group active:scale-[0.98]"
                    >
                        {/* Pulse Glow Layer */}
                        <div className="absolute inset-0 bg-primary opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-primary animate-ping opacity-20 group-hover:opacity-40 pointer-events-none" />

                        <span className="relative z-10 flex items-center justify-center gap-3 text-on-primary">
                            <Play fill="currentColor" size={18} className="group-hover:scale-110 transition-transform" />
                            {config.sessionMode === 'mirror'
                                ? ((config.hidKeyboard || config.hidMouse) && config.otgPure ? t('controlPanel.initializeOtg') : t('controlPanel.startMission'))
                                : config.sessionMode === 'camera' ? t('controlPanel.engageCamera') : t('controlPanel.ejectToDesktop')}
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={onStop}
                        className="w-full py-3.5 rounded-2xl text-base font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group active:scale-[0.98] border border-red-500/50"
                    >
                        {/* Dark Red Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-900 group-hover:from-red-500 group-hover:to-red-800 transition-all" />

                        <span className="relative z-10 flex items-center justify-center gap-3 text-white">
                            <Square fill="white" size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                            {t('controlPanel.stopSession')}
                        </span>
                    </button>
                )}
            </div>
        </main>
    );
}
