import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    isAuthenticated: boolean;
    ownerEmail: string | null;
    businessName: string | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setAuth: (email: string, businessName: string) => void;
    clearAuth: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            ownerEmail: null,
            businessName: null,
            isLoading: false,
            error: null,

            setAuth: (email: string, businessName: string) => {
                console.log('🔐 [AuthStore] Setting auth:', { email, businessName });
                set({
                    isAuthenticated: true,
                    ownerEmail: email,
                    businessName: businessName,
                    error: null,
                    isLoading: false,
                });
            },

            clearAuth: () => {
                console.log('🔓 [AuthStore] Clearing auth');
                set({
                    isAuthenticated: false,
                    ownerEmail: null,
                    businessName: null,
                    error: null,
                });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            setError: (error: string | null) => {
                set({ error, isLoading: false });
            },
        }),
        {
            name: 'auth-session',
            // Use sessionStorage instead of localStorage
            // This means auth will be cleared when browser/tab is closed
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                ownerEmail: state.ownerEmail,
                businessName: state.businessName,
            }),
        }
    )
);
