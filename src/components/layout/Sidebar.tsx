'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/invoices', label: 'Invoices', icon: '📄' },
    { href: '/customers', label: 'Customers', icon: '👥' },
    { href: '/suppliers', label: 'Suppliers', icon: '🏭' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { ownerEmail, businessName, clearAuth } = useAuthStore();

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
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-white border-r border-gray-200 lg:flex">
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white font-bold">
                    MI
                </div>
                <span className="text-lg font-bold text-gray-900">{businessName || 'MI Printers'}</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors
                    ${isActive
                                            ? 'bg-green-50 text-green-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User & Logout */}
            <div className="border-t border-gray-200 p-4">
                <div className="mb-3 rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Logged in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{ownerEmail || 'Owner'}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}
