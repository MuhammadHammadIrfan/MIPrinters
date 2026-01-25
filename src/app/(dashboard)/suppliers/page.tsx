'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { useSupplierStore } from '@/stores/supplierStore';

const SUPPLIER_TYPES: Record<string, { label: string; emoji: string }> = {
    offset: { label: 'Offset', emoji: '🖨️' },
    digital: { label: 'Digital', emoji: '💻' },
    binding: { label: 'Binding', emoji: '📚' },
    flexo: { label: 'Flexo', emoji: '📦' },
    screen: { label: 'Screen', emoji: '🎨' },
    other: { label: 'Other', emoji: '📋' },
};

export default function SuppliersPage() {
    const hasAttemptedLoad = useRef(false);

    const suppliers = useSupplierStore((state) => state.suppliers);
    const isLoading = useSupplierStore((state) => state.isLoading);
    const isInitialized = useSupplierStore((state) => state.isInitialized);
    const error = useSupplierStore((state) => state.error);
    const searchQuery = useSupplierStore((state) => state.searchQuery);
    const loadSuppliers = useSupplierStore((state) => state.loadSuppliers);
    const setSearchQuery = useSupplierStore((state) => state.setSearchQuery);
    const getFilteredSuppliers = useSupplierStore((state) => state.getFilteredSuppliers);

    useEffect(() => {
        if (hasAttemptedLoad.current) return;
        hasAttemptedLoad.current = true;

        if (!isInitialized) {
            loadSuppliers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredSuppliers = getFilteredSuppliers();

    return (
        <>
            <Header
                title="Suppliers"
                subtitle={`${filteredSuppliers.length} supplier${filteredSuppliers.length !== 1 ? 's' : ''}`}
                actions={
                    <Link href="/suppliers/new" className="btn-primary flex items-center gap-2">
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
                        placeholder="Search suppliers..."
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
                        <p className="text-gray-500">Loading suppliers...</p>
                    </div>
                )}

                {/* Empty State */}
                {isInitialized && !isLoading && filteredSuppliers.length === 0 && (
                    <div className="card text-center py-12">
                        {searchQuery ? (
                            <>
                                <span className="text-4xl mb-4 block">🔍</span>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                                <p className="text-gray-500 mb-4">
                                    No suppliers match &quot;{searchQuery}&quot;
                                </p>
                                <button onClick={() => setSearchQuery('')} className="btn-secondary">
                                    Clear search
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-4xl mb-4 block">🏭</span>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers yet</h3>
                                <p className="text-gray-500 mb-4">Add your first supplier to track vendors.</p>
                                <Link href="/suppliers/new" className="btn-primary">
                                    ➕ Add Supplier
                                </Link>
                            </>
                        )}
                    </div>
                )}

                {/* Supplier list */}
                {isInitialized && filteredSuppliers.length > 0 && (
                    <div className="space-y-3">
                        {filteredSuppliers.map((supplier) => {
                            const type = SUPPLIER_TYPES[supplier.supplierType || 'other'] || SUPPLIER_TYPES.other;
                            return (
                                <Link
                                    key={supplier.localId}
                                    href={`/suppliers/${supplier.localId}`}
                                    className="card block hover:border-green-500 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl flex-shrink-0">
                                            {type.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-gray-900 truncate">{supplier.name}</h3>
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                                    {type.label}
                                                </span>
                                                {supplier.syncStatus === 'pending' && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                                        Pending sync
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                                                {supplier.phone && <span>📞 {supplier.phone}</span>}
                                            </div>
                                            {supplier.notes && (
                                                <p className="text-sm text-gray-500 truncate mt-1">{supplier.notes}</p>
                                            )}
                                        </div>
                                        <span className="text-gray-300 text-lg">›</span>
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
