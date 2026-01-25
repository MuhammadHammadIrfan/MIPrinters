'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

const navItems = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/invoices', label: 'Invoices', icon: '📄' },
    { href: '/customers', label: 'Customers', icon: '👥' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { clearAuth } = useAuthStore();
    const [showMenu, setShowMenu] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            clearAuth();
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
            {/* Logout Menu Overlay */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                    onClick={() => setShowMenu(false)}
                />
            )}

            {/* Slide-up Menu */}
            {showMenu && (
                <div className="fixed bottom-16 left-0 right-0 z-50 lg:hidden animate-slide-up">
                    <div className="mx-4 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                        <Link
                            href="/suppliers"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                            onClick={() => setShowMenu(false)}
                        >
                            <span className="text-xl">🏭</span>
                            <span className="text-gray-700">Suppliers</span>
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600"
                        >
                            <span className="text-xl">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
                <div className="flex items-center justify-around h-16">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[60px]
                  ${isActive ? 'text-green-600' : 'text-gray-500'}`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[60px]
              ${showMenu ? 'text-green-600' : 'text-gray-500'}`}
                    >
                        <span className="text-xl">☰</span>
                        <span className="text-xs font-medium">More</span>
                    </button>
                </div>
            </nav>

            <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
        </>
    );
}
