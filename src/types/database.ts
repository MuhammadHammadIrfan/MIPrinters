// Database types for MI Printers

// =====================
// CUSTOMER
// =====================
export interface Customer {
    id: string;
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Offline sync
    localId?: string;
    syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface CustomerInput {
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    notes?: string;
}

// =====================
// SUPPLIER (Optional)
// =====================
export interface Supplier {
    id: string;
    name: string;
    phone?: string;
    supplierType?: 'offset' | 'digital' | 'binding' | 'flexo' | 'screen' | 'other';
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    localId?: string;
    syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface SupplierInput {
    name: string;
    phone?: string;
    supplierType?: 'offset' | 'digital' | 'binding' | 'flexo' | 'screen' | 'other';
    notes?: string;
}

// =====================
// INVOICE
// =====================
export interface Invoice {
    id: string;
    customerId?: string;
    customer?: Customer;

    // Walk-in customer details (when no registered customer)
    walkInCustomerName?: string;
    walkInCustomerPhone?: string;
    walkInCustomerAddress?: string;

    invoiceNumber: string;
    invoiceDate: Date;
    dueDate?: Date;

    // Customer-facing amounts
    subtotal: number;
    taxAmount: number;
    totalAmount: number;

    // Additional charges (only shown if > 0)
    designCharges: number;
    deliveryCharges: number;
    taxRate: number;
    otherCharges: number;
    otherChargesLabel?: string;

    // INTERNAL ONLY - never on PDF
    totalCost: number;
    margin: number;
    marginPercentage: number;

    // Payment
    paymentStatus: 'unpaid' | 'partial' | 'paid';
    amountPaid: number;
    balanceDue: number;

    // Notes
    notes?: string;
    internalNotes?: string;
    status: 'draft' | 'final' | 'void';

    // Signed photos (multiple allowed)
    signedPhotos: SignedPhoto[];

    // Items
    items: InvoiceItem[];
    payments: Payment[];

    // Sync
    localId?: string;
    syncStatus: 'synced' | 'pending' | 'conflict';
    createdAt: Date;
    updatedAt: Date;
}

export interface SignedPhoto {
    id: string;
    url: string;
    capturedAt: Date;
    localId?: string;
}

export interface InvoiceItem {
    id: string;
    invoiceId: string;
    supplierId?: string;
    supplier?: Supplier;
    position: number;
    description: string;
    specifications?: string;
    quantity: number;
    unit: string;
    rate: number; // Customer-facing
    amount: number; // qty × rate

    // INTERNAL - never on PDF
    cost: number;
    itemMargin: number;

    localId?: string;
    createdAt: Date;
}

export interface InvoiceItemInput {
    description: string;
    specifications?: string;
    quantity: number;
    unit?: string;
    rate: number;
    cost?: number; // Internal
    supplierId?: string;
}

export interface InvoiceInput {
    customerId?: string;
    invoiceDate?: Date;
    dueDate?: Date;
    items: InvoiceItemInput[];
    designCharges?: number;
    deliveryCharges?: number;
    taxRate?: number;
    otherCharges?: number;
    otherChargesLabel?: string;
    notes?: string;
    internalNotes?: string;
}

// =====================
// PAYMENT
// =====================
export interface Payment {
    id: string;
    invoiceId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: 'cash' | 'bank' | 'cheque' | 'jazzcash' | 'easypaisa' | 'other';
    referenceNumber?: string;
    notes?: string;
    localId?: string;
    syncStatus: 'synced' | 'pending' | 'conflict';
    createdAt: Date;
}

export interface PaymentInput {
    invoiceId: string;
    amount: number;
    paymentDate?: Date;
    paymentMethod?: 'cash' | 'bank' | 'cheque' | 'jazzcash' | 'easypaisa' | 'other';
    referenceNumber?: string;
    notes?: string;
}

// =====================
// QUOTATION (Optional)
// =====================
export interface Quotation {
    id: string;
    customerId?: string;
    customer?: Customer;
    quotationNumber: string;
    quotationDate: Date;
    validUntil?: Date;
    subtotal: number;
    totalAmount: number;
    notes?: string;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
    convertedInvoiceId?: string;
    items: QuotationItem[];
    localId?: string;
    syncStatus: 'synced' | 'pending' | 'conflict';
    createdAt: Date;
    updatedAt: Date;
}

export interface QuotationItem {
    id: string;
    quotationId: string;
    position: number;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    localId?: string;
    createdAt: Date;
}

// =====================
// OWNER PROFILE
// =====================
export interface OwnerProfile {
    id: string;
    email: string;
    businessName: string;
    phone?: string;
    address?: string;
    logoUrl?: string;
    invoicePrefix: string;
    nextInvoiceNumber: number;
    quotationPrefix: string;
    nextQuotationNumber: number;
    defaultPaymentTerms: number;
    bankDetails?: string;
    createdAt: Date;
    updatedAt: Date;
}

// =====================
// SYNC QUEUE
// =====================
export interface SyncQueueItem {
    id?: number;
    entityType: 'customer' | 'supplier' | 'invoice' | 'quotation' | 'payment';
    entityLocalId: string;
    operation: 'create' | 'update' | 'delete';
    payload: unknown;
    retryCount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    createdAt: number;
    processedAt?: number;
}

// =====================
// DASHBOARD
// =====================
export interface DashboardSummary {
    todaySales: number;
    todayInvoices: number;
    pendingAmount: number;
    pendingInvoices: number;
    totalProfit: number;
    recentInvoices: Invoice[];
}
