import { create } from 'zustand';
import { db, generateLocalId, type LocalCustomer } from '@/lib/db';
import { pullFromCloud } from '@/lib/sync/syncService';

interface CustomerState {
    customers: LocalCustomer[];
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    searchQuery: string;

    // Actions
    loadCustomers: () => Promise<void>;
    addCustomer: (customer: Omit<LocalCustomer, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'isActive'>) => Promise<string>;
    updateCustomer: (localId: string, updates: Partial<LocalCustomer>) => Promise<void>;
    deleteCustomer: (localId: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    getFilteredCustomers: () => LocalCustomer[];
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
    customers: [],
    isLoading: false,
    isInitialized: false,
    error: null,
    searchQuery: '',

    loadCustomers: async () => {
        // Prevent multiple loads
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
            const allCustomers = await db.customers.toArray();
            const customers = allCustomers.filter(c => c.isActive !== false);
            set({ customers, isLoading: false, isInitialized: true });

            // Trigger background sync - reload after pull completes
            pullFromCloud().then(async () => {
                const refreshed = await db.customers.toArray();
                const active = refreshed.filter(c => c.isActive !== false);
                set({ customers: active });
            }).catch(err => console.error('Background sync failed:', err));
        } catch (error) {
            console.error('Failed to load customers:', error);
            set({ error: 'Failed to load customers', isLoading: false, isInitialized: true });
        }
    },

    addCustomer: async (customerData) => {
        const localId = generateLocalId();
        const now = Date.now();

        const customer: LocalCustomer = {
            localId,
            ...customerData,
            isActive: true,
            syncStatus: 'pending',
            createdAt: now,
            updatedAt: now,
        };

        try {
            await db.customers.add(customer);

            // Add to sync queue
            await db.syncQueue.add({
                entityType: 'customer',
                entityLocalId: localId,
                operation: 'create',
                payload: customer,
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            set((state) => ({ customers: [...state.customers, customer] }));
            return localId;
        } catch (error) {
            console.error('Failed to add customer:', error);
            throw error;
        }
    },

    updateCustomer: async (localId, updates) => {
        const now = Date.now();
        try {
            await db.customers.update(localId, { ...updates, updatedAt: now, syncStatus: 'pending' });

            await db.syncQueue.add({
                entityType: 'customer',
                entityLocalId: localId,
                operation: 'update',
                payload: updates,
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            set((state) => ({
                customers: state.customers.map((c) =>
                    c.localId === localId ? { ...c, ...updates, updatedAt: now } : c
                ),
            }));
        } catch (error) {
            console.error('Failed to update customer:', error);
            throw error;
        }
    },

    deleteCustomer: async (localId) => {
        const now = Date.now();
        try {
            await db.customers.update(localId, { isActive: false, updatedAt: now, syncStatus: 'pending' });

            await db.syncQueue.add({
                entityType: 'customer',
                entityLocalId: localId,
                operation: 'delete',
                payload: { localId },
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            set((state) => ({
                customers: state.customers.filter((c) => c.localId !== localId),
            }));
        } catch (error) {
            console.error('Failed to delete customer:', error);
            throw error;
        }
    },

    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    getFilteredCustomers: () => {
        const { customers, searchQuery } = get();
        if (!searchQuery.trim()) return customers;

        const query = searchQuery.toLowerCase();
        return customers.filter(
            (c) =>
                c.name.toLowerCase().includes(query) ||
                c.company?.toLowerCase().includes(query) ||
                c.phone?.includes(query) ||
                c.city?.toLowerCase().includes(query)
        );
    },
}));
