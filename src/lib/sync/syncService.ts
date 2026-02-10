import { db, generateLocalId } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
    status: SyncStatus;
    lastSyncAt: number | null;
    pendingCount: number;
    error: string | null;
}

let syncState: SyncState = {
    status: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
};

let isInitialized = false;
let isPulling = false;

export function getSyncState(): SyncState {
    return { ...syncState };
}

// ============================================
// PULL FROM CLOUD - Fetch data from Supabase into IndexedDB
// Cloud is SOURCE OF TRUTH: local synced records not in cloud get removed
// ============================================
export async function pullFromCloud(): Promise<void> {
    if (isPulling) {
        console.log('Pull already in progress');
        return;
    }

    // Check if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('Offline - skipping cloud pull');
        return;
    }

    isPulling = true;
    console.log('Pulling data from cloud...');
    const supabase = createClient();

    try {
        // ---- CUSTOMERS ----
        const { data: cloudCustomers, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (customersError) {
            console.error('Failed to pull customers:', customersError.message);
        } else if (cloudCustomers) {
            console.log(`Pulled ${cloudCustomers.length} customers from cloud`);

            // Build a set of cloud IDs for reconciliation
            const cloudCustomerIds = new Set<string>();

            for (const cloudCust of cloudCustomers) {
                cloudCustomerIds.add(cloudCust.id);

                // Check if already exists locally by server ID or local_id
                const existingById = await db.customers.filter(c => c.id === cloudCust.id).first();
                const existingByLocalId = cloudCust.local_id
                    ? await db.customers.get(cloudCust.local_id)
                    : null;

                if (existingById || existingByLocalId) {
                    // Update existing with cloud data (if not pending local changes)
                    const existing = existingById || existingByLocalId;
                    if (existing && existing.syncStatus !== 'pending') {
                        await db.customers.update(existing.localId, {
                            id: cloudCust.id,
                            name: cloudCust.name,
                            company: cloudCust.company || undefined,
                            phone: cloudCust.phone || undefined,
                            email: cloudCust.email || undefined,
                            address: cloudCust.address || undefined,
                            city: cloudCust.city || undefined,
                            notes: cloudCust.notes || undefined,
                            stRegNo: cloudCust.st_reg_no || undefined,
                            ntnNo: cloudCust.ntn_no || undefined,
                            isActive: cloudCust.is_active,
                            additionalContacts: cloudCust.additional_contacts || [],
                            syncStatus: 'synced',
                            updatedAt: new Date(cloudCust.updated_at).getTime(),
                        });
                    }
                } else {
                    // Add new from cloud
                    const localId = cloudCust.local_id || generateLocalId();
                    await db.customers.add({
                        localId,
                        id: cloudCust.id,
                        name: cloudCust.name,
                        company: cloudCust.company || undefined,
                        phone: cloudCust.phone || undefined,
                        email: cloudCust.email || undefined,
                        address: cloudCust.address || undefined,
                        city: cloudCust.city || undefined,
                        notes: cloudCust.notes || undefined,
                        stRegNo: cloudCust.st_reg_no || undefined,
                        ntnNo: cloudCust.ntn_no || undefined,
                        isActive: cloudCust.is_active,
                        additionalContacts: cloudCust.additional_contacts || [],
                        syncStatus: 'synced',
                        createdAt: new Date(cloudCust.created_at).getTime(),
                        updatedAt: new Date(cloudCust.updated_at).getTime(),
                    });
                }
            }

            // Reconcile: remove local synced customers not in cloud
            const localCustomers = await db.customers.toArray();
            for (const local of localCustomers) {
                if (local.id && local.syncStatus === 'synced' && !cloudCustomerIds.has(local.id)) {
                    console.log(`Removing local customer not in cloud: ${local.name} (${local.id})`);
                    await db.customers.delete(local.localId);
                }
            }
        }

        // ---- INVOICES ----
        const { data: cloudInvoices, error: invoicesError } = await supabase
            .from('invoices')
            .select('*')
            .or('is_deleted.is.null,is_deleted.eq.false')
            .order('created_at', { ascending: false });

        if (invoicesError) {
            console.error('Failed to pull invoices:', invoicesError.message);
        } else if (cloudInvoices) {
            console.log(`Pulled ${cloudInvoices.length} invoices from cloud`);

            const cloudInvoiceIds = new Set<string>();

            for (const cloudInv of cloudInvoices) {
                cloudInvoiceIds.add(cloudInv.id);

                const existingById = await db.invoices.filter(i => i.id === cloudInv.id).first();
                const existingByLocalId = cloudInv.local_id
                    ? await db.invoices.get(cloudInv.local_id)
                    : null;

                if (existingById || existingByLocalId) {
                    const existing = existingById || existingByLocalId;
                    if (existing && existing.syncStatus !== 'pending') {
                        await db.invoices.update(existing.localId, {
                            id: cloudInv.id,
                            invoiceNumber: cloudInv.invoice_number,
                            invoiceType: cloudInv.invoice_type || 'A',
                            customerId: cloudInv.customer_id || undefined,
                            walkInCustomerName: cloudInv.walk_in_customer_name || undefined,
                            invoiceDate: new Date(cloudInv.invoice_date).getTime(),
                            dueDate: cloudInv.due_date ? new Date(cloudInv.due_date).getTime() : undefined,
                            subtotal: cloudInv.subtotal,
                            taxAmount: cloudInv.tax_amount,
                            totalAmount: cloudInv.total_amount,
                            designCharges: cloudInv.design_charges || 0,
                            deliveryCharges: cloudInv.delivery_charges || 0,
                            taxRate: cloudInv.tax_rate || 0,
                            otherCharges: cloudInv.other_charges || 0,
                            otherChargesLabel: cloudInv.other_charges_label || undefined,
                            totalCost: cloudInv.total_cost || 0,
                            margin: cloudInv.margin || 0,
                            marginPercentage: cloudInv.margin_percentage || 0,
                            paymentStatus: cloudInv.payment_status,
                            amountPaid: cloudInv.amount_paid || 0,
                            balanceDue: cloudInv.balance_due || 0,
                            notes: cloudInv.notes || undefined,
                            internalNotes: cloudInv.internal_notes || undefined,
                            status: cloudInv.status,
                            customColumns: cloudInv.custom_columns || [],
                            isDeleted: false,
                            syncStatus: 'synced',
                            updatedAt: new Date(cloudInv.updated_at).getTime(),
                        });
                    }
                } else {
                    const localId = cloudInv.local_id || generateLocalId();
                    await db.invoices.add({
                        localId,
                        id: cloudInv.id,
                        invoiceNumber: cloudInv.invoice_number,
                        invoiceType: cloudInv.invoice_type || 'A',
                        customerId: cloudInv.customer_id || undefined,
                        walkInCustomerName: cloudInv.walk_in_customer_name || undefined,
                        invoiceDate: new Date(cloudInv.invoice_date).getTime(),
                        dueDate: cloudInv.due_date ? new Date(cloudInv.due_date).getTime() : undefined,
                        subtotal: cloudInv.subtotal,
                        taxAmount: cloudInv.tax_amount,
                        totalAmount: cloudInv.total_amount,
                        designCharges: cloudInv.design_charges || 0,
                        deliveryCharges: cloudInv.delivery_charges || 0,
                        taxRate: cloudInv.tax_rate || 0,
                        otherCharges: cloudInv.other_charges || 0,
                        otherChargesLabel: cloudInv.other_charges_label || undefined,
                        totalCost: cloudInv.total_cost || 0,
                        margin: cloudInv.margin || 0,
                        marginPercentage: cloudInv.margin_percentage || 0,
                        paymentStatus: cloudInv.payment_status,
                        amountPaid: cloudInv.amount_paid || 0,
                        balanceDue: cloudInv.balance_due || 0,
                        notes: cloudInv.notes || undefined,
                        internalNotes: cloudInv.internal_notes || undefined,
                        status: cloudInv.status,
                        customColumns: cloudInv.custom_columns || [],
                        syncStatus: 'synced',
                        createdAt: new Date(cloudInv.created_at).getTime(),
                        updatedAt: new Date(cloudInv.updated_at).getTime(),
                    });

                    // Also pull invoice items for new invoices
                    const { data: cloudItems } = await supabase
                        .from('invoice_items')
                        .select('*')
                        .eq('invoice_id', cloudInv.id);

                    if (cloudItems) {
                        for (const item of cloudItems) {
                            const itemLocalId = item.local_id || generateLocalId();
                            const existingItem = await db.invoiceItems.get(itemLocalId);
                            if (!existingItem) {
                                await db.invoiceItems.add({
                                    localId: itemLocalId,
                                    id: item.id,
                                    invoiceLocalId: localId,
                                    invoiceId: cloudInv.id,
                                    position: item.position,
                                    description: item.description,
                                    specifications: item.specifications || undefined,
                                    quantity: item.quantity,
                                    unit: item.unit || 'pcs',
                                    rate: item.rate,
                                    amount: item.amount,
                                    cost: item.cost || 0,
                                    itemMargin: item.item_margin || 0,
                                    supplierId: item.supplier_id || undefined,
                                    customValues: item.custom_values || {},
                                    // Type B fields
                                    weight: item.weight || undefined,
                                    valueExclTax: item.value_excl_tax || undefined,
                                    salesTaxPercent: item.sales_tax_percent || undefined,
                                    totalSalesTax: item.total_sales_tax || undefined,
                                    valueInclTax: item.value_incl_tax || undefined,
                                    createdAt: Date.now(),
                                });
                            }
                        }
                    }
                }
            }

            // Reconcile: remove local synced invoices not in cloud
            const localInvoices = await db.invoices.toArray();
            for (const local of localInvoices) {
                if (local.id && local.syncStatus === 'synced' && !cloudInvoiceIds.has(local.id)) {
                    console.log(`Removing local invoice not in cloud: ${local.invoiceNumber} (${local.id})`);
                    // Also remove associated invoice items
                    await db.invoiceItems.where('invoiceLocalId').equals(local.localId).delete();
                    await db.invoices.delete(local.localId);
                }
            }
        }

        // ---- SUPPLIERS ----
        const { data: cloudSuppliers, error: suppliersError } = await supabase
            .from('suppliers')
            .select('*')
            .order('created_at', { ascending: false });

        if (suppliersError) {
            console.error('Failed to pull suppliers:', suppliersError.message);
        } else if (cloudSuppliers) {
            console.log(`Pulled ${cloudSuppliers.length} suppliers from cloud`);

            const cloudSupplierIds = new Set<string>();

            for (const cloudSup of cloudSuppliers) {
                cloudSupplierIds.add(cloudSup.id);

                const existingById = await db.suppliers.filter(s => s.id === cloudSup.id).first();
                const existingByLocalId = cloudSup.local_id
                    ? await db.suppliers.get(cloudSup.local_id)
                    : null;

                if (existingById || existingByLocalId) {
                    const existing = existingById || existingByLocalId;
                    if (existing && existing.syncStatus !== 'pending') {
                        await db.suppliers.update(existing.localId, {
                            id: cloudSup.id,
                            name: cloudSup.name,
                            phone: cloudSup.phone || undefined,
                            supplierType: cloudSup.supplier_type || 'other',
                            notes: cloudSup.notes || undefined,
                            isActive: cloudSup.is_active,
                            syncStatus: 'synced',
                            updatedAt: new Date(cloudSup.updated_at).getTime(),
                        });
                    }
                } else {
                    const localId = cloudSup.local_id || generateLocalId();
                    await db.suppliers.add({
                        localId,
                        id: cloudSup.id,
                        name: cloudSup.name,
                        phone: cloudSup.phone || undefined,
                        supplierType: cloudSup.supplier_type || 'other',
                        notes: cloudSup.notes || undefined,
                        isActive: cloudSup.is_active,
                        syncStatus: 'synced',
                        createdAt: new Date(cloudSup.created_at).getTime(),
                        updatedAt: new Date(cloudSup.updated_at).getTime(),
                    });
                }
            }

            // Reconcile: remove local synced suppliers not in cloud
            const localSuppliers = await db.suppliers.toArray();
            for (const local of localSuppliers) {
                if (local.id && local.syncStatus === 'synced' && !cloudSupplierIds.has(local.id)) {
                    console.log(`Removing local supplier not in cloud: ${local.name} (${local.id})`);
                    await db.suppliers.delete(local.localId);
                }
            }
        }

        // ---- PAYMENTS ----
        const { data: cloudPayments, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .order('payment_date', { ascending: false });

        if (paymentsError) {
            console.error('Failed to pull payments:', paymentsError.message);
        } else if (cloudPayments) {
            const cloudPaymentIds = new Set<string>();

            for (const cloudPay of cloudPayments) {
                cloudPaymentIds.add(cloudPay.id);

                const existingById = await db.payments.filter(p => p.id === cloudPay.id).first();
                const existingByLocalId = cloudPay.local_id
                    ? await db.payments.get(cloudPay.local_id)
                    : null;

                // Find the correct local invoice using the cloud UUID
                let targetInvoiceLocalId: string | undefined = undefined;

                if (cloudPay.invoice_id) {
                    const linkedInvoice = await db.invoices.filter(i => i.id === cloudPay.invoice_id).first();
                    if (linkedInvoice) {
                        targetInvoiceLocalId = linkedInvoice.localId;
                    } else {
                        continue; // Skip this payment if its invoice isn't synced yet
                    }
                } else {
                    continue;
                }

                if (existingById || existingByLocalId) {
                    const existing = existingById || existingByLocalId;
                    if (existing && existing.syncStatus !== 'pending') {
                        await db.payments.update(existing.localId, {
                            id: cloudPay.id,
                            invoiceId: cloudPay.invoice_id,
                            invoiceLocalId: targetInvoiceLocalId,
                            amount: cloudPay.amount,
                            paymentDate: new Date(cloudPay.payment_date).getTime(),
                            paymentMethod: cloudPay.payment_method,
                            referenceNumber: cloudPay.reference_number || undefined,
                            notes: cloudPay.notes || undefined,
                            syncStatus: 'synced',
                        });
                    }
                } else {
                    const localId = cloudPay.local_id || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    await db.payments.add({
                        localId,
                        id: cloudPay.id,
                        invoiceId: cloudPay.invoice_id,
                        invoiceLocalId: targetInvoiceLocalId,
                        amount: cloudPay.amount,
                        paymentDate: new Date(cloudPay.payment_date).getTime(),
                        paymentMethod: cloudPay.payment_method,
                        referenceNumber: cloudPay.reference_number || undefined,
                        notes: cloudPay.notes || undefined,
                        syncStatus: 'synced',
                        createdAt: new Date(cloudPay.created_at).getTime(),
                    });
                }
            }

            // Reconcile: remove local synced payments not in cloud
            const localPayments = await db.payments.toArray();
            for (const local of localPayments) {
                if (local.id && local.syncStatus === 'synced' && !cloudPaymentIds.has(local.id)) {
                    console.log(`Removing local payment not in cloud: ${local.localId} (${local.id})`);
                    await db.payments.delete(local.localId);
                }
            }
        }

        isPulling = false;
    } catch (error) {
        console.error('Failed to pull from cloud:', error);
        isPulling = false;
    }
}

// ============================================
// PUSH TO CLOUD - Upload local changes to Supabase
// ============================================
async function syncCustomers() {
    const supabase = createClient();
    const pendingCustomers = await db.customers
        .filter(c => c.syncStatus === 'pending')
        .toArray();

    console.log(`Syncing ${pendingCustomers.length} pending customers...`);

    for (const customer of pendingCustomers) {
        try {
            const { data, error } = await supabase.rpc('sync_customer', {
                p_local_id: customer.localId,
                p_name: customer.name,
                p_company: customer.company || null,
                p_phone: customer.phone || null,
                p_email: customer.email || null,
                p_address: customer.address || null,
                p_city: customer.city || null,
                p_notes: customer.notes || null,
                p_st_reg_no: customer.stRegNo || null,
                p_ntn_no: customer.ntnNo || null,
                p_is_active: customer.isActive !== false,
                p_additional_contacts: customer.additionalContacts || [],
            });

            if (error) {
                console.error('Sync customer error:', error.message);
                continue;
            }

            await db.customers.update(customer.localId, {
                id: data,
                syncStatus: 'synced',
            });

            console.log(`Synced customer: ${customer.name}`);
        } catch (err) {
            console.error('Failed to sync customer:', customer.localId, err);
        }
    }
}

async function syncInvoices() {
    const supabase = createClient();
    const pendingInvoices = await db.invoices
        .filter(i => i.syncStatus === 'pending')
        .toArray();

    console.log(`Syncing ${pendingInvoices.length} pending invoices...`);

    for (const invoice of pendingInvoices) {
        console.log(`[Sync Invoice] ${invoice.invoiceNumber} - isDeleted: ${invoice.isDeleted}, localId: ${invoice.localId}`);
        try {
            let customerId = null;
            if (invoice.customerId) {
                const customer = await db.customers.get(invoice.customerId);
                if (customer?.id) {
                    customerId = customer.id;
                }
            }

            const { data, error } = await supabase.rpc('sync_invoice', {
                p_local_id: invoice.localId,
                p_invoice_number: invoice.invoiceNumber,
                p_invoice_type: invoice.invoiceType || 'A',
                p_customer_id: customerId,
                p_walk_in_customer_name: invoice.walkInCustomerName || null,
                p_invoice_date: new Date(invoice.invoiceDate).toISOString().split('T')[0],
                p_due_date: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : null,
                p_subtotal: invoice.subtotal || 0,
                p_tax_amount: invoice.taxAmount || 0,
                p_total_amount: invoice.totalAmount || 0,
                p_design_charges: invoice.designCharges || 0,
                p_delivery_charges: invoice.deliveryCharges || 0,
                p_tax_rate: invoice.taxRate || 0,
                p_other_charges: invoice.otherCharges || 0,
                p_other_charges_label: invoice.otherChargesLabel || null,
                p_total_cost: invoice.totalCost || 0,
                p_margin: invoice.margin || 0,
                p_margin_percentage: invoice.marginPercentage || 0,
                p_payment_status: invoice.paymentStatus || 'unpaid',
                p_amount_paid: invoice.amountPaid || 0,
                p_balance_due: invoice.balanceDue || 0,
                p_notes: invoice.notes || null,
                p_internal_notes: invoice.internalNotes || null,
                p_status: invoice.status || 'final',
                p_custom_columns: invoice.customColumns || [],
                p_is_deleted: invoice.isDeleted || false,
            });

            if (error) {
                console.error('Sync invoice error:', error.message);
                continue;
            }

            console.log(`[Sync Invoice] SUCCESS - ${invoice.invoiceNumber}, isDeleted: ${invoice.isDeleted}, cloud id: ${data}`);

            await db.invoices.update(invoice.localId, {
                id: data,
                syncStatus: 'synced',
            });

            // Sync invoice items
            const items = await db.invoiceItems
                .where('invoiceLocalId')
                .equals(invoice.localId)
                .toArray();

            if (items.length > 0 && data) {
                await supabase.from('invoice_items').delete().eq('invoice_id', data);

                const itemPayloads = items.map(item => ({
                    invoice_id: data,
                    position: item.position,
                    description: item.description,
                    specifications: item.specifications,
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: item.rate,
                    amount: item.amount,
                    cost: item.cost || 0,
                    item_margin: item.itemMargin || 0,
                    supplier_id: null,
                    local_id: item.localId,
                    custom_values: item.customValues || {},
                    // Type B fields
                    weight: item.weight || null,
                    value_excl_tax: item.valueExclTax || null,
                    sales_tax_percent: item.salesTaxPercent || null,
                    total_sales_tax: item.totalSalesTax || null,
                    value_incl_tax: item.valueInclTax || null,
                }));

                const { error: itemsError } = await supabase
                    .from('invoice_items')
                    .insert(itemPayloads);

                if (itemsError) {
                    console.error('Failed to sync invoice items:', itemsError.message);
                }
            }

            console.log(`Synced invoice: ${invoice.invoiceNumber}`);
        } catch (err) {
            console.error('Failed to sync invoice:', invoice.localId, err);
        }
    }
}


async function syncSuppliers() {
    const supabase = createClient();
    const pendingSuppliers = await db.suppliers
        .filter(s => s.syncStatus === 'pending')
        .toArray();

    console.log(`Syncing ${pendingSuppliers.length} pending suppliers...`);

    for (const supplier of pendingSuppliers) {
        try {
            const { data, error } = await supabase.rpc('sync_supplier', {
                p_local_id: supplier.localId,
                p_name: supplier.name,
                p_phone: supplier.phone || null,
                p_supplier_type: supplier.supplierType || 'other',
                p_notes: supplier.notes || null,
                p_is_active: supplier.isActive !== false,
            });

            if (error) {
                console.error('Sync supplier error:', error.message);
                continue;
            }

            await db.suppliers.update(supplier.localId, {
                id: data,
                syncStatus: 'synced',
            });

            console.log(`Synced supplier: ${supplier.name}`);
        } catch (err) {
            console.error('Failed to sync supplier:', supplier.localId, err);
        }
    }
}

async function syncPayments() {
    const supabase = createClient();
    const pendingPayments = await db.payments
        .filter(p => p.syncStatus === 'pending')
        .toArray();

    if (pendingPayments.length > 0) {
        console.log(`Syncing ${pendingPayments.length} pending payments...`);

        for (const payment of pendingPayments) {
            try {
                const { data, error } = await supabase.rpc('sync_payment', {
                    p_local_id: payment.localId,
                    p_invoice_local_id: payment.invoiceLocalId,
                    p_amount: payment.amount,
                    p_payment_date: new Date(payment.paymentDate).toISOString(),
                    p_payment_method: payment.paymentMethod,
                    p_reference_number: payment.referenceNumber || null,
                    p_notes: payment.notes || null,
                    p_invoice_id: payment.invoiceId || null, // Pass UUID if available
                });

                if (error) {
                    console.error('Sync payment error:', error.message);
                    continue;
                }

                await db.payments.update(payment.localId, {
                    id: data,
                    syncStatus: 'synced',
                });

                console.log(`Synced payment: ${payment.localId}`);
            } catch (err) {
                console.error('Failed to sync payment:', payment.localId, err);
            }
        }
    }
}

// Main sync function - both pull and push
export async function runSync(): Promise<void> {
    if (syncState.status === 'syncing') {
        console.log('Sync already in progress');
        return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('Offline - skipping sync');
        return;
    }

    syncState = { ...syncState, status: 'syncing', error: null };

    try {
        // First pull from cloud (ensures device has latest data)
        await pullFromCloud();

        // Then push local changes to cloud
        await syncCustomers();
        await syncSuppliers();
        await syncInvoices();
        await syncPayments();

        syncState = {
            status: 'idle',
            lastSyncAt: Date.now(),
            pendingCount: 0,
            error: null,
        };

        console.log('Sync completed successfully');
    } catch (error) {
        console.error('Sync failed:', error);
        syncState = {
            ...syncState,
            status: 'error',
            error: error instanceof Error ? error.message : 'Sync failed',
        };
    }
}

// Auto-sync when online
export function initializeAutoSync() {
    if (typeof window === 'undefined') return;
    if (isInitialized) return;
    isInitialized = true;

    window.addEventListener('online', () => {
        console.log('Back online - triggering sync');
        runSync();
    });

    // Initial sync after 2 seconds (faster for mobile)
    if (navigator.onLine) {
        setTimeout(runSync, 2000);
    }

    // Periodic sync every 5 minutes
    setInterval(() => {
        if (navigator.onLine) {
            runSync();
        }
    }, 5 * 60 * 1000);
}
