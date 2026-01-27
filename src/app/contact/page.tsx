'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface BusinessInfo {
    businessName: string;
    phone: string;
    email: string;
    address: string;
}

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: '',
    });
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);

    // Load business info from localStorage (saved in settings)
    // Load business info
    useEffect(() => {
        const loadInfo = async () => {
            // 1. Try localStorage first (fastest)
            const saved = localStorage.getItem('miprinters_settings');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setBusinessInfo({
                        businessName: parsed.businessName || 'MI Printers',
                        phone: parsed.phone || '',
                        email: parsed.email || '',
                        address: parsed.address || 'Lahore, Pakistan',
                    });
                    return; // Found in local storage, we're good
                } catch {
                    console.error('Failed to parse saved settings');
                }
            }

            // 2. Fetch from Supabase (public profile)
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('owner_profile')
                    .select('business_name, phone, email, address')
                    .limit(1)
                    .single();

                if (data && !error) {
                    setBusinessInfo({
                        businessName: data.business_name || 'MI Printers',
                        phone: data.phone || '',
                        email: data.email || '',
                        address: data.address || 'Lahore, Pakistan',
                    });
                } else {
                    // Fallback default
                    setBusinessInfo({
                        businessName: 'MI Printers',
                        phone: '',
                        email: '',
                        address: 'Lahore, Pakistan',
                    });
                }
            } catch (error) {
                console.error('Failed to load business info:', error);
            }
        };

        loadInfo();
    }, []);

    const handleWhatsAppSubmit = () => {
        if (!formData.name || !formData.phone || !formData.message) {
            alert('Please fill in Name, Phone, and Message fields');
            return;
        }

        // Format message for WhatsApp
        const whatsappMessage = `*New Inquiry from Website*

Name: ${formData.name}
Phone: ${formData.phone}
${formData.email ? `Email: ${formData.email}\n` : ''}
Message:
${formData.message}`;

        const phoneNumber = businessInfo?.phone?.replace(/\D/g, '') || '923001234567';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

        window.open(whatsappUrl, '_blank');
    };

    const handleEmailSubmit = () => {
        if (!formData.name || !formData.message) {
            alert('Please fill in Name and Message fields');
            return;
        }

        const subject = `Inquiry from ${formData.name}`;
        const body = `Name: ${formData.name}
Phone: ${formData.phone || 'Not provided'}
Email: ${formData.email || 'Not provided'}

Message:
${formData.message}`;

        const toEmail = businessInfo?.email || 'info@miprinters.pk';
        const mailtoUrl = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoUrl;
    };

    const displayPhone = businessInfo?.phone || '0300-1234567';
    const cleanPhone = displayPhone.replace(/\D/g, '');
    const displayEmail = businessInfo?.email || 'info@miprinters.pk';

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-sm">
                            MI
                        </div>
                        <span className="font-bold text-gray-900">{businessInfo?.businessName || 'MI Printers'}</span>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">
                            About
                        </Link>
                        <Link href="/contact" className="text-sm text-green-600 font-medium">
                            Contact
                        </Link>
                        <Link href="/login" className="btn-primary text-sm px-4 py-2">
                            Owner Login
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className="pt-24 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">Contact Us</h1>
                    <p className="text-xl text-gray-600 text-center mb-12">
                        Get in touch with us for a free quote or any questions about our services.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Contact Info */}
                        <div className="space-y-6">
                            <div className="card">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h2>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <span className="text-2xl">📞</span>
                                        <div>
                                            <p className="font-medium text-gray-900">Phone</p>
                                            <a href={`tel:+${cleanPhone}`} className="text-green-600 hover:text-green-700">
                                                {displayPhone}
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-2xl">📧</span>
                                        <div>
                                            <p className="font-medium text-gray-900">Email</p>
                                            <a href={`mailto:${displayEmail}`} className="text-green-600 hover:text-green-700">
                                                {displayEmail}
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-2xl">💬</span>
                                        <div>
                                            <p className="font-medium text-gray-900">WhatsApp</p>
                                            <a
                                                href={`https://wa.me/${cleanPhone || '923001234567'}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:text-green-700"
                                            >
                                                Chat on WhatsApp
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-2xl">📍</span>
                                        <div>
                                            <p className="font-medium text-gray-900">Address</p>
                                            <p className="text-gray-600">{businessInfo?.address || 'Lahore, Pakistan'}</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="card bg-green-50 border-green-200">
                                <h2 className="text-lg font-bold text-gray-900 mb-2">Business Hours</h2>
                                <p className="text-gray-600">Monday - Saturday: 9:00 AM - 7:00 PM</p>
                                <p className="text-gray-600">Sunday: Closed</p>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="card">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Send us a Message</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input"
                                        placeholder="03XX-XXXXXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input"
                                        placeholder="your@email.com (optional)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Message <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        rows={4}
                                        className="input"
                                        placeholder="Tell us about your printing needs..."
                                    />
                                </div>

                                {/* Two send options */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleWhatsAppSubmit}
                                        className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        💬 WhatsApp
                                    </button>
                                    <button
                                        onClick={handleEmailSubmit}
                                        className="btn-secondary py-3 flex items-center justify-center gap-2"
                                    >
                                        📧 Email
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                    Choose how you&apos;d like to send your message
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8">
                <div className="max-w-6xl mx-auto px-4 text-center text-sm">
                    © 2024 {businessInfo?.businessName || 'MI Printers'}. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
