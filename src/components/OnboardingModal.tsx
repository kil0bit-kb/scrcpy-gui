import { CheckCircle2, Download, Cpu, HelpCircle, Loader2, ExternalLink, ArrowRight } from 'lucide-react';
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
    onClose: _onClose,
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden font-sans">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-300"></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 font-sans">
                <div className="flex flex-col md:flex-row h-full font-sans">
                    {/* Left Side: Branding/Logo */}
                    <div className="hidden md:flex md:w-1/3 bg-primary/10 border-r border-zinc-800 p-8 flex-col justify-between relative overflow-hidden font-sans">
                        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50 blur-3xl"></div>

                        <div className="relative z-10">
                            <h2 className="text-display-brand text-white inline-flex items-baseline gap-1.5 select-none">
                                <span>SCRCPY</span>
                                <span className="text-primary">GUI</span>
                            </h2>
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-sm">
                                <p className="text-xs text-zinc-300 leading-normal font-medium">
                                    {t('onboarding.introQuote')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Setup */}
                    <div className="flex-1 p-8 sm:p-12 font-sans">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white mb-1.5 select-none">{t('onboarding.setupCoreComponents')}</h3>
                            <p className="text-zinc-400 text-xs font-medium leading-normal">{t('onboarding.setupCoreSubtitle')}</p>
                        </div>

                        <div className="space-y-6">
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
                                    <h4 className={`text-sm font-bold select-none ${isReady ? 'text-white' : 'text-zinc-300'}`}>
                                        {t('onboarding.binariesAndDrivers')}
                                    </h4>
                                    <p className="text-xs text-zinc-400 leading-normal font-medium mb-4">
                                        {t('onboarding.binariesDescription')}
                                    </p>

                                    {!isReady && (
                                        <div className="space-y-4">
                                            <button
                                                onClick={onDownload}
                                                disabled={isDownloading}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold transition-all hover:bg-primary/90 cursor-pointer shadow-md disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                {isDownloading ? (
                                                    <><Loader2 size={14} className="animate-spin" /> {t('onboarding.downloadingProgress', { progress: downloadProgress })}</>
                                                ) : (
                                                    <><Download size={14} /> {t('onboarding.downloadCoreBinaries')}</>
                                                )}
                                            </button>

                                            {isDownloading && (
                                                <div className="w-full max-w-sm space-y-2 pt-1">
                                                    <div className="flex items-center justify-between text-xs font-bold text-primary">
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 size={14} className="animate-spin text-primary" />
                                                            Downloading Engine...
                                                        </span>
                                                        <span>{downloadProgress}%</span>
                                                    </div>
                                                    <div className="h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-full overflow-hidden border border-white/10 p-0.5 relative">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_12px_var(--primary)]"
                                                            style={{ width: `${downloadProgress}%` }}
                                                        />
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
