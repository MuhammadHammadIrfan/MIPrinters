'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============== CONFIRM DIALOG ==============
interface ConfirmDialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmDialogContextType {
    confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function useConfirmDialog() {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
    }
    return context;
}

// ============== TOAST NOTIFICATIONS ==============
interface ToastOptions {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

interface ToastContextType {
    toast: (options: ToastOptions) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

// ============== PROVIDER COMPONENT ==============
interface DialogState {
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: ((value: boolean) => void) | null;
}

interface ToastState {
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

export function DialogProvider({ children }: { children: ReactNode }) {
    // Confirm Dialog State
    const [dialogState, setDialogState] = useState<DialogState>({
        isOpen: false,
        options: { title: '', message: '' },
        resolve: null,
    });

    // Toast State
    const [toasts, setToasts] = useState<ToastState[]>([]);
    const [toastId, setToastId] = useState(0);

    // Confirm Dialog Function
    const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                options,
                resolve,
            });
        });
    }, []);

    const handleConfirm = () => {
        dialogState.resolve?.(true);
        setDialogState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };

    const handleCancel = () => {
        dialogState.resolve?.(false);
        setDialogState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };

    // Toast Functions
    const addToast = useCallback((options: ToastOptions) => {
        const id = toastId + 1;
        setToastId(id);
        const newToast: ToastState = {
            id,
            message: options.message,
            type: options.type || 'info',
        };
        setToasts(prev => [...prev, newToast]);

        // Auto remove after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, options.duration || 3000);
    }, [toastId]);

    const toastContext: ToastContextType = {
        toast: addToast,
        success: (message) => addToast({ message, type: 'success' }),
        error: (message) => addToast({ message, type: 'error' }),
        warning: (message) => addToast({ message, type: 'warning' }),
        info: (message) => addToast({ message, type: 'info' }),
    };

    const variantStyles = {
        danger: {
            icon: '⚠️',
            confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        },
        warning: {
            icon: '⚠️',
            confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
        },
        info: {
            icon: 'ℹ️',
            confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
        },
    };

    const toastStyles = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-amber-500 text-white',
        info: 'bg-blue-600 text-white',
    };

    const toastIcons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    const variant = dialogState.options.variant || 'danger';
    const styles = variantStyles[variant];

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            <ToastContext.Provider value={toastContext}>
                {children}

                {/* Confirm Dialog Modal */}
                {dialogState.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">
                                        {styles.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {dialogState.options.title}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {dialogState.options.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-100">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-2.5 px-4 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                                >
                                    {dialogState.options.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${styles.confirmClass}`}
                                >
                                    {dialogState.options.confirmText || 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Container */}
                <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right duration-200 ${toastStyles[toast.type]}`}
                        >
                            <span className="text-lg font-bold">{toastIcons[toast.type]}</span>
                            <span className="text-sm font-medium">{toast.message}</span>
                            <button
                                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                className="ml-2 opacity-70 hover:opacity-100"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </ToastContext.Provider>
        </ConfirmDialogContext.Provider>
    );
}
