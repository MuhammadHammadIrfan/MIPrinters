'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { db, type LocalInvoice, type LocalInvoiceItem } from '@/lib/db';
import { useCustomerStore } from '@/stores/customerStore';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { runSync } from '@/lib/sync/syncService';

function StatusBadge({ status }: { status: string }) {
    const classes = {
        paid: 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold',
        unpaid: 'bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold',
        partial: 'bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-semibold',
    }[status] || 'bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold';

    return <span className={classes}>{status.toUpperCase()}</span>;
}

// Payment Modal Component
function PaymentModal({
    isOpen,
    onClose,
    invoice,
    onPaymentRecorded,
}: {
    isOpen: boolean;
    onClose: () => void;
    invoice: LocalInvoice;
    onPaymentRecorded: () => void;
}) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<'cash' | 'bank' | 'other'>('cash');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = Date.now();
            const newAmountPaid = invoice.amountPaid + paymentAmount;
            const newBalanceDue = invoice.totalAmount - newAmountPaid;
            const newPaymentStatus = newBalanceDue <= 0 ? 'paid' : (newAmountPaid > 0 ? 'partial' : 'unpaid');

            // Update invoice in local DB
            await db.invoices.update(invoice.localId, {
                amountPaid: newAmountPaid,
                balanceDue: Math.max(0, newBalanceDue),
                paymentStatus: newPaymentStatus,
                syncStatus: 'pending',
                updatedAt: now,
            });

            // Add payment record
            await db.payments.add({
                localId: `pay_${now}_${Math.random().toString(36).substr(2, 9)}`,
                invoiceId: invoice.id || '', // Server ID (may be empty if not synced)
                invoiceLocalId: invoice.localId,
                amount: paymentAmount,
                paymentMethod: method,
                paymentDate: now,
                notes: notes || undefined,
                syncStatus: 'pending',
                createdAt: now,
            });

            // Trigger sync
            runSync();

            onPaymentRecorded();
            onClose();
        } catch (error) {
            console.error('Failed to record payment:', error);
            alert('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm bg-white rounded-xl shadow-xl">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-gray-900">💰 Record Payment</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Amount:</span>
                            <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Already Paid:</span>
                            <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                            <span className="text-red-600">Balance Due:</span>
                            <span className="text-red-600">{formatCurrency(invoice.balanceDue)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={invoice.balanceDue.toString()}
                            step="0.01"
                            min="0"
                            max={invoice.balanceDue}
                            className="input"
                            required
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(invoice.balanceDue.toString())}
                            className="mt-1 text-xs text-green-600 hover:underline"
                        >
                            Pay full balance ({formatCurrency(invoice.balanceDue)})
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <div className="flex gap-2">
                            {(['cash', 'bank', 'other'] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMethod(m)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors capitalize
                    ${method === m
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {m === 'cash' ? '💵' : m === 'bank' ? '🏦' : '📋'} {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Payment reference..."
                            className="input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn-primary"
                    >
                        {isSubmitting ? 'Recording...' : 'Record Payment'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;
    const hasLoadedRef = useRef(false);

    const [invoice, setInvoice] = useState<LocalInvoice | null>(null);
    const [items, setItems] = useState<LocalInvoiceItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const customers = useCustomerStore((state) => state.customers);
    const loadCustomers = useCustomerStore((state) => state.loadCustomers);
    const customersInitialized = useCustomerStore((state) => state.isInitialized);

    // Load customers once
    useEffect(() => {
        if (!customersInitialized) {
            loadCustomers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load invoice
    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        const loadInvoice = async () => {
            setIsLoading(true);
            try {
                const inv = await db.invoices.get(invoiceId);
                if (inv) {
                    setInvoice(inv);
                    const invItems = await db.invoiceItems.where('invoiceLocalId').equals(invoiceId).toArray();
                    setItems(invItems.sort((a, b) => a.position - b.position));
                }
            } catch (error) {
                console.error('Failed to load invoice:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (invoiceId) {
            loadInvoice();
        }
    }, [invoiceId]);

    // Get customer name
    useEffect(() => {
        if (invoice?.customerId && customers.length > 0) {
            // Check both localId and server id for match
            const customer = customers.find(c => c.localId === invoice.customerId || c.id === invoice.customerId);
            if (customer) {
                setCustomerName(customer.company ? `${customer.name} (${customer.company})` : customer.name);
            }
        } else if (invoice?.walkInCustomerName) {
            // Use walk-in customer name if no registered customer
            setCustomerName(invoice.walkInCustomerName);
        }
    }, [invoice, customers]);

    const reloadInvoice = async () => {
        const inv = await db.invoices.get(invoiceId);
        if (inv) {
            setInvoice(inv);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this invoice?')) return;

        try {
            await db.invoices.delete(invoiceId);
            await db.invoiceItems.where('invoiceLocalId').equals(invoiceId).delete();
            router.push('/invoices');
        } catch (error) {
            console.error('Failed to delete invoice:', error);
            alert('Failed to delete invoice');
        }
    };

    const handleGeneratePDF = async () => {
        if (!invoice) return;

        setIsGeneratingPDF(true);
        try {
            // Load settings
            const savedSettings = localStorage.getItem('miprinters_settings');
            const settings = savedSettings ? JSON.parse(savedSettings) : {
                businessName: 'MI Printers',
                phone: '',
                email: '',
                address: '',
                bankName: '',
                accountTitle: '',
                accountNumber: '',
                iban: '',
            };

            // Generate PDF by opening a new window with print-friendly view
            const pdfWindow = window.open('', '_blank');
            if (!pdfWindow) {
                alert('Please allow popups to generate PDF');
                return;
            }

            const itemsHtml = items.map((item, i) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${i + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.rate.toLocaleString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">Rs. ${item.amount.toLocaleString()}</td>
        </tr>
      `).join('');

            pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
            .business-info { font-size: 12px; color: #666; margin-top: 4px; line-height: 1.4; }
            .invoice-title { font-size: 28px; color: #666; }
            .invoice-number { font-size: 18px; color: #16a34a; font-weight: bold; }
            .section { margin-bottom: 20px; }
            .label { color: #666; font-size: 12px; }
            .value { font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 12px; }
            .totals { text-align: right; }
            .totals td { padding: 4px 0; }
            .grand-total { font-size: 18px; font-weight: bold; color: #16a34a; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">${settings.businessName}</div>
              <div class="business-info">
                ${settings.address ? `<div>${settings.address}</div>` : ''}
                ${settings.phone ? `<div>Phone: ${settings.phone}</div>` : ''}
                ${settings.email ? `<div>Email: ${settings.email}</div>` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">${invoice.invoiceNumber}</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div class="section">
              <div class="label">Bill To</div>
              <div class="value" style="font-size: 16px;">${customerName}</div>
            </div>
            <div class="section" style="text-align: right;">
              <div><span class="label">Date:</span> ${formatDate(new Date(invoice.invoiceDate))}</div>
              ${invoice.dueDate ? `<div><span class="label">Due:</span> ${formatDate(new Date(invoice.dueDate))}</div>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Description</th>
                <th style="width: 80px; text-align: right;">Qty</th>
                <th style="width: 100px; text-align: right;">Rate</th>
                <th style="width: 120px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <table style="width: 250px;" class="totals">
              <tr><td>Subtotal:</td><td>Rs. ${invoice.subtotal.toLocaleString()}</td></tr>
              ${invoice.designCharges > 0 ? `<tr><td>Design:</td><td>Rs. ${invoice.designCharges.toLocaleString()}</td></tr>` : ''}
              ${invoice.deliveryCharges > 0 ? `<tr><td>Delivery:</td><td>Rs. ${invoice.deliveryCharges.toLocaleString()}</td></tr>` : ''}
              ${invoice.taxAmount > 0 ? `<tr><td>Tax (${invoice.taxRate}%):</td><td>Rs. ${invoice.taxAmount.toLocaleString()}</td></tr>` : ''}
              <tr style="border-top: 2px solid #16a34a;">
                <td class="grand-total" style="padding-top: 8px;">Total:</td>
                <td class="grand-total" style="padding-top: 8px;">Rs. ${invoice.totalAmount.toLocaleString()}</td>
              </tr>
              ${invoice.amountPaid > 0 ? `<tr><td style="color: #16a34a;">Paid:</td><td style="color: #16a34a;">Rs. ${invoice.amountPaid.toLocaleString()}</td></tr>` : ''}
              ${invoice.balanceDue > 0 ? `<tr><td style="color: #dc2626; font-weight: bold;">Balance:</td><td style="color: #dc2626; font-weight: bold;">Rs. ${invoice.balanceDue.toLocaleString()}</td></tr>` : ''}
            </table>
          </div>

          ${invoice.notes ? `<div class="footer"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

          <div class="footer">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <strong>Payment Info:</strong><br>
                ${settings.bankName ? `Bank: ${settings.bankName}<br>` : ''}
                ${settings.accountTitle ? `Title: ${settings.accountTitle}<br>` : ''}
                ${settings.accountNumber ? `Account: ${settings.accountNumber}<br>` : ''}
                ${settings.iban ? `IBAN: ${settings.iban}` : ''}
                ${!settings.bankName && !settings.accountNumber ? 'Cash payment accepted.' : ''}
              </div>
              <div style="text-align: right;">
                Thank you for your business!
              </div>
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
            pdfWindow.document.close();
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (isLoading) {
        return (
            <>
                <Header title="Invoice" />
                <div className="flex items-center justify-center py-20">
                    <div className="text-4xl animate-spin">⏳</div>
                </div>
            </>
        );
    }

    if (!invoice) {
        return (
            <>
                <Header title="Invoice" />
                <div className="p-4 text-center py-20">
                    <span className="text-4xl mb-4 block">📄</span>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice not found</h2>
                    <Link href="/invoices" className="btn-primary mt-4">
                        Back to Invoices
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title={invoice.invoiceNumber}
                subtitle={invoice.status === 'draft' ? 'Draft' : undefined}
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={handleGeneratePDF}
                            disabled={isGeneratingPDF}
                            className="btn-secondary text-sm"
                        >
                            {isGeneratingPDF ? '⏳' : '📄'} PDF
                        </button>
                        <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700">
                            🗑️
                        </button>
                    </div>
                }
            />

            {/* Add pb-40 for mobile to account for bottom nav (64px) + action bar (80px) */}
            <div className="p-4 lg:p-6 pb-40 lg:pb-32">
                {/* Header Info */}
                <div className="card mb-4">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-500">Customer</p>
                            <p className="font-semibold text-gray-900">{customerName}</p>
                        </div>
                        <div className="text-right">
                            <StatusBadge status={invoice.paymentStatus} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                        <div>
                            <p className="text-gray-500">Invoice Date</p>
                            <p className="font-medium">{formatDate(new Date(invoice.invoiceDate))}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Due Date</p>
                            <p className="font-medium">{invoice.dueDate ? formatDate(new Date(invoice.dueDate)) : '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Total</p>
                            <p className="font-bold text-green-600">{formatCurrency(invoice.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Balance</p>
                            <p className={`font-medium ${invoice.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(invoice.balanceDue)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="card mb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={item.localId} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{index + 1}.</span>
                                        <span className="font-medium text-gray-900">{item.description}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 ml-4">
                                        {item.quantity} × {formatCurrency(item.rate)}
                                    </p>
                                </div>
                                <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary */}
                <div className="card mb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        {invoice.designCharges > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Design Charges</span>
                                <span>{formatCurrency(invoice.designCharges)}</span>
                            </div>
                        )}
                        {invoice.deliveryCharges > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Delivery</span>
                                <span>{formatCurrency(invoice.deliveryCharges)}</span>
                            </div>
                        )}
                        {invoice.taxAmount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tax ({invoice.taxRate}%)</span>
                                <span>{formatCurrency(invoice.taxAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t font-bold">
                            <span>Total</span>
                            <span className="text-green-600">{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Amount Paid</span>
                            <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                            <span className={invoice.balanceDue > 0 ? 'text-red-600' : 'text-gray-500'}>
                                Balance Due
                            </span>
                            <span className={invoice.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatCurrency(invoice.balanceDue)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Internal Info (Owner only) */}
                <div className="card bg-gray-50 border-dashed">
                    <h3 className="font-semibold text-gray-700 mb-3">🔒 Internal Info</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Total Cost</p>
                            <p className="font-medium">{formatCurrency(invoice.totalCost)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Margin</p>
                            <p className={`font-medium ${invoice.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(invoice.margin)} ({invoice.marginPercentage.toFixed(1)}%)
                            </p>
                        </div>
                    </div>
                    {invoice.internalNotes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Internal Notes</p>
                            <p className="text-sm text-gray-700">{invoice.internalNotes}</p>
                        </div>
                    )}
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="card mt-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                )}

                {/* Sync Status */}
                {invoice.syncStatus === 'pending' && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                        <span>⏳</span>
                        This invoice is pending sync to the cloud
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:left-64 z-20">
                <div className="flex gap-3 max-w-4xl mx-auto">
                    {invoice.paymentStatus !== 'paid' && (
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="btn-primary flex-1"
                        >
                            💰 Record Payment
                        </button>
                    )}
                    <Link href="/invoices/new" className="btn-secondary flex-1 text-center">
                        ➕ New Invoice
                    </Link>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                invoice={invoice}
                onPaymentRecorded={reloadInvoice}
            />
        </>
    );
}
