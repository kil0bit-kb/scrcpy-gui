import React, { ErrorInfo, ReactNode } from "react";
import { AlertCircle, Download, RefreshCcw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { I18nContext } from "../i18n";
import { en } from "../i18n/locales/en";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    static contextType = I18nContext;
    declare context: React.ContextType<typeof I18nContext>;

    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private translate = (key: string, vars?: Record<string, string | number | boolean>): string => {
        if (this.context && typeof this.context.t === 'function') {
            return this.context.t(key, vars);
        }
        // Manual fallback to English when context is unavailable.
        const segments = key.split('.');
        let cursor: unknown = en;
        for (const segment of segments) {
            if (cursor && typeof cursor === 'object' && segment in (cursor as Record<string, unknown>)) {
                cursor = (cursor as Record<string, unknown>)[segment];
            } else {
                return key;
            }
        }
        if (typeof cursor !== 'string') return key;
        if (!vars) return cursor;
        return cursor.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
    };

    private handleExportDiagnostics = async () => {
        const storageData: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) storageData[key] = localStorage.getItem(key) || "";
        }

        const diagnostics = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            localStorage: storageData,
            error: this.state.error?.message || "Unknown error",
            stack: this.state.error?.stack || "No stack trace available",
        };

        try {
            const fileName = `scrcpy-gui-diagnostics-${Date.now()}.json`;
            await invoke('save_report', {
                content: JSON.stringify(diagnostics, null, 2),
                name: fileName
            });
            alert(this.translate('errorBoundary.diagnosticSavedAlert', { fileName }));
        } catch (e) {
            console.error("Export failed:", e);
        }
    };

    public render() {
        if (this.state.hasError) {
            const t = this.translate;
            return (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-150">
                    {/* Mild black backdrop without blur */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Popup Card */}
                    <div className="relative w-full max-w-sm bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] border border-[var(--md-sys-color-surface-container-highest)] rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 font-sans animate-in zoom-in-95 duration-150">
                        <div className="flex flex-col items-start text-left space-y-3 font-sans">
                            {/* Top Left Icon (No BG) */}
                            <div className="text-red-500 shrink-0">
                                <AlertCircle size={28} />
                            </div>

                            {/* Title & Subtitle */}
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-[var(--text-base)] select-none">
                                    {t('errorBoundary.title')}
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                                    {t('errorBoundary.subtitle')}
                                </p>
                            </div>

                            {/* Error Signature Code Block */}
                            <div className="w-full bg-[#1c1c1c] border border-[var(--md-sys-color-surface-container-highest)] rounded-2xl p-3 text-left overflow-hidden font-shell-console shadow-inner">
                                <p className="text-[10px] font-shell-console text-[var(--text-subtle)] uppercase mb-1 select-none">{t('errorBoundary.errorSignature')}</p>
                                <p className="text-xs font-shell-console text-red-400 break-all leading-relaxed font-medium">
                                    {this.state.error?.message || t('errorBoundary.criticalSystemFailure')}
                                </p>
                            </div>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="mt-5 flex gap-2.5 font-sans select-none">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-2.5 px-4 bg-(--md-sys-color-surface-container) hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--text-base)] rounded-xl text-xs font-bold transition-colors cursor-pointer border border-transparent select-none flex items-center justify-center gap-1.5"
                            >
                                <RefreshCcw size={14} className="shrink-0" />
                                {t('errorBoundary.reboot')}
                            </button>
                            <button
                                onClick={this.handleExportDiagnostics}
                                className="flex-1 py-2.5 px-4 bg-primary text-on-primary rounded-xl text-xs font-bold transition-all hover:opacity-95 cursor-pointer shadow-md border border-transparent select-none flex items-center justify-center gap-1.5"
                            >
                                <Download size={14} className="shrink-0" />
                                {t('errorBoundary.exportLogs')}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
