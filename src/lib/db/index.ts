import Dexie, { Table } from 'dexie';
import type {
    Customer,
    Supplier,
    Invoice,
    InvoiceItem,
    Payment,
    Quotation,
    QuotationItem,
    SyncQueueItem,
    SignedPhoto,
} from '@/types/database';

// Local versions with auto-increment localId for offline-first
export interface LocalCustomer extends Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> {
    localId: string;
    id?: string;
    createdAt: number;
    updatedAt: number;
}

export interface LocalSupplier extends Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> {
    localId: string;
    id?: string;
    createdAt: number;
    updatedAt: number;
}

export interface LocalInvoice extends Omit<Invoice, 'id' | 'customer' | 'items' | 'payments' | 'signedPhotos' | 'createdAt' | 'updatedAt' | 'invoiceDate' | 'dueDate'> {
    localId: string;
    id?: string;
    invoiceDate: number;
    dueDate?: number;
    createdAt: number;
    updatedAt: number;
}

export interface LocalInvoiceItem extends Omit<InvoiceItem, 'id' | 'supplier' | 'createdAt'> {
    localId: string;
    id?: string;
    invoiceLocalId: string;
    createdAt: number;
}

export interface LocalPayment extends Omit<Payment, 'id' | 'createdAt' | 'paymentDate'> {
    localId: string;
    id?: string;
    invoiceLocalId: string;
    paymentDate: number;
    createdAt: number;
}

export interface LocalSignedPhoto extends Omit<SignedPhoto, 'id' | 'capturedAt'> {
    localId: string;
    id?: string;
    invoiceLocalId: string;
    capturedAt: number;
    // Store base64 data for offline
    base64Data?: string;
}

export interface LocalQuotation extends Omit<Quotation, 'id' | 'customer' | 'items' | 'createdAt' | 'updatedAt' | 'quotationDate' | 'validUntil'> {
    localId: string;
    id?: string;
    quotationDate: number;
    validUntil?: number;
    createdAt: number;
    updatedAt: number;
}

export interface LocalQuotationItem extends Omit<QuotationItem, 'id' | 'createdAt'> {
    localId: string;
    id?: string;
    quotationLocalId: string;
    createdAt: number;
}

class MIPrintersDB extends Dexie {
    customers!: Table<LocalCustomer, string>;
    suppliers!: Table<LocalSupplier, string>;
    invoices!: Table<LocalInvoice, string>;
    invoiceItems!: Table<LocalInvoiceItem, string>;
    payments!: Table<LocalPayment, string>;
    signedPhotos!: Table<LocalSignedPhoto, string>;
    quotations!: Table<LocalQuotation, string>;
    quotationItems!: Table<LocalQuotationItem, string>;
    syncQueue!: Table<SyncQueueItem, number>;

    constructor() {
        super('MIPrintersDB');

        this.version(2).stores({
            customers: 'localId, id, name, company, phone, isActive, syncStatus, createdAt',
            suppliers: 'localId, id, name, phone, isActive, syncStatus, createdAt',
            invoices: 'localId, id, invoiceNumber, customerId, invoiceDate, paymentStatus, status, syncStatus, createdAt',
            invoiceItems: 'localId, id, invoiceLocalId, invoiceId, position',
            payments: 'localId, id, invoiceLocalId, invoiceId, paymentDate, syncStatus',
            signedPhotos: 'localId, id, invoiceLocalId',
            quotations: 'localId, id, quotationNumber, customerId, status, syncStatus, createdAt',
            quotationItems: 'localId, id, quotationLocalId, quotationId, position',
            syncQueue: '++id, entityType, entityLocalId, status, createdAt',
        });
    }
}

export const db = new MIPrintersDB();

// Helper to generate local IDs
export function generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
