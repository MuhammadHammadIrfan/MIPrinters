'use client';

import { useState, useEffect } from 'react';

export function AppLock({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if lock is enabled
        const enabled = localStorage.getItem('app_lock_enabled') === 'true';
        if (enabled) {
            // Check if we have a recent session? For now, always lock on reload
            // In a real app, maybe checking 'last_active' would be good.
            // Requirement: "logging in with fingerprint... as additional option"
            // We'll enforce lock on every hard reload.
            setIsLocked(true);
        }
        setLoading(false);
    }, []);

    const handleUnlock = () => {
        const storedPin = localStorage.getItem('app_lock_pin');
        if (pin === storedPin) {
            setIsLocked(false);
            setPin('');
            setError('');
        } else {
            setError('Incorrect PIN');
            setPin('');
        }
    };

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            setPin(prev => prev + num.toString());
            // Auto-submit on 4th digit
            if (pin.length === 3) {
                // Wait a tick for state to update? No, use local var
                const newPin = pin + num.toString();
                const storedPin = localStorage.getItem('app_lock_pin');
                if (newPin === storedPin) {
                    setTimeout(() => {
                        setIsLocked(false);
                        setPin('');
                        setError('');
                    }, 100);
                } else {
                    setTimeout(() => {
                        setError('Incorrect PIN');
                        setPin('');
                    }, 300);
                }
            }
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    if (loading) return null;

    if (isLocked) {
        return (
            <div className="fixed inset-0 z-[100] bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm text-center">
                    <div className="mb-8">
                        <div className="w-16 h-16 bg-green-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4">
                            🔒
                        </div>
                        <h1 className="text-2xl font-bold mb-2">App Locked</h1>
                        <p className="text-gray-400">Enter your PIN to unlock</p>
                    </div>

                    {/* PIN Dots */}
                    <div className="flex justify-center gap-4 mb-8">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-4 h-4 rounded-full border-2 border-white transition-all ${i < pin.length ? 'bg-green-500 border-green-500' : 'bg-transparent'
                                    }`}
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-red-500 mb-6 animate-pulse">{error}</p>
                    )}

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-6 max-w-[280px] mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-700 text-2xl font-semibold transition-colors focus:outline-none active:bg-gray-600"
                            >
                                {num}
                            </button>
                        ))}
                        <div className="col-span-1"></div>
                        <button
                            onClick={() => handleNumberClick(0)}
                            className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-700 text-2xl font-semibold transition-colors focus:outline-none active:bg-gray-600"
                        >
                            0
                        </button>
                        <button
                            onClick={handleBackspace}
                            className="w-16 h-16 rounded-full bg-transparent hover:bg-gray-800 text-xl font-medium transition-colors flex items-center justify-center focus:outline-none"
                        >
                            ⌫
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            // Fallback to logout
                            if (confirm('Forgot PIN? You can logout to reset.')) {
                                window.location.href = '/api/auth/logout';
                            }
                        }}
                        className="mt-12 text-sm text-gray-500 hover:text-white underline"
                    >
                        Forgot PIN?
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
