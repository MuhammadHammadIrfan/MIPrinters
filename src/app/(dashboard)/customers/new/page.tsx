'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { db, generateLocalId } from '@/lib/db';

export default function NewCustomerPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setIsLoading(true);
        try {
            const now = Date.now();
            await db.customers.add({
                localId: generateLocalId(),
                name: form.name.trim(),
                company: form.company.trim() || undefined,
                phone: form.phone.trim() || undefined,
                email: form.email.trim() || undefined,
                address: form.address.trim() || undefined,
                city: form.city.trim() || undefined,
                notes: form.notes.trim() || undefined,
                isActive: true,
                syncStatus: 'pending',
                createdAt: now,
                updatedAt: now,
            });
            router.push('/customers');
        } catch (error) {
            console.error('Failed to save customer:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <>
            <Header
                title="Add Customer"
                actions={
                    <button onClick={() => router.back()} className="p-2 text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                }
            />

            <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-4">
                <div className="card">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="Customer name"
                                className="input"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                            <input
                                type="text"
                                value={form.company}
                                onChange={(e) => updateField('company', e.target.value)}
                                placeholder="Company name (optional)"
                                className="input"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    placeholder="03XX-XXXXXXX"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    placeholder="email@example.com"
                                    className="input"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                placeholder="Street address"
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={(e) => updateField('city', e.target.value)}
                                placeholder="City"
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => updateField('notes', e.target.value)}
                                placeholder="Any notes about this customer..."
                                rows={3}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !form.name.trim()}
                    className="btn-primary w-full"
                >
                    {isLoading ? 'Saving...' : 'Save Customer'}
                </button>
            </form>
        </>
    );
}
