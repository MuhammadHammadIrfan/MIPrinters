'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';
import { useToast, useConfirmDialog } from '@/components/ui/DialogProvider';

interface BusinessSettings {
    businessName: string;
    phone: string;
    email: string;
    address: string;
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    invoicePrefix: string;
    nextInvoiceNumber: number;
    defaultPaymentTerms: number;
    defaultTaxRate: number;
}

const DEFAULT_SETTINGS: BusinessSettings = {
    businessName: 'MI Printers',
    phone: '',
    email: '',
    address: '',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    iban: '',
    invoicePrefix: 'INV',
    nextInvoiceNumber: 1,
    defaultPaymentTerms: 30,
    defaultTaxRate: 0,
};

export default function SettingsPage() {
    // Dialog hooks
    const toast = useToast();
    const { confirm } = useConfirmDialog();

    // Business settings state
    const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Password change state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Load settings from localStorage AND Cloud on mount
    useEffect(() => {
        // 1. Load from localStorage (fast/offline)
        const saved = localStorage.getItem('miprinters_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSettings(prev => ({ ...prev, ...parsed }));
            } catch {
                console.error('Failed to parse saved settings');
            }
        }

        // 2. Fetch from Cloud (source of truth)
        const fetchProfile = async () => {
            console.log('🔄 [Settings] Fetching profile from Supabase...');
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('owner_profile')
                    .select('*')
                    .limit(1)
                    .single();

                console.log('📥 [Settings] Supabase response:', { data, error });

                if (data && !error) {
                    const cloudSettings: BusinessSettings = {
                        businessName: data.business_name || 'MI Printers',
                        phone: data.phone || '',
                        email: data.email || '',
                        address: data.address || '',
                        bankName: data.bank_name || '',
                        accountTitle: data.account_title || '',
                        accountNumber: data.account_number || '',
                        iban: data.iban || '',
                        invoicePrefix: data.invoice_prefix || 'INV',
                        nextInvoiceNumber: data.next_invoice_number || 1,
                        defaultPaymentTerms: data.default_payment_terms || 7,
                        defaultTaxRate: data.default_tax_rate || 0,
                    };

                    setSettings(cloudSettings);
                    // Update cache
                    localStorage.setItem('miprinters_settings', JSON.stringify(cloudSettings));
                    console.log('✅ [Settings] Loaded settings from cloud');
                } else if (error) {
                    console.warn('⚠️ [Settings] No profile found or error:', error.message);
                }
            } catch (err) {
                console.error('❌ [Settings] Failed to fetch profile:', err);
            }
        };

        if (navigator.onLine) {
            fetchProfile();
        }
    }, []);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        console.log('💾 [Settings] Saving settings...', settings);

        try {
            // Save to localStorage first (instant offline cache)
            localStorage.setItem('miprinters_settings', JSON.stringify(settings));
            console.log('✅ [Settings] Saved to localStorage');

            // Save to Supabase if online
            if (navigator.onLine) {
                const supabase = createClient();

                // First, check if a profile row exists
                const { data: existingProfile } = await supabase
                    .from('owner_profile')
                    .select('id')
                    .limit(1)
                    .single();

                const payload = {
                    business_name: settings.businessName,
                    phone: settings.phone,
                    email: settings.email,
                    address: settings.address,
                    bank_name: settings.bankName,
                    account_title: settings.accountTitle,
                    account_number: settings.accountNumber,
                    iban: settings.iban,
                    invoice_prefix: settings.invoicePrefix,
                    next_invoice_number: settings.nextInvoiceNumber,
                    default_payment_terms: settings.defaultPaymentTerms,
                    default_tax_rate: settings.defaultTaxRate,
                    updated_at: new Date().toISOString(),
                };
                console.log('📤 [Settings] Payload:', payload);

                let result;
                if (existingProfile?.id) {
                    // Update existing row
                    console.log('📤 [Settings] Updating existing profile:', existingProfile.id);
                    result = await supabase
                        .from('owner_profile')
                        .update(payload)
                        .eq('id', existingProfile.id)
                        .select();
                } else {
                    // Insert new row (first time setup)
                    console.log('� [Settings] Inserting new profile row');
                    result = await supabase
                        .from('owner_profile')
                        .insert({ ...payload, id: crypto.randomUUID() })
                        .select();
                }

                console.log('📥 [Settings] Supabase response:', result);
                if (result.error) throw result.error;
            } else {
                console.log('⚠️ [Settings] Offline - saved to localStorage only');
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            alert('Failed to save settings to cloud. Changes saved locally.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }

        setIsChangingPassword(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setPasswordError(data.error || 'Failed to change password');
            } else {
                setPasswordSuccess('Password changed successfully!');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch {
            setPasswordError('An error occurred. Please try again.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <>
            <Header title="Settings" />

            <div className="p-4 lg:p-6 space-y-4 pb-32">
                {/* Business Profile */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Business Profile</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                            <input
                                type="text"
                                value={settings.businessName}
                                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={settings.phone}
                                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                    placeholder="03XX-XXXXXXX"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    placeholder="business@email.com"
                                    className="input"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <textarea
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                placeholder="Business address..."
                                rows={2}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Bank Details (for PDF) */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Bank Details (shown on Invoice PDF)</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Add your bank details to display on invoices for customer payments.
                    </p>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={settings.bankName}
                                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                                    placeholder="e.g., HBL, Meezan, JazzCash"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Title</label>
                                <input
                                    type="text"
                                    value={settings.accountTitle}
                                    onChange={(e) => setSettings({ ...settings, accountTitle: e.target.value })}
                                    placeholder="Account holder name"
                                    className="input"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    value={settings.accountNumber}
                                    onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                                    placeholder="XXXX-XXXX-XXXX"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                                <input
                                    type="text"
                                    value={settings.iban}
                                    onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                                    placeholder="PK00XXXX..."
                                    className="input"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invoice Settings */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Invoice Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
                            <input
                                type="text"
                                value={settings.invoicePrefix}
                                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Next Number</label>
                            <input
                                type="number"
                                value={settings.nextInvoiceNumber}
                                onChange={(e) => setSettings({ ...settings, nextInvoiceNumber: parseInt(e.target.value) || 1 })}
                                className="input"
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Payment Terms</label>
                            <select
                                className="input"
                                value={settings.defaultPaymentTerms}
                                onChange={(e) => setSettings({ ...settings, defaultPaymentTerms: parseInt(e.target.value) })}
                            >
                                <option value={7}>7 days</option>
                                <option value={15}>15 days</option>
                                <option value={30}>30 days</option>
                                <option value={45}>45 days</option>
                                <option value={60}>60 days</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax %</label>
                            <input
                                type="number"
                                value={settings.defaultTaxRate}
                                onChange={(e) => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                                step="0.5"
                                className="input"
                                min={0}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Settings Button */}
                <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="btn-primary w-full"
                >
                    {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Settings'}
                </button>

                <div className="border-t border-gray-200 my-6" />



                {/* Divider */}
                <div className="border-t border-gray-200 my-6" />

                {/* Change Password Section */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    className="input pr-10"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    className="input pr-10"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="input pr-10"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {passwordError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                                {passwordSuccess}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full py-2.5 px-4 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
