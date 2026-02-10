import { create } from 'zustand';
import { db, type LocalInvoice, type LocalInvoiceItem } from '@/lib/db';
import { pullFromCloud } from '@/lib/sync/syncService';

export interface InvoiceWithCustomer extends LocalInvoice {
    customerName?: string;
}

interface InvoiceState {
    invoices: InvoiceWithCustomer[];
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    filterStatus: 'all' | 'unpaid' | 'partial' | 'paid' | 'draft';

    // Actions
    loadInvoices: () => Promise<void>;
    getInvoice: (localId: string) => Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null>;
    deleteInvoice: (localId: string) => Promise<void>;
    setFilterStatus: (status: 'all' | 'unpaid' | 'partial' | 'paid' | 'draft') => void;
    getFilteredInvoices: () => InvoiceWithCustomer[];

    // Dashboard stats
    getDashboardStats: () => Promise<{
        todaySales: number;
        todayInvoices: number;
        pendingAmount: number;
        pendingInvoices: number;
        monthSales: number;
        monthProfit: number;
        totalCustomers: number;
    }>;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
    invoices: [],
    isLoading: false,
    isInitialized: false,
    error: null,
    filterStatus: 'all',

    loadInvoices: async () => {
        // Prevent multiple loads
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
            // Fetch invoices from local DB first (excluding soft-deleted)
            const allInvoices = await db.invoices.orderBy('createdAt').reverse().toArray();
            const invoices = allInvoices.filter(i => i.isDeleted !== true);

            // Fetch customers to map names
            const customers = await db.customers.toArray();

            // Map by BOTH localId and id (UUID) to handle all cases
            const customerMap = new Map<string, typeof customers[0]>();
            customers.forEach(c => {
                if (c.localId) customerMap.set(c.localId, c);
                if (c.id) customerMap.set(c.id, c);
            });

            // Map customer names to invoices
            const invoicesWithCustomers: InvoiceWithCustomer[] = invoices.map(invoice => {
                let customerName = undefined;
                if (invoice.customerId) {
                    const customer = customerMap.get(invoice.customerId);
                    if (customer) {
                        customerName = customer.company || customer.name;
                    }
                }
                return { ...invoice, customerName };
            });

            set({ invoices: invoicesWithCustomers, isLoading: false, isInitialized: true });

            // Trigger background sync - reload after pull completes
            pullFromCloud().then(async () => {
                const refreshedInvoices = await db.invoices.orderBy('createdAt').reverse().toArray();
                const activeInvoices = refreshedInvoices.filter(i => i.isDeleted !== true);
                const refreshedCustomers = await db.customers.toArray();
                const refreshedMap = new Map<string, typeof refreshedCustomers[0]>();
                refreshedCustomers.forEach(c => {
                    if (c.localId) refreshedMap.set(c.localId, c);
                    if (c.id) refreshedMap.set(c.id, c);
                });
                const refreshedWithCustomers: InvoiceWithCustomer[] = activeInvoices.map(invoice => {
                    let customerName = undefined;
                    if (invoice.customerId) {
                        const customer = refreshedMap.get(invoice.customerId);
                        if (customer) {
                            customerName = customer.company || customer.name;
                        }
                    }
                    return { ...invoice, customerName };
                });
                set({ invoices: refreshedWithCustomers });
            }).catch(err => console.error('Background sync failed:', err));
        } catch (error) {
            console.error('Failed to load invoices:', error);
            set({ error: 'Failed to load invoices', isLoading: false, isInitialized: true });
        }
    },

    getInvoice: async (localId) => {
        try {
            const invoice = await db.invoices.get(localId);
            if (!invoice) return null;

            const items = await db.invoiceItems.where('invoiceLocalId').equals(localId).toArray();
            return { invoice, items };
        } catch (error) {
            console.error('Failed to get invoice:', error);
            return null;
        }
    },

    deleteInvoice: async (localId) => {
        const now = Date.now();
        console.log('[Delete Invoice] Starting soft delete for:', localId);

        try {
            // Get invoice first to verify it exists
            const invoice = await db.invoices.get(localId);
            console.log('[Delete Invoice] Found invoice:', invoice?.invoiceNumber, 'id:', invoice?.id);

            // Soft delete: mark as deleted instead of actually deleting
            await db.invoices.update(localId, {
                isDeleted: true,
                updatedAt: now,
                syncStatus: 'pending'
            });
            console.log('[Delete Invoice] Marked as deleted in IndexedDB');

            // Still delete items locally (they'll be removed in cloud when invoice syncs)
            await db.invoiceItems.where('invoiceLocalId').equals(localId).delete();

            // Add to sync queue to sync the soft delete
            await db.syncQueue.add({
                entityType: 'invoice',
                entityLocalId: localId,
                operation: 'update', // Just updating isDeleted flag
                payload: { isDeleted: true },
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });
            console.log('[Delete Invoice] Added to sync queue');

            set((state) => ({
                invoices: state.invoices.filter((i) => i.localId !== localId),
            }));

            console.log('[Delete Invoice] Soft delete complete, waiting for sync...');
        } catch (error) {
            console.error('Failed to delete invoice:', error);
            throw error;
        }
    },

    setFilterStatus: (status) => {
        set({ filterStatus: status });
    },

    getFilteredInvoices: () => {
        const { invoices, filterStatus } = get();
        if (filterStatus === 'all') return invoices;
        if (filterStatus === 'draft') return invoices.filter((i) => i.status === 'draft');
        return invoices.filter((i) => i.paymentStatus === filterStatus && i.status !== 'draft');
    },

    getDashboardStats: async () => {
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

            const allInvoicesRaw = await db.invoices.toArray();
            const allInvoices = allInvoicesRaw.filter(i => i.isDeleted !== true);
            const allCustomers = await db.customers.toArray();
            const customers = allCustomers.filter(c => c.isActive !== false).length;

            const todayInvoices = allInvoices.filter(
                (i) => i.createdAt >= startOfDay && i.status !== 'draft'
            );
            const todaySales = todayInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

            const pendingInvoices = allInvoices.filter(
                (i) => (i.paymentStatus === 'unpaid' || i.paymentStatus === 'partial') && i.status !== 'draft'
            );
            const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);

            const monthInvoices = allInvoices.filter(
                (i) => i.createdAt >= startOfMonth && i.status !== 'draft'
            );
            const monthSales = monthInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
            const monthProfit = monthInvoices.reduce((sum, i) => sum + (i.margin || 0), 0);

            return {
                todaySales,
                todayInvoices: todayInvoices.length,
                pendingAmount,
                pendingInvoices: pendingInvoices.length,
                monthSales,
                monthProfit,
                totalCustomers: customers,
            };
        } catch (error) {
            console.error('Failed to get dashboard stats:', error);
            return {
                todaySales: 0,
                todayInvoices: 0,
                pendingAmount: 0,
                pendingInvoices: 0,
                monthSales: 0,
                monthProfit: 0,
                totalCustomers: 0,
            };
        }
    },
}));
