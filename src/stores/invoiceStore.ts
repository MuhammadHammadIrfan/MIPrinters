import { create } from 'zustand';
import { db, type LocalInvoice, type LocalInvoiceItem } from '@/lib/db';
import { pullFromCloud } from '@/lib/sync/syncService';

interface InvoiceState {
    invoices: LocalInvoice[];
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    filterStatus: 'all' | 'unpaid' | 'partial' | 'paid' | 'draft';

    // Actions
    loadInvoices: () => Promise<void>;
    getInvoice: (localId: string) => Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null>;
    deleteInvoice: (localId: string) => Promise<void>;
    setFilterStatus: (status: 'all' | 'unpaid' | 'partial' | 'paid' | 'draft') => void;
    getFilteredInvoices: () => LocalInvoice[];

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
            // First, pull from cloud to ensure we have latest data
            // This is non-blocking - if it fails, we continue with local data
            await pullFromCloud().catch(err => {
                console.warn('Cloud pull failed, using local data:', err);
            });

            const invoices = await db.invoices.orderBy('createdAt').reverse().toArray();
            set({ invoices, isLoading: false, isInitialized: true });
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
        try {
            await db.invoices.delete(localId);
            await db.invoiceItems.where('invoiceLocalId').equals(localId).delete();

            await db.syncQueue.add({
                entityType: 'invoice',
                entityLocalId: localId,
                operation: 'delete',
                payload: { localId },
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            set((state) => ({
                invoices: state.invoices.filter((i) => i.localId !== localId),
            }));
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
            // Ensure we have latest data from cloud
            await pullFromCloud().catch(() => { });

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

            const allInvoices = await db.invoices.toArray();
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
