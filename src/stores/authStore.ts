import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
                set({
                    isAuthenticated: true,
                    ownerEmail: email,
                    businessName: businessName,
                    error: null,
                });
            },

            clearAuth: () => {
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
            name: 'auth-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                ownerEmail: state.ownerEmail,
                businessName: state.businessName,
            }),
        }
    )
);
