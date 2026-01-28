'use client';

import { useAutoLogout } from '@/hooks/useAutoLogout';

/**
 * Client component to handle session management side effects.
 * This allows us to use hooks in Server Components (like RootLayout)
 * by wrapping them in this client component.
 */
export function SessionHandler() {
    useAutoLogout();

    // This component renders nothing
    return null;
}
