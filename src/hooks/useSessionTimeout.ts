'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSessionTimeout() {
    const router = useRouter();
    const { isAuthenticated, lastActivity, clearAuth, setAuth, updateActivity } = useAuthStore();

    // Validate session with server on mount (always, regardless of client state)
    useEffect(() => {
        const validateServerSession = async () => {
            console.log('🔐 [SessionTimeout] Validating session with server...');

            try {
                const response = await fetch('/api/auth/session');
                const data = await response.json();

                console.log('🔐 [SessionTimeout] Server response:', data);

                if (!data.authenticated) {
                    console.log('🔐 [SessionTimeout] Session invalid:', data.reason || 'unknown');
                    clearAuth();

                    // Determine redirect reason
                    const reason = data.reason === 'session_invalidated'
                        ? 'password_changed'
                        : data.reason === 'token_outdated'
                            ? 'relogin_required'
                            : 'session_expired';

                    router.replace(`/login?reason=${reason}`);
                    router.refresh();
                } else {
                    console.log('🔐 [SessionTimeout] Session valid, syncing auth state');
                    // Sync client state with server state
                    if (data.user) {
                        setAuth(data.user.email, data.user.businessName);
                    }
                }
            } catch (error) {
                console.error('Failed to validate session:', error);
                // On network error, don't log out (graceful degradation for offline)
            }
        };

        validateServerSession();
    }, []); // Run once on mount, no dependencies

    // Local timeout check (only when authenticated)
    useEffect(() => {
        if (!isAuthenticated) return;

        const checkSession = () => {
            const now = Date.now();
            if (lastActivity && (now - lastActivity) > SESSION_TIMEOUT) {
                console.log('⏱️ Session expired due to inactivity');
                clearAuth();
                router.replace('/login?reason=timeout');
                router.refresh();
            }
        };

        // Check on mount
        checkSession();

        // Check every minute
        const interval = setInterval(checkSession, 60 * 1000);

        // Update activity on user interaction
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = () => updateActivity();

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            clearInterval(interval);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isAuthenticated, lastActivity, clearAuth, updateActivity, router]);
}
