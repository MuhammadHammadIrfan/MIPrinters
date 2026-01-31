'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPhone } from '@/lib/utils/formatters';

interface BusinessInfo {
  businessName: string;
  phone: string;
  email: string;
  address: string;
}

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

export default function HomePage() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    businessName: 'MI Printers',
    phone: '',
    email: '',
    address: 'Lahore, Pakistan',
  });

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
        } catch {
          console.error('Failed to parse saved settings');
        }
      }

      // 2. Fetch from Supabase (source of truth)
      if (navigator.onLine) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('owner_profile')
            .select('business_name, phone, email, address')
            .limit(1)
            .single();

          if (data && !error) {
            const info = {
              businessName: data.business_name || 'MI Printers',
              phone: data.phone || '',
              email: data.email || '',
              address: data.address || 'Lahore, Pakistan',
            };
            setBusinessInfo(info);
            // Cache it
            const existing = saved ? JSON.parse(saved) : {};
            localStorage.setItem('miprinters_settings', JSON.stringify({ ...existing, ...info }));
          }
        } catch (error) {
          console.error('Failed to load business info:', error);
        }
      }
    };

    loadInfo();
  }, []);

  const displayPhone = formatPhone(businessInfo.phone) || '0300-1234567';
  const cleanPhone = businessInfo.phone.replace(/\D/g, '') || '03001234567';
  const whatsappPhone = formatPhoneForWhatsApp(businessInfo.phone || '03001234567');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-sm">
              MI
            </div>
            <span className="font-bold text-gray-900">{businessInfo.businessName}</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">
              About
            </Link>
            <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">
              Contact
            </Link>
            <Link href="/login" className="btn-primary text-sm px-4 py-2">
              Owner Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm">
            <span>🖨️</span>
            <span>Professional Printing Services</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Your Trusted{' '}
            <span className="text-green-600">Printing</span>{' '}
            Partner
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {businessInfo.businessName} delivers high-quality printing solutions for all your business needs.
            From business cards to large format banners, we&apos;ve got you covered.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="btn-primary px-8 py-3 text-lg">
              Get a Quote
            </Link>
            <a href={`tel:+${cleanPhone}`} className="btn-secondary px-8 py-3 text-lg flex items-center gap-2">
              <span>📞</span>
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Our Services
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '📄', title: 'Offset Printing', desc: 'High-volume, premium quality printing for magazines, brochures, and catalogs with cost-effective bulk pricing.' },
              { icon: '🖼️', title: 'Digital Printing', desc: 'On-demand, fast-turnaround printing for business cards, flyers, and short-run projects with crisp vibrant colors.' },
              { icon: '📦', title: 'Packaging Solutions', desc: 'Custom-branded boxes, bags, and rigid packaging designed to elevate your product presentation.' },
              { icon: '🎨', title: 'Creative Design', desc: 'Expert prepress and graphic design services to bring your brand vision to life with professional polish.' },
              { icon: '✉️', title: 'Cards & Stationery', desc: 'Exquisite wedding cards, visiting cards, letterheads, and envelopes tailored to your personal or corporate identity.' },
              { icon: '🏷️', title: 'Labels & Stickers', desc: 'Premium adhesive labels, product stickers, and custom die-cut decals for all applications.' },
            ].map((service, index) => (
              <div key={index} className="card hover:border-green-500 transition-colors">
                <span className="text-4xl mb-4 block">{service.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h2>
          <p className="text-green-100 mb-8 text-lg">
            Get in touch with us today for a free consultation and quote.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors">
              Contact Us
            </Link>
            <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noopener noreferrer" className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors flex items-center gap-2">
              <span>💬</span>
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-sm">
                  MI
                </div>
                <span className="font-bold text-white">{businessInfo.businessName}</span>
              </div>
              <p className="text-sm">
                Your trusted partner for all printing needs in {businessInfo.address || 'Pakistan'}.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>📞 {displayPhone}</li>
                <li>📧 {businessInfo.email || 'info@miprinters.pk'}</li>
                <li>📍 {businessInfo.address || 'Lahore, Pakistan'}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/login" className="hover:text-white">Owner Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            © {new Date().getFullYear()} {businessInfo.businessName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
