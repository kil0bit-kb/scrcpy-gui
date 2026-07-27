import { useState, useRef, useEffect } from 'react';
import { KeyboardArrowDown, Check } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

export interface DropdownOption<T = any> {
    value: T;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export interface CustomDropdownProps<T = any> {
    value: T;
    onChange: (value: T) => void;
    options: DropdownOption<T>[];
    label?: string;
    placeholder?: string;
    icon?: React.ReactNode;
    className?: string;
    compact?: boolean;
    disabled?: boolean;
}

export default function CustomDropdown<T = any>({
    value,
    onChange,
    options,
    label,
    placeholder = "Select...",
    icon,
    className = "",
    compact = false,
    disabled = false
}: CustomDropdownProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [placeAbove, setPlaceAbove] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownMaxHeight = 220;

            if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
                setPlaceAbove(true);
            } else {
                setPlaceAbove(false);
            }
        }

        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('pointerdown', handleClickOutside);
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = options.find((opt) => opt.value === value) || {
        value,
        label: value != null && value !== "" ? String(value) : placeholder
    };

    return (
        <div className={`relative max-w-[220px] ${className}`} ref={containerRef}>
            {label && (
                <label className="text-[9px] font-black text-[var(--text-muted)] mb-1 block">
                    {label}
                </label>
            )}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full max-w-[220px] bg-[var(--md-sys-color-surface-container-highest)] hover:bg-[var(--md-sys-color-primary-container)]/50 text-[var(--text-base)] rounded-2xl ${
                    compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'
                } flex items-center justify-between transition-all duration-75 ease-out group ${
                    isOpen ? 'bg-[var(--md-sys-color-primary-container)]/60 text-primary' : ''
                } ${
                    disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && (
                        <span className="text-primary group-hover:text-primary transition-colors shrink-0">
                            {icon}
                        </span>
                    )}
                    <span className="truncate font-bold tracking-tight text-[var(--text-base)]">{selectedOption?.label}</span>
                </div>
                <KeyboardArrowDown size={16} className={`text-primary/80 group-hover:text-primary transition-transform duration-75 ease-out shrink-0 ml-1.5 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                }`} />
            </button>

            {isOpen && (
                <div className={`absolute left-0 w-full min-w-[140px] max-w-[220px] bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] rounded-2xl shadow-2xl z-[200] p-1 overflow-hidden backdrop-blur-xl animate-dropdown max-h-56 overflow-y-auto custom-scrollbar ${
                    placeAbove ? 'bottom-full mb-1' : 'top-full mt-1'
                }`}>
                    {options.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                            <div
                                key={String(opt.value)}
                                onClick={() => {
                                    if (!opt.disabled) {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }
                                }}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl ${
                                    compact ? 'text-[10px]' : 'text-[11px]'
                                } transition-all duration-75 ease-out ${
                                    opt.disabled
                                        ? 'opacity-30 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-black shadow-sm'
                                        : 'text-[var(--text-base)] hover:bg-[var(--md-sys-color-primary-container)]/40 hover:text-primary cursor-pointer font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {opt.icon && (
                                        <span className="text-primary shrink-0">
                                            {opt.icon}
                                        </span>
                                    )}
                                    <div className="truncate">
                                        <div className="truncate">{opt.label}</div>
                                        {opt.description && (
                                            <div className="text-[8px] text-[var(--text-subtle)] font-normal truncate">
                                                {opt.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isSelected && <Check size={16} className="text-primary shrink-0 ml-1" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
