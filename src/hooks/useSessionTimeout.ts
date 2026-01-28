'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSessionTimeout() {
    const router = useRouter();
    const { isAuthenticated, lastActivity, clearAuth, updateActivity } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) return;

        // Check if session expired
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
