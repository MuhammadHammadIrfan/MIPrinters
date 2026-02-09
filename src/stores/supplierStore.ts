import { create } from 'zustand';
import { db, generateLocalId, type LocalSupplier } from '@/lib/db';
import { pullFromCloud } from '@/lib/sync/syncService';

interface SupplierState {
    suppliers: LocalSupplier[];
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    searchQuery: string;

    // Actions
    loadSuppliers: () => Promise<void>;
    addSupplier: (supplier: Omit<LocalSupplier, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'isActive'>) => Promise<string>;
    updateSupplier: (localId: string, updates: Partial<LocalSupplier>) => Promise<void>;
    deleteSupplier: (localId: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    getFilteredSuppliers: () => LocalSupplier[];
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
    suppliers: [],
    isLoading: false,
    isInitialized: false,
    error: null,
    searchQuery: '',

    loadSuppliers: async () => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
            const allSuppliers = await db.suppliers.toArray();
            const suppliers = allSuppliers.filter(s => s.isActive !== false);
            set({ suppliers, isLoading: false, isInitialized: true });

            // Trigger background sync
            pullFromCloud().catch(err => console.error('Background sync failed:', err));
        } catch (error) {
            console.error('Failed to load suppliers:', error);
            set({ error: 'Failed to load suppliers', isLoading: false, isInitialized: true });
        }
    },

    addSupplier: async (supplierData) => {
        const localId = generateLocalId();
        const now = Date.now();

        const supplier: LocalSupplier = {
            localId,
            ...supplierData,
            isActive: true,
            syncStatus: 'pending',
            createdAt: now,
            updatedAt: now,
        };

        try {
            await db.suppliers.add(supplier);

            await db.syncQueue.add({
                entityType: 'supplier',
                entityLocalId: localId,
                operation: 'create',
                payload: supplier,
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            set((state) => ({ suppliers: [...state.suppliers, supplier] }));
            return localId;
        } catch (error) {
            console.error('Failed to add supplier:', error);
            throw error;
        }
    },

    updateSupplier: async (localId, updates) => {
        const now = Date.now();
        try {
            await db.suppliers.update(localId, { ...updates, updatedAt: now, syncStatus: 'pending' });

            await db.syncQueue.add({
                entityType: 'supplier',
                entityLocalId: localId,
                operation: 'update',
                payload: updates,
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            set((state) => ({
                suppliers: state.suppliers.map((s) =>
                    s.localId === localId ? { ...s, ...updates, updatedAt: now } : s
                ),
            }));
        } catch (error) {
            console.error('Failed to update supplier:', error);
            throw error;
        }
    },

    deleteSupplier: async (localId) => {
        const now = Date.now();
        try {
            await db.suppliers.update(localId, { isActive: false, updatedAt: now, syncStatus: 'pending' });

            await db.syncQueue.add({
                entityType: 'supplier',
                entityLocalId: localId,
                operation: 'delete',
                payload: { localId },
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            set((state) => ({
                suppliers: state.suppliers.filter((s) => s.localId !== localId),
            }));
        } catch (error) {
            console.error('Failed to delete supplier:', error);
            throw error;
        }
    },

    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    getFilteredSuppliers: () => {
        const { suppliers, searchQuery } = get();
        if (!searchQuery.trim()) return suppliers;

        const query = searchQuery.toLowerCase();
        return suppliers.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                s.phone?.includes(query) ||
                s.supplierType?.toLowerCase().includes(query)
        );
    },
}));
