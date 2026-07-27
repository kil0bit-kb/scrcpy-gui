import { Language, Coffee, Favorite } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { Github, Youtube } from 'lucide-react';
import { useI18n } from '../i18n';

export default function AboutPanel({ version }: { version: string }) {
    const { t } = useI18n();

    return (
        <div className="glass p-3 rounded-2xl space-y-2.5 bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md border border-[var(--md-sys-color-surface-container-highest)]">
            {/* Quick Links */}
            <div className="grid grid-cols-4 gap-1.5">
                <a
                    href="https://github.com/kil0bit-kb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-(--md-sys-color-surface-container) hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all group cursor-pointer select-none"
                    title="GitHub"
                >
                    <Github size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-base)] transition-colors" />
                    <span className="text-[8px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-base)] select-none">{t('footer.github')}</span>
                </a>

                <a
                    href="https://www.youtube.com/@kilObit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-(--md-sys-color-surface-container) hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all group cursor-pointer select-none"
                    title="YouTube"
                >
                    <Youtube size={16} className="text-[var(--text-muted)] group-hover:text-red-500 transition-colors" />
                    <span className="text-[8px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-base)] select-none">{t('footer.youtube')}</span>
                </a>

                <a
                    href="https://kil0bit.blogspot.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-(--md-sys-color-surface-container) hover:bg-(--md-sys-color-surface-container-highest) transition-all group cursor-pointer select-none"
                    title="Website"
                >
                    <Language size={16} className="text-(--text-muted) group-hover:text-primary transition-colors" />
                    <span className="text-[8px] font-bold text-(--text-muted) group-hover:text-(--text-base) select-none">{t('footer.website')}</span>
                </a>

                <a
                    href="https://www.patreon.com/cw/KB_kilObit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-(--md-sys-color-surface-container) hover:bg-(--md-sys-color-surface-container-highest) transition-all group cursor-pointer select-none"
                    title="Support"
                >
                    <Coffee size={16} className="text-primary group-hover:text-primary/80 transition-colors" />
                    <span className="text-[8px] font-bold text-primary group-hover:text-primary/80 select-none">{t('footer.support')}</span>
                </a>
            </div>

            {/* Core Tech Attribution & Author */}
            <div className="pt-2 border-t border-(--md-sys-color-surface-container-highest) space-y-1.5">
                <div className="flex flex-wrap items-center justify-between text-[9px] text-(--text-subtle) font-medium gap-1 select-none">
                    <span>scrcpy engine • v{version}</span>
                    <span className="flex items-center gap-1 font-bold text-(--text-muted) select-none">
                        <Favorite size={10} className="text-red-500" /> {t('footer.byKb')}
                    </span>
                </div>
            </div>
        </div>
    );
}
