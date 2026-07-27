import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
    text: string;
    children?: React.ReactNode;
    placement?: 'top' | 'bottom';
}

export default function Tooltip({ text, children }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: rect.top - 10,
            left: rect.left + rect.width / 2,
        });
    };

    const handleMouseEnter = () => {
        updatePosition();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    useEffect(() => {
        if (!isVisible) return;
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex items-center shrink-0"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
        >
            {children || (
                <span className="text-[10px] font-bold text-primary/70 hover:text-primary transition-colors cursor-help px-0.5 select-none inline-flex items-center">
                    <HelpCircle size={12} className="shrink-0" />
                </span>
            )}

            {isVisible && coords && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                    className="w-max max-w-[220px] min-w-[120px] p-2.5 bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] rounded-xl shadow-lg shadow-black/40 z-[99999] text-center pointer-events-none animate-tooltip-pop"
                >
                    <p className="text-[10px] text-[var(--text-base)] leading-relaxed font-bold select-none text-center break-words">{text}</p>
                    {/* Downward Arrow */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 border-4 border-transparent border-t-[var(--md-sys-color-surface-container-highest)]" />
                </div>,
                document.body
            )}
        </div>
    );
}
