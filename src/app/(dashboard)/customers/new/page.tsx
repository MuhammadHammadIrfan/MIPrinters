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
        stRegNo: '',
        ntnNo: '',
    });

    const [additionalContacts, setAdditionalContacts] = useState<{ name: string; phone: string }[]>([]);

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
                stRegNo: form.stRegNo.trim() || undefined,
                ntnNo: form.ntnNo.trim() || undefined,
                isActive: true,
                additionalContacts: additionalContacts.filter(c => c.name.trim() || c.phone.trim()),
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
                                    placeholder="Primary phone number"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    placeholder="Email address"
                                    className="input"
                                />
                            </div>
                        </div>

                        {/* Additional Contacts Section */}
                        <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">Additional Contacts</label>
                                <button
                                    type="button"
                                    onClick={() => setAdditionalContacts([...additionalContacts, { name: '', phone: '' }])}
                                    className="text-sm text-primary hover:text-primary-dark"
                                >
                                    + Add Contact
                                </button>
                            </div>

                            <div className="space-y-3">
                                {additionalContacts.map((contact, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={contact.name}
                                                onChange={(e) => {
                                                    const newContacts = [...additionalContacts];
                                                    newContacts[index].name = e.target.value;
                                                    setAdditionalContacts(newContacts);
                                                }}
                                                placeholder="Contact Name"
                                                className="input text-sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="tel"
                                                value={contact.phone}
                                                onChange={(e) => {
                                                    const newContacts = [...additionalContacts];
                                                    newContacts[index].phone = e.target.value;
                                                    setAdditionalContacts(newContacts);
                                                }}
                                                placeholder="Phone Number"
                                                className="input text-sm"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newContacts = additionalContacts.filter((_, i) => i !== index);
                                                setAdditionalContacts(newContacts);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                {additionalContacts.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No additional contacts added.</p>
                                )}
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

                        {/* Tax Registration Fields */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Tax Information (for Tax Invoices)</h4>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">S.T. Reg. No.</label>
                                    <input
                                        type="text"
                                        value={form.stRegNo}
                                        onChange={(e) => updateField('stRegNo', e.target.value)}
                                        placeholder="Sales Tax Registration Number"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">NTN No.</label>
                                    <input
                                        type="text"
                                        value={form.ntnNo}
                                        onChange={(e) => updateField('ntnNo', e.target.value)}
                                        placeholder="National Tax Number"
                                        className="input"
                                    />
                                </div>
                            </div>
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
