'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function useAutoLogout() {
    const clearAuth = useAuthStore((state) => state.clearAuth);

    useEffect(() => {
        const handleBeforeUnload = () => {
            // Clear auth when tab/window closes
            // Note: This might not always work reliably in all browsers/scenarios 
            // but sessionStorage usually handles the "tab close" clearing automatically.
            // This is an extra safety measure.
            clearAuth();
        };

        const handlePageHide = () => {
            // Additional cleanup for mobile browsers where beforeunload is unreliable
            // Check if we are actually closing or just switching tabs (heuristic)
            if (document.visibilityState === 'hidden') {
                // We don't necessarily want to logout on switch, but if request is strict "app close"
                // For now keeping strictly to user request which implies close.
                // Ideally sessionStorage is enough for tab close, but user wants Force Logout.
                // CAUTION: 'pagehide' fires on tab switch on mobile too sometimes.
                // We will trust sessionStorage for persistence during navigation, 
                // and this specifically for termination.
            }
            // For PWA/Mobile ensuring cleanup
            // clearAuth(); // Uncommenting this makes it very aggressive (lost state on tab switch)
        };

        // Actually, for "Auto Logout on App Close", sessionStorage handles the "Session" part.
        // But the user specifically asked for this implementation to fix "not working" issues.

        // Implementation based on user request:
        const handleUnload = () => {
            clearAuth();
        };

        // Desktop browsers
        window.addEventListener('beforeunload', handleUnload);

        // Mobile browsers (Safari, Chrome mobile)
        // window.addEventListener('pagehide', handlePageHide); 

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            // window.removeEventListener('pagehide', handlePageHide);
        };
    }, [clearAuth]);
}
