import { create } from 'zustand';
import { db, generateLocalId, type LocalInvoice, type LocalInvoiceItem } from '@/lib/db';
import { calculateInvoiceTotals, calculateBalanceDue, getPaymentStatus } from '@/lib/utils/calculations';
import type { InvoiceItemInput } from '@/types/database';

interface InvoiceFormItem extends InvoiceItemInput {
    localId: string;
}

interface InvoiceFormState {
    // Form data
    customerId: string | null;
    walkInCustomerName: string;
    invoiceDate: string;
    dueDate: string;
    items: InvoiceFormItem[];
    customColumns: { id: string; label: string }[];

    // Additional charges
    designCharges: number;
    deliveryCharges: number;
    taxRate: number;
    otherCharges: number;
    otherChargesLabel: string;

    // Notes
    notes: string;
    internalNotes: string;

    // Calculated (read-only in UI, computed from items)
    subtotal: number;
    totalCost: number;
    taxAmount: number;
    totalAmount: number;
    margin: number;
    marginPercentage: number;

    // UI state
    isLoading: boolean;
    isDraft: boolean;
    editingInvoiceId: string | null;

    // Actions
    setCustomerId: (id: string | null) => void;
    setWalkInCustomerName: (name: string) => void;
    setInvoiceDate: (date: string) => void;
    setDueDate: (date: string) => void;

    addItem: () => void;
    removeItem: (localId: string) => void;
    updateItem: (localId: string, field: keyof InvoiceFormItem, value: string | number) => void;
    updateItemCustomValue: (localId: string, columnId: string, value: string) => void;
    addCustomColumn: (label: string) => void;
    removeCustomColumn: (columnId: string) => void;
    replicateValue: (startLocalId: string, field: keyof InvoiceFormItem, rowCount: number) => void;

    setDesignCharges: (amount: number) => void;
    setDeliveryCharges: (amount: number) => void;
    setTaxRate: (rate: number) => void;
    setOtherCharges: (amount: number) => void;
    setOtherChargesLabel: (label: string) => void;

    setNotes: (notes: string) => void;
    setInternalNotes: (notes: string) => void;

    recalculateTotals: () => void;
    resetForm: () => void;
    initializeFromSettings: () => void;
    loadInvoice: (invoiceLocalId: string) => Promise<void>;
    saveInvoice: (asDraft?: boolean) => Promise<string>;
}

const createEmptyItem = (): InvoiceFormItem => ({
    localId: generateLocalId(),
    description: '',
    specifications: '',
    quantity: 1,
    unit: 'pcs',
    rate: 0,
    cost: 0,
});

const getDefaultDueDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
};

export const useInvoiceFormStore = create<InvoiceFormState>((set, get) => ({
    // Initial form data
    customerId: null,
    walkInCustomerName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: getDefaultDueDate(),
    items: [createEmptyItem()],
    customColumns: [],

    designCharges: 0,
    deliveryCharges: 0,
    taxRate: 0,
    otherCharges: 0,
    otherChargesLabel: '',

    notes: '',
    internalNotes: '',

    subtotal: 0,
    totalCost: 0,
    taxAmount: 0,
    totalAmount: 0,
    margin: 0,
    marginPercentage: 0,

    isLoading: false,
    isDraft: true,
    editingInvoiceId: null,

    setCustomerId: (id) => set({ customerId: id }),
    setWalkInCustomerName: (name) => set({ walkInCustomerName: name }),
    setInvoiceDate: (date) => set({ invoiceDate: date }),
    setDueDate: (date) => set({ dueDate: date }),

    addItem: () => {
        const { items } = get();
        set({ items: [...items, createEmptyItem()] });
    },

    removeItem: (localId) => {
        const { items } = get();
        if (items.length > 1) {
            const newItems = items.filter((item) => item.localId !== localId);
            set({ items: newItems });
            get().recalculateTotals();
        }
    },

    updateItem: (localId, field, value) => {
        const { items } = get();
        const newItems = items.map((item) => {
            if (item.localId === localId) {
                return { ...item, [field]: value };
            }
            return item;
        });
        set({ items: newItems });
        get().recalculateTotals();
    },

    updateItemCustomValue: (localId, columnId, value) => {
        const { items } = get();
        const newItems = items.map((item) => {
            if (item.localId === localId) {
                return {
                    ...item,
                    customValues: {
                        ...(item.customValues || {}),
                        [columnId]: value
                    }
                };
            }
            return item;
        });
        set({ items: newItems });
    },

    addCustomColumn: (label) => {
        const { customColumns } = get();
        const id = `col_${Date.now()}`;
        set({ customColumns: [...customColumns, { id, label }] });
    },

    removeCustomColumn: (columnId) => {
        const { customColumns } = get();
        set({ customColumns: customColumns.filter(c => c.id !== columnId) });
        // Optional: Cleanup values from items? Not strictly necessary for functionality.
    },

    replicateValue: (startLocalId, field, rowCount) => {
        const { items } = get();
        const startIndex = items.findIndex((item) => item.localId === startLocalId);
        if (startIndex === -1) return;

        const valueToReplicate = items[startIndex][field];
        const newItems = [...items];

        // Add new rows if needed
        while (newItems.length < startIndex + rowCount + 1) {
            newItems.push(createEmptyItem());
        }

        // Replicate value to subsequent rows
        for (let i = startIndex + 1; i <= startIndex + rowCount && i < newItems.length; i++) {
            newItems[i] = { ...newItems[i], [field]: valueToReplicate };
        }

        set({ items: newItems });
        get().recalculateTotals();
    },

    setDesignCharges: (amount) => {
        set({ designCharges: amount });
        get().recalculateTotals();
    },

    setDeliveryCharges: (amount) => {
        set({ deliveryCharges: amount });
        get().recalculateTotals();
    },

    setTaxRate: (rate) => {
        set({ taxRate: rate });
        get().recalculateTotals();
    },

    setOtherCharges: (amount) => {
        set({ otherCharges: amount });
        get().recalculateTotals();
    },

    setOtherChargesLabel: (label) => set({ otherChargesLabel: label }),

    setNotes: (notes) => set({ notes }),
    setInternalNotes: (notes) => set({ internalNotes: notes }),

    recalculateTotals: () => {
        const { items, designCharges, deliveryCharges, taxRate, otherCharges } = get();
        const result = calculateInvoiceTotals(items, {
            designCharges,
            deliveryCharges,
            taxRate,
            otherCharges,
        });
        set({
            subtotal: result.subtotal,
            totalCost: result.totalCost,
            taxAmount: result.taxAmount,
            totalAmount: result.totalAmount,
            margin: result.margin,
            marginPercentage: result.marginPercentage,
        });
    },

    resetForm: () => {
        set({
            customerId: null,
            walkInCustomerName: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: getDefaultDueDate(),
            items: [createEmptyItem()],
            customColumns: [],
            designCharges: 0,
            deliveryCharges: 0,
            taxRate: 0,
            otherCharges: 0,
            otherChargesLabel: '',
            notes: '',
            internalNotes: '',
            subtotal: 0,
            totalCost: 0,
            taxAmount: 0,
            totalAmount: 0,
            margin: 0,
            marginPercentage: 0,
            isLoading: false,
            isDraft: true,
            editingInvoiceId: null,
        });
    },

    loadInvoice: async (invoiceLocalId: string) => {
        set({ isLoading: true });
        try {
            const invoice = await db.invoices.get(invoiceLocalId);
            if (!invoice) throw new Error('Invoice not found');

            const items = await db.invoiceItems.where('invoiceLocalId').equals(invoiceLocalId).toArray();

            set({
                customerId: invoice.customerId || null,
                walkInCustomerName: invoice.walkInCustomerName || '',
                invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
                dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : getDefaultDueDate(),
                items: items.map((item) => ({
                    localId: item.localId,
                    description: item.description,
                    specifications: item.specifications || '',
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: item.rate,
                    cost: item.cost,
                    supplierId: item.supplierId,
                    customValues: item.customValues || {},
                })),
                customColumns: invoice.customColumns || [],
                designCharges: invoice.designCharges,
                deliveryCharges: invoice.deliveryCharges,
                taxRate: invoice.taxRate,
                otherCharges: invoice.otherCharges,
                otherChargesLabel: invoice.otherChargesLabel || '',
                notes: invoice.notes || '',
                internalNotes: invoice.internalNotes || '',
                isDraft: invoice.status === 'draft',
                editingInvoiceId: invoiceLocalId,
            });
            get().recalculateTotals();
        } finally {
            set({ isLoading: false });
        }
    },

    initializeFromSettings: () => {
        try {
            const saved = localStorage.getItem('miprinters_settings');
            if (saved) {
                const settings = JSON.parse(saved);

                // Calculate due date based on default terms
                const terms = settings.defaultPaymentTerms || 30;
                const date = new Date();
                date.setDate(date.getDate() + terms);
                const dueDate = date.toISOString().split('T')[0];

                set({
                    taxRate: settings.defaultTaxRate || 0,
                    dueDate: dueDate,
                });

                get().recalculateTotals();
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    },

    saveInvoice: async (asDraft = false) => {
        const state = get();
        set({ isLoading: true });

        try {
            const now = Date.now();
            const invoiceLocalId = state.editingInvoiceId || generateLocalId();

            // Generate invoice number from Settings
            let invoiceNumber = '';

            if (state.editingInvoiceId) {
                // Keep existing number if editing
                const existing = await db.invoices.get(state.editingInvoiceId);
                invoiceNumber = existing?.invoiceNumber || '';
            }

            // If new or missing number, generate one
            if (!invoiceNumber) {
                try {
                    const saved = localStorage.getItem('miprinters_settings');
                    if (saved) {
                        const settings = JSON.parse(saved);
                        const prefix = settings.invoicePrefix || 'INV';
                        const nextNum = settings.nextInvoiceNumber || 1;
                        const year = new Date().getFullYear();

                        // Format: PRE-YEAR-0001
                        invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;

                        // Increment and save next number immediately to prevent duplicates
                        // Note: In a real multi-user app, this should be done on the server/DB side via a transaction
                        const newSettings = { ...settings, nextInvoiceNumber: nextNum + 1 };
                        localStorage.setItem('miprinters_settings', JSON.stringify(newSettings));

                        // Also try to update DB settings if possible (best effort)
                        // This logic mirrors the saveSettings in Settings page, 
                        // but we rely on local sync for now.
                    }
                } catch (e) {
                    console.error('Error generating invoice number from settings:', e);
                }

                // Fallback if still empty
                if (!invoiceNumber) {
                    const count = await db.invoices.count();
                    invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
                }
            }

            const invoiceData: LocalInvoice = {
                localId: invoiceLocalId,
                customerId: state.customerId || undefined,
                walkInCustomerName: (!state.customerId && state.walkInCustomerName) ? state.walkInCustomerName : undefined,
                invoiceNumber: invoiceNumber,
                invoiceDate: new Date(state.invoiceDate).getTime(),
                dueDate: state.dueDate ? new Date(state.dueDate).getTime() : undefined,
                customColumns: state.customColumns,
                subtotal: state.subtotal,
                taxAmount: state.taxAmount,
                totalAmount: state.totalAmount,
                designCharges: state.designCharges,
                deliveryCharges: state.deliveryCharges,
                taxRate: state.taxRate,
                otherCharges: state.otherCharges,
                otherChargesLabel: state.otherChargesLabel || undefined,
                totalCost: state.totalCost,
                margin: state.margin,
                marginPercentage: state.marginPercentage,
                paymentStatus: 'unpaid',
                amountPaid: 0,
                balanceDue: state.totalAmount,
                notes: state.notes || undefined,
                internalNotes: state.internalNotes || undefined,
                status: asDraft ? 'draft' : 'final',
                syncStatus: 'pending',
                createdAt: state.editingInvoiceId ? (await db.invoices.get(state.editingInvoiceId))?.createdAt || now : now,
                updatedAt: now,
            };

            // Save invoice
            await db.invoices.put(invoiceData);

            // Delete old items if editing
            if (state.editingInvoiceId) {
                await db.invoiceItems.where('invoiceLocalId').equals(invoiceLocalId).delete();
            }

            // Save items
            const itemsData: LocalInvoiceItem[] = state.items
                .filter((item) => item.description.trim())
                .map((item, index) => ({
                    localId: item.localId,
                    invoiceLocalId,
                    invoiceId: '',
                    position: index + 1,
                    description: item.description,
                    specifications: item.specifications || undefined,
                    quantity: item.quantity,
                    unit: item.unit || 'pcs',
                    rate: item.rate,
                    amount: item.quantity * item.rate,
                    cost: item.cost || 0,
                    itemMargin: item.quantity * item.rate - item.quantity * (item.cost || 0),
                    supplierId: item.supplierId,
                    customValues: item.customValues,
                    createdAt: now,
                }));

            await db.invoiceItems.bulkPut(itemsData);

            // Add to sync queue
            await db.syncQueue.add({
                entityType: 'invoice',
                entityLocalId: invoiceLocalId,
                operation: state.editingInvoiceId ? 'update' : 'create',
                payload: { invoice: invoiceData, items: itemsData },
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            return invoiceLocalId;
        } finally {
            set({ isLoading: false });
        }
    },
}));
