'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { useSupplierStore } from '@/stores/supplierStore';
import { db, type LocalSupplier } from '@/lib/db';
import { useConfirmDialog, useToast } from '@/components/ui/DialogProvider';
import { formatPhone } from '@/lib/utils/formatters';

// Helper to format phone for WhatsApp (Pakistan format)
function formatPhoneForWhatsApp(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '92' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('92')) {
        cleaned = '92' + cleaned;
    }
    return cleaned;
}

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

    // Dialog hooks
    const { confirm: confirmDialog } = useConfirmDialog();
    const toast = useToast();

    const updateSupplier = useSupplierStore((state) => state.updateSupplier);
    const deleteSupplier = useSupplierStore((state) => state.deleteSupplier);

    const [supplier, setSupplier] = useState<LocalSupplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        supplierType: 'offset',
        notes: '',
    });
    const [customType, setCustomType] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadSupplier = async () => {
            setIsLoading(true);
            try {
                const sup = await db.suppliers.get(supplierId);
                if (sup) {
                    setSupplier(sup);
                    const isPredefined = SUPPLIER_TYPES.some(t => t.value === sup.supplierType);
                    setFormData({
                        name: sup.name,
                        phone: sup.phone || '',
                        supplierType: sup.supplierType || 'offset',
                        notes: sup.notes || '',
                    });

                    if (!isPredefined && sup.supplierType) {
                        setIsCustom(true);
                        setCustomType(sup.supplierType);
                    } else {
                        setIsCustom(false);
                        setCustomType('');
                    }
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
            toast.error('Please enter supplier name');
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
            toast.success('Supplier updated successfully');
        } catch (error) {
            console.error('Failed to update supplier:', error);
            toast.error('Failed to update supplier');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirmDialog({
            title: 'Delete Supplier',
            message: `Are you sure you want to delete "${supplier?.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            await deleteSupplier(supplierId);
            router.push('/suppliers');
        } catch (error) {
            console.error('Failed to delete supplier:', error);
            toast.error('Failed to delete supplier');
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

    const predefinedType = SUPPLIER_TYPES.find(t => t.value === supplier.supplierType);
    const typeInfo = predefinedType || {
        value: supplier.supplierType || 'other',
        label: supplier.supplierType || 'Other',
        emoji: '🏢' // Default emoji for custom types
    };

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
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                                {typeInfo.emoji}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{supplier.name}</h2>
                                <span className="text-sm px-2 py-0.5 rounded bg-green-100 text-green-700">
                                    {typeInfo.label}
                                </span>
                            </div>
                        </div>

                        {supplier.phone && (
                            <div className="py-3 border-t border-gray-100">
                                <p className="text-sm text-gray-500 mb-2">Contact</p>
                                <div className="flex gap-2">
                                    <a
                                        href={`tel:${supplier.phone}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-50 text-green-700 rounded-lg font-medium active:bg-green-100 hover:bg-green-100 transition-colors"
                                    >
                                        <span>📞</span>
                                        {formatPhone(supplier.phone)}
                                    </a>
                                    <a
                                        href={`https://wa.me/${formatPhoneForWhatsApp(supplier.phone)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
                                    >
                                        <span>💬</span>
                                        WhatsApp
                                    </a>
                                </div>
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
                            <div className="flex flex-wrap gap-2 mb-3">
                                {SUPPLIER_TYPES.map((type) => {
                                    const isSelected = isCustom ? type.value === 'other' : formData.supplierType === type.value;
                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => {
                                                if (type.value === 'other') {
                                                    setIsCustom(true);
                                                } else {
                                                    setIsCustom(false);
                                                    setFormData({ ...formData, supplierType: type.value });
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border
                                    ${isSelected
                                                    ? 'bg-green-100 text-green-800 border-green-200'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <span className="mr-1.5">{type.emoji}</span>
                                            {type.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {isCustom && (
                                <input
                                    type="text"
                                    value={customType}
                                    onChange={(e) => {
                                        setCustomType(e.target.value);
                                        setFormData({ ...formData, supplierType: e.target.value });
                                    }}
                                    placeholder="Enter custom supplier type..."
                                    className="input"
                                    autoFocus
                                />
                            )}
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
            </div >

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
            )
            }
        </>
    );
}
