'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { formatPhone } from '@/lib/utils/formatters';
import { useCustomerStore } from '@/stores/customerStore';

export default function CustomersPage() {
    // Use ref to track if we've already attempted loading
    const hasAttemptedLoad = useRef(false);

    const customers = useCustomerStore((state) => state.customers);
    const isLoading = useCustomerStore((state) => state.isLoading);
    const isInitialized = useCustomerStore((state) => state.isInitialized);
    const error = useCustomerStore((state) => state.error);
    const searchQuery = useCustomerStore((state) => state.searchQuery);
    const loadCustomers = useCustomerStore((state) => state.loadCustomers);
    const setSearchQuery = useCustomerStore((state) => state.setSearchQuery);
    const getFilteredCustomers = useCustomerStore((state) => state.getFilteredCustomers);

    // Load only once on mount - use ref to prevent double-loading on mobile
    useEffect(() => {
        if (hasAttemptedLoad.current) return;
        hasAttemptedLoad.current = true;

        if (!isInitialized) {
            loadCustomers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredCustomers = getFilteredCustomers();

    return (
        <>
            <Header
                title="Customers"
                subtitle={`${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`}
                actions={
                    <Link href="/customers/new" className="btn-primary flex items-center gap-2">
                        <span>➕</span>
                        <span className="hidden sm:inline">Add</span>
                    </Link>
                }
            />

            <div className="p-4 lg:p-6">
                {/* Search */}
                <div className="mb-4">
                    <input
                        type="search"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input"
                    />
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
                        <p className="text-gray-500">Loading customers...</p>
                    </div>
                )}

                {/* Empty State */}
                {isInitialized && !isLoading && filteredCustomers.length === 0 && (
                    <div className="card text-center py-12">
                        {searchQuery ? (
                            <>
                                <span className="text-4xl mb-4 block">🔍</span>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                                <p className="text-gray-500 mb-4">
                                    No customers match &quot;{searchQuery}&quot;
                                </p>
                                <button onClick={() => setSearchQuery('')} className="btn-secondary">
                                    Clear search
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-4xl mb-4 block">👥</span>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers yet</h3>
                                <p className="text-gray-500 mb-4">Add your first customer to get started.</p>
                                <Link href="/customers/new" className="btn-primary">
                                    ➕ Add Customer
                                </Link>
                            </>
                        )}
                    </div>
                )}

                {/* Customer list */}
                {isInitialized && filteredCustomers.length > 0 && (
                    <div className="space-y-3">
                        {filteredCustomers.map((customer) => (
                            <Link
                                key={customer.localId}
                                href={`/customers/${customer.localId}`}
                                className="card block hover:border-green-500 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-lg flex-shrink-0">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
                                            {customer.syncStatus === 'pending' && (
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                                    Pending sync
                                                </span>
                                            )}
                                        </div>
                                        {customer.company && (
                                            <p className="text-sm text-gray-500 truncate">{customer.company}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                                            {customer.phone && <span>📞 {formatPhone(customer.phone)}</span>}
                                            {customer.city && <span>📍 {customer.city}</span>}
                                        </div>
                                    </div>
                                    <span className="text-gray-300 text-lg">›</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
