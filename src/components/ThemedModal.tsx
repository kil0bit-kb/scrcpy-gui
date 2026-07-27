import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

type ModalKind = 'warning' | 'error' | 'info' | 'success';

interface ThemedModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message?: string;
    children?: React.ReactNode;
    icon?: React.ReactNode;
    kind?: ModalKind;
    actionLabel?: string;
    confirmText?: string;
    onAction?: () => void;
    showCancel?: boolean;
    cancelLabel?: string;
    onCancel?: () => void;
}

export default function ThemedModal({
    isOpen,
    onClose,
    title,
    message,
    children,
    icon,
    kind = 'info',
    actionLabel = 'Got it',
    confirmText,
    onAction,
    showCancel = false,
    cancelLabel = 'Cancel',
    onCancel
}: ThemedModalProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => {
            onClose();
        }, 150);
    };

    const config = {
        warning: {
            icon: <AlertTriangle size={24} className="text-amber-500" />,
        },
        error: {
            icon: <AlertCircle size={24} className="text-red-500" />,
        },
        info: {
            icon: <Info size={24} className="text-primary" />,
        },
        success: {
            icon: <CheckCircle2 size={24} className="text-emerald-500" />,
        }
    };

    const current = config[kind];

    return (
        <div className={`fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 select-none transition-opacity duration-150 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Mild black backdrop without blur */}
            <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

            {/* Modal Container: Material You Surface Container */}
            <div className={`relative w-full max-w-sm bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] border border-[var(--md-sys-color-surface-container-highest)] rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-150 ease-out ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}>
                
                <div className="p-6 pb-3 flex flex-col items-start text-left space-y-2 font-sans">
                    {/* Top Left Icon (No BG) */}
                    <div className="mb-0.5 flex items-center justify-start text-primary shrink-0">
                        {icon || current.icon}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-[var(--text-base)] select-none">
                        {title}
                    </h3>

                    {/* Message or Children */}
                    {message && (
                        <p className="text-[var(--text-muted)] text-xs font-medium leading-relaxed">
                            {message}
                        </p>
                    )}
                    {children}
                </div>

                {/* Footer Actions */}
                <div className="p-4 pt-2 flex gap-2.5 font-sans">
                    {showCancel && (
                        <button
                            onClick={() => {
                                if (onCancel) onCancel();
                                handleClose();
                            }}
                            className="flex-1 py-2.5 px-4 bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--text-base)] rounded-xl text-xs font-bold transition-colors cursor-pointer border border-transparent select-none whitespace-nowrap inline-flex items-center justify-center"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onAction) onAction();
                            handleClose();
                        }}
                        className="flex-1 py-2.5 px-4 bg-primary text-on-primary rounded-xl text-xs font-bold transition-all hover:opacity-95 cursor-pointer shadow-md border border-transparent select-none whitespace-nowrap inline-flex items-center justify-center"
                    >
                        {confirmText || actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
