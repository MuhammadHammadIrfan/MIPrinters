'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout';
import { useInvoiceFormStore } from '@/stores/invoiceFormStore';
import { useCustomerStore } from '@/stores/customerStore';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';

// Mobile-friendly line item component with long-press replication
function LineItemRow({
    item,
    index,
    onUpdate,
    onRemove,
    onReplicateField,
    onReplicateRow,
    canRemove,
    isMobile
}: {
    item: { localId: string; description: string; quantity: number; rate: number; cost?: number; unit?: string };
    index: number;
    onUpdate: (localId: string, field: 'localId' | 'description' | 'quantity' | 'rate' | 'cost' | 'unit', value: string | number) => void;
    onRemove: (localId: string) => void;
    onReplicateField: (localId: string, field: string) => void;
    onReplicateRow: (localId: string) => void;
    canRemove: boolean;
    isMobile: boolean;
}) {
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const amount = item.quantity * item.rate;

    const handleLongPressStart = (field: string) => {
        longPressTimer.current = setTimeout(() => {
            if (field === 'sr') {
                onReplicateRow(item.localId);
            } else {
                onReplicateField(item.localId, field);
            }
        }, 500);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // Mobile card layout
    if (isMobile) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                <div className="flex items-start justify-between mb-2">
                    <span
                        className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded cursor-pointer"
                        onTouchStart={() => handleLongPressStart('sr')}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={() => handleLongPressStart('sr')}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                    >
                        #{index + 1}
                    </span>
                    {canRemove && (
                        <button
                            onClick={() => onRemove(item.localId)}
                            className="p-1.5 text-red-500 bg-red-50 rounded-lg"
                        >
                            🗑️
                        </button>
                    )}
                </div>

                <input
                    type="text"
                    value={item.description}
                    onChange={(e) => onUpdate(item.localId, 'description', e.target.value)}
                    onTouchStart={() => handleLongPressStart('description')}
                    onTouchEnd={handleLongPressEnd}
                    placeholder="Item description"
                    className="w-full px-3 py-2 mb-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => onUpdate(item.localId, 'quantity', parseFloat(e.target.value) || 0)}
                            onTouchStart={() => handleLongPressStart('quantity')}
                            onTouchEnd={handleLongPressEnd}
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Rate</label>
                        <input
                            type="number"
                            value={item.rate || ''}
                            onChange={(e) => onUpdate(item.localId, 'rate', parseFloat(e.target.value) || 0)}
                            onTouchStart={() => handleLongPressStart('rate')}
                            onTouchEnd={handleLongPressEnd}
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Amount</label>
                        <div className="px-2 py-1.5 text-sm text-right font-medium text-gray-900 bg-gray-50 rounded-lg">
                            {formatNumber(amount)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop table row
    return (
        <tr className="border-b border-gray-100 group">
            <td
                className="px-2 py-2 text-center text-gray-400 text-sm w-8 cursor-pointer hover:bg-gray-100"
                onMouseDown={() => handleLongPressStart('sr')}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                title="Long-press to replicate entire row"
            >
                {index + 1}
            </td>
            <td className="px-2 py-2">
                <input
                    type="text"
                    value={item.description}
                    onChange={(e) => onUpdate(item.localId, 'description', e.target.value)}
                    onMouseDown={() => handleLongPressStart('description')}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    placeholder="Item description"
                    className="w-full px-2 py-1.5 text-sm border border-transparent rounded hover:border-gray-200 focus:border-green-500 focus:outline-none"
                />
            </td>
            <td className="px-2 py-2 w-20">
                <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => onUpdate(item.localId, 'quantity', parseFloat(e.target.value) || 0)}
                    onMouseDown={() => handleLongPressStart('quantity')}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-sm text-right border border-transparent rounded hover:border-gray-200 focus:border-green-500 focus:outline-none"
                />
            </td>
            <td className="px-2 py-2 w-24">
                <input
                    type="number"
                    value={item.rate || ''}
                    onChange={(e) => onUpdate(item.localId, 'rate', parseFloat(e.target.value) || 0)}
                    onMouseDown={() => handleLongPressStart('rate')}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-2 py-1.5 text-sm text-right border border-transparent rounded hover:border-gray-200 focus:border-green-500 focus:outline-none"
                />
            </td>
            <td className="px-2 py-2 w-28 text-right text-sm font-medium text-gray-900">
                {formatNumber(amount)}
            </td>
            <td className="px-2 py-2 w-10">
                {canRemove && (
                    <button
                        onClick={() => onRemove(item.localId)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove item"
                    >
                        ✕
                    </button>
                )}
            </td>
        </tr>
    );
}

// Replication modal
function ReplicationModal({
    isOpen,
    onClose,
    onReplicate,
    type,
    field,
}: {
    isOpen: boolean;
    onClose: () => void;
    onReplicate: (count: number) => void;
    type: 'field' | 'row';
    field: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xs bg-white rounded-xl shadow-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📋 Replicate {type === 'row' ? 'Row' : field}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    {type === 'row' ? 'Copy entire row to rows below' : 'Copy this value to rows below'}
                </p>
                <div className="space-y-2">
                    {[2, 3, 5, 10].map((count) => (
                        <button
                            key={count}
                            onClick={() => {
                                onReplicate(count);
                                onClose();
                            }}
                            className="w-full py-2 px-4 text-left rounded-lg hover:bg-green-50 text-gray-700 transition-colors"
                        >
                            Next {count} rows
                        </button>
                    ))}
                </div>
                <button
                    onClick={onClose}
                    className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

function NewInvoicePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showReplicationModal, setShowReplicationModal] = useState(false);
    const [replicationTarget, setReplicationTarget] = useState<{ localId: string; field: string; type: 'field' | 'row' } | null>(null);
    const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Load real customers
    const { customers, loadCustomers, isInitialized: customersLoaded } = useCustomerStore();
    const setCustomerIdFromUrl = useInvoiceFormStore((s) => s.setCustomerId);

    useEffect(() => {
        if (!customersLoaded) {
            loadCustomers();
        }
    }, [customersLoaded, loadCustomers]);

    // Auto-select customer from URL query parameter
    useEffect(() => {
        const customerFromUrl = searchParams.get('customer');
        if (customerFromUrl && customersLoaded) {
            setCustomerIdFromUrl(customerFromUrl);
        }
    }, [searchParams, customersLoaded, setCustomerIdFromUrl]);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const {
        customerId,
        invoiceDate,
        dueDate,
        items,
        designCharges,
        deliveryCharges,
        taxRate,
        otherCharges,
        otherChargesLabel,
        notes,
        internalNotes,
        subtotal,
        totalCost,
        taxAmount,
        totalAmount,
        margin,
        marginPercentage,
        isLoading,
        setCustomerId,
        setInvoiceDate,
        setDueDate,
        addItem,
        removeItem,
        updateItem,
        replicateValue,
        setDesignCharges,
        setDeliveryCharges,
        setTaxRate,
        setOtherCharges,
        setOtherChargesLabel,
        setNotes,
        setInternalNotes,
        saveInvoice,
        resetForm,
    } = useInvoiceFormStore();

    const handleReplicateField = (localId: string, field: string) => {
        setReplicationTarget({ localId, field, type: 'field' });
        setShowReplicationModal(true);
    };

    const handleReplicateRow = (localId: string) => {
        setReplicationTarget({ localId, field: 'row', type: 'row' });
        setShowReplicationModal(true);
    };

    const handleDoReplicate = (count: number) => {
        if (replicationTarget) {
            if (replicationTarget.type === 'row') {
                // Replicate all fields
                ['description', 'quantity', 'rate', 'cost', 'unit'].forEach(field => {
                    replicateValue(replicationTarget.localId, field as never, count);
                });
            } else {
                replicateValue(replicationTarget.localId, replicationTarget.field as never, count);
            }
        }
    };

    const handleSave = async (asDraft = false) => {
        try {
            const invoiceId = await saveInvoice(asDraft);
            resetForm();
            router.push(`/invoices/${invoiceId}`);
        } catch (error) {
            console.error('Failed to save invoice:', error);
            alert('Failed to save invoice. Please try again.');
        }
    };

    return (
        <>
            <Header
                title="New Invoice"
                actions={
                    <button
                        onClick={() => {
                            resetForm();
                            router.back();
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                }
            />

            <div className="p-4 lg:p-6 pb-40 lg:pb-32">
                {/* Customer & Date */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                            <select
                                value={customerId || ''}
                                onChange={(e) => setCustomerId(e.target.value || null)}
                                className="input"
                            >
                                <option value="">Walk-in Customer</option>
                                {customers.map((customer) => (
                                    <option key={customer.localId} value={customer.localId}>
                                        {customer.name}{customer.company ? ` (${customer.company})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="card mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Line Items</h3>
                        <button
                            onClick={addItem}
                            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                        >
                            <span>➕</span> Add Row
                        </button>
                    </div>

                    {/* Mobile: Card layout */}
                    {isMobile ? (
                        <div>
                            {items.map((item, index) => (
                                <LineItemRow
                                    key={item.localId}
                                    item={item}
                                    index={index}
                                    onUpdate={updateItem}
                                    onRemove={removeItem}
                                    onReplicateField={handleReplicateField}
                                    onReplicateRow={handleReplicateRow}
                                    canRemove={items.length > 1}
                                    isMobile={true}
                                />
                            ))}
                        </div>
                    ) : (
                        /* Desktop: Table layout */
                        <div className="overflow-x-auto -mx-6 px-6">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-20">Qty</th>
                                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-24">Rate</th>
                                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-28">Amount</th>
                                        <th className="px-2 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <LineItemRow
                                            key={item.localId}
                                            item={item}
                                            index={index}
                                            onUpdate={updateItem}
                                            onRemove={removeItem}
                                            onReplicateField={handleReplicateField}
                                            onReplicateRow={handleReplicateRow}
                                            canRemove={items.length > 1}
                                            isMobile={false}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <p className="mt-3 text-xs text-gray-400 italic">
                        💡 Long-press #{' '} to replicate entire row, or any cell for that value
                    </p>
                </div>

                {/* Additional Charges - Collapsible */}
                <div className="card mb-4">
                    <button
                        onClick={() => setShowAdditionalCharges(!showAdditionalCharges)}
                        className="w-full flex items-center justify-between text-left"
                    >
                        <span className="font-semibold text-gray-900">Additional Charges (Optional)</span>
                        <span className="text-gray-400">{showAdditionalCharges ? '▲' : '▼'}</span>
                    </button>

                    {showAdditionalCharges && (
                        <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Design</label>
                                <input
                                    type="number"
                                    value={designCharges || ''}
                                    onChange={(e) => setDesignCharges(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Delivery</label>
                                <input
                                    type="number"
                                    value={deliveryCharges || ''}
                                    onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Tax %</label>
                                <input
                                    type="number"
                                    value={taxRate || ''}
                                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    step="0.5"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Other</label>
                                <input
                                    type="number"
                                    value={otherCharges || ''}
                                    onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="input"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Customer-facing Summary */}
                    <div className="card">
                        <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                            </div>
                            {designCharges > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Design Charges</span>
                                    <span className="text-gray-900">{formatCurrency(designCharges)}</span>
                                </div>
                            )}
                            {deliveryCharges > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Delivery</span>
                                    <span className="text-gray-900">{formatCurrency(deliveryCharges)}</span>
                                </div>
                            )}
                            {taxAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tax ({taxRate}%)</span>
                                    <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
                                </div>
                            )}
                            {otherCharges > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{otherChargesLabel || 'Other'}</span>
                                    <span className="text-gray-900">{formatCurrency(otherCharges)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                                <span className="text-gray-900">Total</span>
                                <span className="text-green-600 text-lg">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Internal Summary (Cost & Margin) */}
                    <div className="card bg-gray-50 border-dashed">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            🔒 Internal (Not on PDF)
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Enter costs per item:</label>
                                <div className="flex flex-wrap gap-2">
                                    {items.filter(i => i.description.trim()).map((item, index) => (
                                        <div key={item.localId} className="flex items-center gap-1">
                                            <span className="text-xs text-gray-400">{index + 1}:</span>
                                            <input
                                                type="number"
                                                value={item.cost || ''}
                                                onChange={(e) => updateItem(item.localId, 'cost', parseFloat(e.target.value) || 0)}
                                                placeholder="Cost"
                                                className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total Cost</span>
                                <span className="text-gray-700">{formatCurrency(totalCost)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-gray-700">Margin</span>
                                <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(margin)} ({marginPercentage.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="card mt-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (On PDF)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Optional notes for customer..."
                                rows={2}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                            <textarea
                                value={internalNotes}
                                onChange={(e) => setInternalNotes(e.target.value)}
                                placeholder="Private notes (not on PDF)..."
                                rows={2}
                                className="input bg-gray-50"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:left-64 z-20">
                <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
                    <button
                        onClick={() => handleSave(true)}
                        disabled={isLoading}
                        className="btn-secondary flex-1"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isLoading}
                        className="btn-primary flex-1"
                    >
                        {isLoading ? 'Saving...' : 'Save Invoice'}
                    </button>
                </div>
            </div>

            {/* Replication Modal */}
            <ReplicationModal
                isOpen={showReplicationModal}
                onClose={() => setShowReplicationModal(false)}
                onReplicate={handleDoReplicate}
                type={replicationTarget?.type || 'field'}
                field={replicationTarget?.field || ''}
            />
        </>
    );
}

// Wrap in Suspense for useSearchParams
export default function NewInvoicePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-4xl animate-spin">⏳</div>
            </div>
        }>
            <NewInvoicePageContent />
        </Suspense>
    );
}
