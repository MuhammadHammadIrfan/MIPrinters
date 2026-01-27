'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setAuth, setLoading, setError, isLoading, error, isAuthenticated } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    const redirectTo = searchParams.get('redirect') || '/dashboard';

    // Check if biometric login is available
    useEffect(() => {
        const checkBiometric = () => {
            const isSupported = window.PublicKeyCredential !== undefined;
            const isEnabled = localStorage.getItem('biometric_enabled') === 'true';
            const hasCredential = localStorage.getItem('biometric_credential_id') !== null;
            setBiometricAvailable(isSupported && isEnabled && hasCredential);
        };
        checkBiometric();
    }, []);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push(redirectTo);
        }
    }, [isAuthenticated, router, redirectTo]);

    // Handle biometric login
    const handleBiometricLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            const credentialId = localStorage.getItem('biometric_credential_id');
            if (!credentialId) {
                throw new Error('No biometric credential found');
            }

            // Convert base64 credential ID to Uint8Array
            const credentialIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

            // Generate a random challenge
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            // Request biometric authentication
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: window.location.hostname,
                    allowCredentials: [{
                        id: credentialIdBytes,
                        type: 'public-key',
                        transports: ['internal'],
                    }],
                    userVerification: 'required',
                    timeout: 60000,
                },
            });

            if (assertion) {
                // Biometric verified successfully - set auth state
                // For single-owner app, we just need to verify the fingerprint matches
                const savedSettings = localStorage.getItem('miprinters_settings');
                let businessName = 'MI Printers';
                let ownerEmail = 'owner@miprinters.pk';

                if (savedSettings) {
                    try {
                        const parsed = JSON.parse(savedSettings);
                        businessName = parsed.businessName || businessName;
                        ownerEmail = parsed.email || ownerEmail;
                    } catch {
                        // Use defaults
                    }
                }

                setAuth(ownerEmail, businessName);
                router.push(redirectTo);
                router.refresh();
            }
        } catch (err) {
            console.error('Biometric login failed:', err);
            setError('Biometric authentication failed. Please try password login.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !password) {
            setError('Please enter email and password');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            // Set auth state
            setAuth(data.user.email, data.user.businessName);

            // Redirect to intended page
            router.push(redirectTo);
            router.refresh();
        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <form onSubmit={handleSubmit} className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                    Owner Login
                </h2>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Biometric Login Button */}
                {biometricAvailable && (
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={handleBiometricLogin}
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
                        >
                            <span className="text-2xl">👆</span>
                            <span>Login with Fingerprint</span>
                        </button>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white text-gray-500">or use password</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@miprinters.pk"
                            className="input"
                            autoComplete="email"
                            autoFocus={!biometricAvailable}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input pr-10"
                                autoComplete="current-password"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                tabIndex={-1}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full py-3"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span>
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </div>
            </form>

            {/* Info box */}
            <div className="mt-6 text-center text-sm text-gray-400">
                <p>🔒 Secure owner-only access</p>
                {!biometricAvailable && (
                    <p className="mt-1 text-xs">
                        💡 Register fingerprint in Settings for quick login
                    </p>
                )}
            </div>
        </div>
    );
}

function LoginFormSkeleton() {
    return (
        <div className="w-full max-w-md">
            <div className="card animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-6"></div>
                <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-300 rounded"></div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600 text-white font-bold text-2xl shadow-lg">
                    MI
                </div>
                <h1 className="text-2xl font-bold text-gray-900">MI Printers</h1>
                <p className="text-gray-500">Business Management System</p>
            </div>

            {/* Login Form wrapped in Suspense */}
            <Suspense fallback={<LoginFormSkeleton />}>
                <LoginForm />
            </Suspense>

            {/* Back to home link */}
            <a
                href="/"
                className="mt-8 text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
            >
                ← Back to home
            </a>
        </div>
    );
}
