import { Language, Coffee, Favorite } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { Github, Youtube } from 'lucide-react';
import { useI18n } from '../i18n';

export default function Footer({ version }: { version: string }) {
    const { t } = useI18n();
    return (
        <footer className="w-full p-6 mt-4 glass border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col items-center justify-center space-y-4">
            <h3 className="text-xs font-black text-[var(--text-muted)]">{t('footer.aboutScrcpyGui')}</h3>

            <div className="flex gap-8">
                <a href="https://github.com/kil0bit-kb" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Github size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-base)] transition-colors" />
                    <span className="text-[9px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-base)]">{t('footer.github')}</span>
                </a>
                <a href="https://www.youtube.com/@kilObit" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Youtube size={18} className="text-[var(--text-muted)] group-hover:text-red-500 transition-colors" />
                    <span className="text-[9px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-base)]">{t('footer.youtube')}</span>
                </a>
                <a href="https://kil0bit.blogspot.com/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Language size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-base)] transition-colors" />
                    <span className="text-[9px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-base)]">{t('footer.website')}</span>
                </a>
                <a href="https://www.patreon.com/cw/KB_kilObit" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Coffee size={18} className="text-primary group-hover:text-primary/80 transition-colors animate-pulse" />
                    <span className="text-[9px] font-bold text-primary group-hover:text-primary/80">{t('footer.support')}</span>
                </a>
            </div>

            {/* Tech Attributions */}
            <div className="pt-2 flex flex-wrap justify-center gap-x-5 gap-y-1.5 opacity-40 hover:opacity-100 transition-opacity divide-x divide-zinc-800">
                <div className="flex items-center gap-1.5 pl-5 first:pl-0">
                    <span className="text-[8px] font-black text-zinc-500">{t('footer.core')}</span>
                    <a href="https://github.com/Genymobile/scrcpy" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">scrcpy</a>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                    <span className="text-[8px] font-black text-zinc-500">{t('footer.client')}</span>
                    <a href="https://tauri.app/" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">Tauri</a>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                    <span className="text-[8px] font-black text-zinc-500">{t('footer.ui')}</span>
                    <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">React</a>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                    <span className="text-[8px] font-black text-zinc-500">{t('footer.assets')}</span>
                    <a href="https://github.com/nine-thirty-five/material-symbols-react" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">Material Symbols React</a>
                </div>
            </div>

            <div className="text-[10px] text-[var(--text-subtle)] flex items-center gap-1 mt-2">
                {t('footer.appVersion', { version })} <Favorite size={12} className="text-red-500" /> {t('footer.byKb')}
            </div>
        </footer>
    );
}
