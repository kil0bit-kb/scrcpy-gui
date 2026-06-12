import { CheckCircle2, Download, Cpu, ArrowRight, X, ExternalLink, HelpCircle } from 'lucide-react';
import { useI18n } from '../i18n';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    binaryStatus: { found: boolean; message: string };
    onDownload: () => void;
    isDownloading: boolean;
    downloadProgress: number;
    onComplete: () => void;
}

export default function OnboardingModal({
    isOpen,
    onClose,
    binaryStatus,
    onDownload,
    isDownloading,
    downloadProgress,
    onComplete
}: OnboardingModalProps) {
    const { t } = useI18n();
    if (!isOpen) return null;

    const isReady = binaryStatus.found;

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500"></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <div className="absolute top-0 right-0 p-6 z-30">
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row h-full">
                    {/* Left Side: Branding/Logo */}
                    <div className="hidden md:flex md:w-1/3 bg-primary/10 border-r border-zinc-800 p-8 flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50 blur-3xl"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                                scrcpy <span className="text-primary not-italic">GUI</span>
                            </h2>
                            <p className="text-[10px] uppercase font-black tracking-widest text-primary mt-2">{t('onboarding.coreInitialization')}</p>
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-sm">
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                    {t('onboarding.introQuote')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Setup */}
                    <div className="flex-1 p-8 sm:p-12">
                        <div className="mb-10">
                            <h3 className="text-2xl font-black tracking-tight text-white mb-2 uppercase italic">{t('onboarding.setupCoreComponents')}</h3>
                            <p className="text-zinc-500 text-sm font-medium">{t('onboarding.setupCoreSubtitle')}</p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex gap-4 group">
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 ${isReady
                                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                        : 'bg-zinc-900 border-zinc-800'
                                        }`}>
                                        {isReady ? <CheckCircle2 size={20} className="text-emerald-400" /> : <Cpu size={20} className="text-zinc-500" />}
                                    </div>
                                </div>

                                <div className="flex-1 pt-1">
                                    <h4 className={`text-sm font-black uppercase tracking-widest ${isReady ? 'text-white' : 'text-zinc-400'}`}>
                                        {t('onboarding.binariesAndDrivers')}
                                    </h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed font-medium mb-4">
                                        {t('onboarding.binariesDescription')}
                                    </p>

                                    {!isReady && (
                                        <div className="space-y-4">
                                            <button
                                                onClick={onDownload}
                                                disabled={isDownloading}
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                {isDownloading ? (
                                                    <><RefreshCcw size={12} className="animate-spin" /> {t('onboarding.downloadingProgress', { progress: downloadProgress })}</>
                                                ) : (
                                                    <><Download size={14} /> {t('onboarding.downloadCoreBinaries')}</>
                                                )}
                                            </button>

                                            {isDownloading && (
                                                <div className="w-full max-w-sm">
                                                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                                        <div className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(139,92,246,0.5)]" style={{ width: `${downloadProgress}%` }} />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-6 border-t border-zinc-900">
                                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                    <HelpCircle size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('onboarding.manualSetupFallback')}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-600 mb-3 leading-loose">
                                                    {t('onboarding.manualSetupBefore')} <span className="text-zinc-400 font-bold">{t('onboarding.manualSetupAdministrator')}</span>{t('onboarding.manualSetupAfter')}
                                                </p>
                                                <a
                                                    href="https://github.com/Genymobile/scrcpy/releases/latest"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-primary hover:underline tracking-widest"
                                                >
                                                    {t('onboarding.githubReleases')} <ExternalLink size={10} />
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {isReady && (
                                        <div className="flex items-center gap-2 text-emerald-500 animate-in fade-in slide-in-from-left-2 duration-1000">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{t('onboarding.successBinariesActive')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-zinc-900 flex justify-end items-center">
                            <button
                                onClick={onComplete}
                                disabled={!isReady}
                                className={`group flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isReady
                                    ? 'bg-primary text-on-primary hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(139,92,246,0.2)]'
                                    : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                                    }`}
                            >
                                {t('onboarding.continueToApp')}
                                <ArrowRight size={16} className={`transition-transform duration-300 ${isReady ? 'group-hover:translate-x-1' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const RefreshCcw = ({ size, className }: { size: number, className: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
    </svg>
);
