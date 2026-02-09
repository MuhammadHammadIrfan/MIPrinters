'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { db, type LocalCustomer } from '@/lib/db';
import { formatPhone } from '@/lib/utils/formatters';
import { useConfirmDialog, useToast } from '@/components/ui/DialogProvider';

// Helper to format phone for WhatsApp (Pakistan format)
function formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    // If starts with 0, replace with 92 (Pakistan country code)
    if (cleaned.startsWith('0')) {
        cleaned = '92' + cleaned.substring(1);
    }
    // If doesn't start with 92, add it
    if (!cleaned.startsWith('92')) {
        cleaned = '92' + cleaned;
    }
    return cleaned;
}

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    // Dialog hooks
    const { confirm: confirmDialog } = useConfirmDialog();
    const toast = useToast();

    const [customer, setCustomer] = useState<LocalCustomer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<LocalCustomer>>({});

    useEffect(() => {
        const loadCustomer = async () => {
            setIsLoading(true);
            try {
                const cust = await db.customers.get(customerId);
                if (cust) {
                    setCustomer(cust);
                    setEditForm(cust);
                }
            } catch (error) {
                console.error('Failed to load customer:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (customerId) {
            loadCustomer();
        }
    }, [customerId]);

    const handleSave = async () => {
        if (!customer) return;

        try {
            const now = Date.now();
            await db.customers.update(customerId, {
                ...editForm,
                updatedAt: now,
                syncStatus: 'pending',
            });

            // Add to sync queue
            await db.syncQueue.add({
                entityType: 'customer',
                entityLocalId: customerId,
                operation: 'update',
                payload: editForm,
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            setCustomer({ ...customer, ...editForm, updatedAt: now } as LocalCustomer);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save customer:', error);
            toast.error('Failed to save customer');
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirmDialog({
            title: 'Delete Customer',
            message: `Are you sure you want to delete "${customer?.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            const now = Date.now();
            await db.customers.update(customerId, { isActive: false, updatedAt: now, syncStatus: 'pending' });

            await db.syncQueue.add({
                entityType: 'customer',
                entityLocalId: customerId,
                operation: 'delete',
                payload: { customerId },
                retryCount: 0,
                status: 'pending',
                createdAt: now,
            });

            router.push('/customers');
        } catch (error) {
            console.error('Failed to delete customer:', error);
            toast.error('Failed to delete customer');
        }
    };

    if (isLoading) {
        return (
            <>
                <Header title="Customer" />
                <div className="flex items-center justify-center py-20">
                    <div className="text-4xl animate-spin">⏳</div>
                </div>
            </>
        );
    }

    if (!customer) {
        return (
            <>
                <Header title="Customer" />
                <div className="p-4 text-center py-20">
                    <span className="text-4xl mb-4 block">👤</span>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer not found</h2>
                    <Link href="/customers" className="btn-primary mt-4">
                        Back to Customers
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title={customer.name}
                subtitle={customer.company}
                actions={
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="btn-primary text-sm">
                                    Save
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">
                                    ✏️ Edit
                                </button>
                                <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700">
                                    🗑️
                                </button>
                            </>
                        )}
                    </div>
                }
            />

            <div className="p-4 lg:p-6 pb-24">
                {/* Customer Info */}
                <div className="card mb-4">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                <input
                                    type="text"
                                    value={editForm.company || ''}
                                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    type="text"
                                    value={editForm.city || ''}
                                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    value={editForm.address || ''}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    rows={2}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={editForm.notes || ''}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={2}
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
                                            value={editForm.stRegNo || ''}
                                            onChange={(e) => setEditForm({ ...editForm, stRegNo: e.target.value })}
                                            placeholder="Sales Tax Registration Number"
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">NTN No.</label>
                                        <input
                                            type="text"
                                            value={editForm.ntnNo || ''}
                                            onChange={(e) => setEditForm({ ...editForm, ntnNo: e.target.value })}
                                            placeholder="National Tax Number"
                                            className="input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Contacts Section */}
                            <div className="border-t pt-4 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Additional Contacts</label>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm(prev => ({
                                            ...prev,
                                            additionalContacts: [...(prev.additionalContacts || []), { name: '', phone: '' }]
                                        }))}
                                        className="text-sm text-primary hover:text-primary-dark"
                                    >
                                        + Add Contact
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(editForm.additionalContacts || []).map((contact, index) => (
                                        <div key={index} className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={contact.name}
                                                    onChange={(e) => {
                                                        const newContacts = [...(editForm.additionalContacts || [])];
                                                        newContacts[index] = { ...newContacts[index], name: e.target.value };
                                                        setEditForm(prev => ({ ...prev, additionalContacts: newContacts }));
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
                                                        const newContacts = [...(editForm.additionalContacts || [])];
                                                        newContacts[index] = { ...newContacts[index], phone: e.target.value };
                                                        setEditForm(prev => ({ ...prev, additionalContacts: newContacts }));
                                                    }}
                                                    placeholder="Phone Number"
                                                    className="input text-sm"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newContacts = (editForm.additionalContacts || []).filter((_, i) => i !== index);
                                                    setEditForm(prev => ({ ...prev, additionalContacts: newContacts }));
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-500"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {(!editForm.additionalContacts || editForm.additionalContacts.length === 0) && (
                                        <p className="text-sm text-gray-500 italic">No additional contacts added.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-2xl">
                                    {customer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
                                    {customer.company && <p className="text-gray-500">{customer.company}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {customer.phone && (
                                    <div>
                                        <p className="text-gray-500">Phone</p>
                                        <a href={`tel:${customer.phone}`} className="font-medium text-green-600">
                                            📞 {formatPhone(customer.phone)}
                                        </a>
                                    </div>
                                )}
                                {customer.email && (
                                    <div className="min-w-0 overflow-hidden">
                                        <p className="text-gray-500">Email</p>
                                        <a href={`mailto:${customer.email}`} className="font-medium text-green-600 block truncate" title={customer.email}>
                                            ✉️ {customer.email}
                                        </a>
                                    </div>
                                )}
                                {customer.city && (
                                    <div>
                                        <p className="text-gray-500">City</p>
                                        <p className="font-medium">📍 {customer.city}</p>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="col-span-2">
                                        <p className="text-gray-500">Address</p>
                                        <p className="font-medium">{customer.address}</p>
                                    </div>
                                )}
                            </div>

                            {customer.notes && (
                                <div className="pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                                    <p className="text-sm text-gray-700">{customer.notes}</p>
                                </div>
                            )}

                            {/* Additional Contacts Display */}
                            {customer.additionalContacts && customer.additionalContacts.length > 0 && (
                                <div className="pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">Additional Contacts</p>
                                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                        {customer.additionalContacts.map((contact, index) => (
                                            <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded shadow-sm border border-gray-100">
                                                <span className="font-medium text-gray-900 flex-1">{contact.name}</span>
                                                {contact.phone && (
                                                    <div className="flex items-center divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden shrink-0">
                                                        <a
                                                            href={`tel:${contact.phone}`}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
                                                            title="Call"
                                                        >
                                                            <span>📞</span>
                                                            <span className="text-sm font-medium">{formatPhone(contact.phone)}</span>
                                                        </a>
                                                        <a
                                                            href={`https://wa.me/${formatPhoneForWhatsApp(contact.phone)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
                                                            title="Chat on WhatsApp"
                                                        >
                                                            <span className="text-sm font-medium">WhatsApp</span>
                                                            <span>💬</span>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tax Registration Info */}
                            {(customer.stRegNo || customer.ntnNo) && (
                                <div className="pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">Tax Information</p>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {customer.stRegNo && (
                                            <div>
                                                <p className="text-gray-500">S.T. Reg. No.</p>
                                                <p className="font-medium">{customer.stRegNo}</p>
                                            </div>
                                        )}
                                        {customer.ntnNo && (
                                            <div>
                                                <p className="text-gray-500">NTN No.</p>
                                                <p className="font-medium">{customer.ntnNo}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {customer.syncStatus === 'pending' && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                                    <span>⏳</span>
                                    Pending sync to cloud
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href={`/invoices/new?customer=${customerId}`}
                            className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                        >
                            <span className="text-xl">📄</span>
                            <span className="text-sm font-medium text-gray-700">New Invoice</span>
                        </Link>
                        {customer.phone && (
                            <a
                                href={`https://wa.me/${formatPhoneForWhatsApp(customer.phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                            >
                                <span className="text-xl">💬</span>
                                <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
