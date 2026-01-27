'use client';

import { useEffect } from 'react';
import { Sidebar, BottomNav } from '@/components/layout';
import { Calculator, CalculatorButton } from '@/components/calculator/Calculator';
import { initializeAutoSync } from '@/lib/sync/syncService';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Initialize auto-sync on mount
    useEffect(() => {
        initializeAutoSync();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="lg:pl-64 pb-20 lg:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />

            {/* Calculator */}
            <CalculatorButton />
            <Calculator />
        </div>
    );
}
