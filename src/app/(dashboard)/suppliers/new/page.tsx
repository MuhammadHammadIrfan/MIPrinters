'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { useSupplierStore } from '@/stores/supplierStore';
import { useToast } from '@/components/ui/DialogProvider';

const SUPPLIER_TYPES = [
    { value: 'offset', label: 'Offset Printing', emoji: '🖨️' },
    { value: 'digital', label: 'Digital Printing', emoji: '💻' },
    { value: 'binding', label: 'Binding & Finishing', emoji: '📚' },
    { value: 'flexo', label: 'Flexo Printing', emoji: '📦' },
    { value: 'screen', label: 'Screen Printing', emoji: '🎨' },
    { value: 'other', label: 'Other', emoji: '📋' },
];

export default function NewSupplierPage() {
    const router = useRouter();
    const addSupplier = useSupplierStore((state) => state.addSupplier);
    const toast = useToast();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        supplierType: 'offset', // Default to a valid type
        notes: '',
    });
    const [customType, setCustomType] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Please enter supplier name');
            return;
        }

        setIsSubmitting(true);
        try {
            await addSupplier({
                name: formData.name.trim(),
                phone: formData.phone.trim() || undefined,
                supplierType: formData.supplierType,
                notes: formData.notes.trim() || undefined,
            });
            router.push('/suppliers');
        } catch (error) {
            console.error('Failed to add supplier:', error);
            toast.error('Failed to add supplier');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Header
                title="Add Supplier"
                actions={
                    <button onClick={() => router.back()} className="p-2 text-gray-500">
                        ✕
                    </button>
                }
            />

            <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-4 pb-32">
                <div className="card space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., ABC Offset Printers"
                            className="input"
                            required
                            autoFocus
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
                            placeholder="03XX-XXXXXXX"
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
                                                // Don't change supplierType yet, keeps previous or empty
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
                            placeholder="Any notes about this supplier..."
                            className="input"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:left-64 z-20">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn-primary"
                    >
                        {isSubmitting ? 'Adding...' : '✓ Add Supplier'}
                    </button>
                </div>
            </form>
        </>
    );
}
