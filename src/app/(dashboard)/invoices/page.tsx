'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useInvoiceStore } from '@/stores/invoiceStore';

function StatusBadge({ status }: { status: string }) {
    const classes = {
        paid: 'badge-paid',
        unpaid: 'badge-unpaid',
        partial: 'badge-partial',
    }[status] || 'badge-unpaid';

    return <span className={classes}>{status.toUpperCase()}</span>;
}

export default function InvoicesPage() {
    // Use ref to track if we've already attempted loading
    const hasAttemptedLoad = useRef(false);

    const invoices = useInvoiceStore((state) => state.invoices);
    const isLoading = useInvoiceStore((state) => state.isLoading);
    const isInitialized = useInvoiceStore((state) => state.isInitialized);
    const error = useInvoiceStore((state) => state.error);
    const filterStatus = useInvoiceStore((state) => state.filterStatus);
    const loadInvoices = useInvoiceStore((state) => state.loadInvoices);
    const setFilterStatus = useInvoiceStore((state) => state.setFilterStatus);
    const getFilteredInvoices = useInvoiceStore((state) => state.getFilteredInvoices);

    // Load only once on mount - use ref to prevent double-loading on mobile
    useEffect(() => {
        if (hasAttemptedLoad.current) return;
        hasAttemptedLoad.current = true;

        if (!isInitialized) {
            loadInvoices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredInvoices = getFilteredInvoices();
    const filters: Array<'all' | 'unpaid' | 'partial' | 'paid' | 'draft'> = ['all', 'unpaid', 'partial', 'paid', 'draft'];

    return (
        <>
            <Header
                title="Invoices"
                subtitle={`${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''}`}
                actions={
                    <Link href="/invoices/new" className="btn-primary flex items-center gap-2">
                        <span>➕</span>
                        <span className="hidden sm:inline">New</span>
                    </Link>
                }
            />

            <div className="p-4 lg:p-6">
                {/* Filter tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setFilterStatus(filter)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize
                ${filterStatus === filter
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-green-50 border border-gray-200'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !isInitialized && (
                    <div className="text-center py-12">
                        <div className="animate-spin text-4xl mb-2">⏳</div>
                        <p className="text-gray-500">Loading invoices...</p>
                    </div>
                )}

                {/* Empty State */}
                {isInitialized && !isLoading && filteredInvoices.length === 0 && (
                    <div className="card text-center py-12">
                        <span className="text-4xl mb-4 block">📄</span>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {filterStatus === 'all' ? 'No invoices yet' : `No ${filterStatus} invoices`}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {filterStatus === 'all'
                                ? 'Create your first invoice to get started.'
                                : 'Try changing the filter to see other invoices.'}
                        </p>
                        {filterStatus === 'all' && (
                            <Link href="/invoices/new" className="btn-primary">
                                ➕ Create Invoice
                            </Link>
                        )}
                    </div>
                )}

                {/* Invoice list */}
                {isInitialized && filteredInvoices.length > 0 && (
                    <div className="space-y-3">
                        {filteredInvoices.map((invoice) => {
                            // Determine customer display name
                            const isWalkIn = !invoice.customerName;
                            const customerDisplay = invoice.customerName
                                || (invoice.walkInCustomerName ? `${invoice.walkInCustomerName} (Walk-in)` : 'Walk-in Customer');

                            return (
                                <Link
                                    key={invoice.localId}
                                    href={`/invoices/${invoice.localId}`}
                                    className="card block hover:border-green-500 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-green-600">{invoice.invoiceNumber}</span>
                                                {invoice.status === 'draft' && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Draft</span>
                                                )}
                                                {invoice.syncStatus === 'pending' && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending sync</span>
                                                )}
                                            </div>
                                            <p className={`text-sm mt-0.5 truncate ${isWalkIn ? 'text-gray-500 italic' : 'text-gray-700 font-medium'}`}>
                                                {customerDisplay}
                                            </p>
                                        </div>
                                        <StatusBadge status={invoice.paymentStatus} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{formatDate(new Date(invoice.invoiceDate))}</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(invoice.totalAmount || 0)}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
