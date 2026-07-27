import { Fullscreen, Home, ArrowBack, ViewList, PowerSettingsNew, ScreenRotationUp, ContentPaste, DesktopAccessDisabled, Keyboard } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { useI18n } from '../i18n';

export default function ShortcutsPanel() {
    const { t } = useI18n();
    const shortcuts = [
        { label: t('shortcuts.full'), key: "F", Icon: Fullscreen },
        { label: t('shortcuts.home'), key: "H", Icon: Home },
        { label: t('shortcuts.back'), key: "B", Icon: ArrowBack },
        { label: t('shortcuts.recents'), key: "S", Icon: ViewList },
        { label: t('shortcuts.power'), key: "P", Icon: PowerSettingsNew },
        { label: t('shortcuts.rotate'), key: "R", Icon: ScreenRotationUp },
        { label: t('shortcuts.paste'), key: "V", Icon: ContentPaste },
        { label: t('shortcuts.off'), key: "O", Icon: DesktopAccessDisabled },
    ];

    return (
        <div className="glass p-3.5 rounded-2xl space-y-2 bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md border border-[var(--md-sys-color-surface-container-highest)]">
            <div className="flex items-center gap-2 border-b border-[var(--md-sys-color-surface-container-highest)] pb-1.5 mb-1">
                <Keyboard size={18} className="text-primary shrink-0" />
                <h2 className="text-card-title">{t('shortcuts.title')}</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {shortcuts.map(s => (
                    <div key={s.key} className="group relative flex flex-col items-center justify-center bg-(--md-sys-color-surface-container) p-1.5 rounded-xl hover:bg-[var(--md-sys-color-surface-container-high)] transition-all duration-75 ease-out cursor-help">
                        {/* Tooltip on Hover */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--text-base)] text-[9px] font-bold px-2 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                            {s.label}
                        </div>

                        <s.Icon size={16} className="text-[var(--text-muted)] group-hover:text-primary transition-colors mb-1" />
                        <kbd className="min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-black bg-[var(--md-sys-color-surface-container-highest)] text-[var(--text-base)] group-hover:bg-primary group-hover:text-on-primary px-1 rounded-lg transition-all duration-75 ease-out">
                            {s.key}
                        </kbd>
                    </div>
                ))}
            </div>
        </div>
    );
}
