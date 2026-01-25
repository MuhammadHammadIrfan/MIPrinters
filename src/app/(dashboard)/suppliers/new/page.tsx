'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { useSupplierStore } from '@/stores/supplierStore';

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

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        supplierType: 'other' as 'offset' | 'digital' | 'binding' | 'flexo' | 'screen' | 'other',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Please enter supplier name');
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
            alert('Failed to add supplier');
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
