'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { useSupplierStore } from '@/stores/supplierStore';
import { db, type LocalSupplier } from '@/lib/db';

const SUPPLIER_TYPES = [
    { value: 'offset', label: 'Offset Printing', emoji: '🖨️' },
    { value: 'digital', label: 'Digital Printing', emoji: '💻' },
    { value: 'binding', label: 'Binding & Finishing', emoji: '📚' },
    { value: 'flexo', label: 'Flexo Printing', emoji: '📦' },
    { value: 'screen', label: 'Screen Printing', emoji: '🎨' },
    { value: 'other', label: 'Other', emoji: '📋' },
];

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const supplierId = params.id as string;

    const updateSupplier = useSupplierStore((state) => state.updateSupplier);
    const deleteSupplier = useSupplierStore((state) => state.deleteSupplier);

    const [supplier, setSupplier] = useState<LocalSupplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        supplierType: 'other' as 'offset' | 'digital' | 'binding' | 'flexo' | 'screen' | 'other',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadSupplier = async () => {
            setIsLoading(true);
            try {
                const sup = await db.suppliers.get(supplierId);
                if (sup) {
                    setSupplier(sup);
                    setFormData({
                        name: sup.name,
                        phone: sup.phone || '',
                        supplierType: sup.supplierType || 'other',
                        notes: sup.notes || '',
                    });
                }
            } catch (error) {
                console.error('Failed to load supplier:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (supplierId) {
            loadSupplier();
        }
    }, [supplierId]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('Please enter supplier name');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateSupplier(supplierId, {
                name: formData.name.trim(),
                phone: formData.phone.trim() || undefined,
                supplierType: formData.supplierType,
                notes: formData.notes.trim() || undefined,
            });
            setSupplier(prev => prev ? { ...prev, ...formData } : null);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update supplier:', error);
            alert('Failed to update supplier');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this supplier?')) return;

        try {
            await deleteSupplier(supplierId);
            router.push('/suppliers');
        } catch (error) {
            console.error('Failed to delete supplier:', error);
            alert('Failed to delete supplier');
        }
    };

    if (isLoading) {
        return (
            <>
                <Header title="Supplier" />
                <div className="flex items-center justify-center py-20">
                    <div className="text-4xl animate-spin">⏳</div>
                </div>
            </>
        );
    }

    if (!supplier) {
        return (
            <>
                <Header title="Supplier" />
                <div className="p-4 text-center py-20">
                    <span className="text-4xl mb-4 block">🏭</span>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Supplier not found</h2>
                    <Link href="/suppliers" className="btn-primary mt-4">
                        Back to Suppliers
                    </Link>
                </div>
            </>
        );
    }

    const typeInfo = SUPPLIER_TYPES.find(t => t.value === supplier.supplierType) || SUPPLIER_TYPES[5];

    return (
        <>
            <Header
                title={isEditing ? 'Edit Supplier' : supplier.name}
                subtitle={isEditing ? undefined : typeInfo.label}
                actions={
                    <div className="flex gap-2">
                        {!isEditing && (
                            <>
                                <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">
                                    ✏️ Edit
                                </button>
                                <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700">
                                    🗑️
                                </button>
                            </>
                        )}
                        {isEditing && (
                            <button onClick={() => setIsEditing(false)} className="p-2 text-gray-500">
                                ✕
                            </button>
                        )}
                    </div>
                }
            />

            <div className="p-4 lg:p-6 pb-32">
                {!isEditing ? (
                    <div className="card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-3xl">
                                {typeInfo.emoji}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{supplier.name}</h2>
                                <span className="text-sm px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                    {typeInfo.label}
                                </span>
                            </div>
                        </div>

                        {supplier.phone && (
                            <div className="py-3 border-t border-gray-100">
                                <p className="text-sm text-gray-500">Phone</p>
                                <a href={`tel:${supplier.phone}`} className="text-green-600 font-medium">
                                    {supplier.phone}
                                </a>
                            </div>
                        )}

                        {supplier.notes && (
                            <div className="py-3 border-t border-gray-100">
                                <p className="text-sm text-gray-500">Notes</p>
                                <p className="text-gray-900">{supplier.notes}</p>
                            </div>
                        )}

                        {supplier.syncStatus === 'pending' && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                                <span>⏳</span>
                                Pending sync to cloud
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="card space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Supplier Type
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {SUPPLIER_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, supplierType: type.value as typeof formData.supplierType })}
                                        className={`p-3 rounded-lg border text-sm font-medium transition-colors text-left
                      ${formData.supplierType === type.value
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'}`}
                                    >
                                        <span className="text-lg mr-2">{type.emoji}</span>
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="input"
                                rows={3}
                            />
                        </div>
                    </div>
                )}
            </div>

            {isEditing && (
                <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:left-64 z-20">
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="w-full btn-primary"
                    >
                        {isSubmitting ? 'Saving...' : '✓ Save Changes'}
                    </button>
                </div>
            )}
        </>
    );
}
