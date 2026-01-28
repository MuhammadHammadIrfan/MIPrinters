'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useInvoiceStore } from '@/stores/invoiceStore';

interface DashboardStats {
    todaySales: number;
    todayInvoices: number;
    pendingAmount: number;
    pendingInvoices: number;
    monthSales: number;
    monthProfit: number;
    totalCustomers: number;
}

function StatCard({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle?: string; icon?: string; color: string }) {
    return (
        <div className="card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
                </div>
                {icon && (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                        <span className="text-xl">{icon}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const classes = {
        paid: 'badge-paid',
        unpaid: 'badge-unpaid',
        partial: 'badge-partial',
    }[status] || 'badge-unpaid';

    return <span className={classes}>{status.toUpperCase()}</span>;
}

export default function DashboardPage() {
    const hasLoadedRef = useRef(false);
    const { invoices, loadInvoices, getDashboardStats, isInitialized } = useInvoiceStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (hasLoadedRef.current) return;
            hasLoadedRef.current = true;

            setIsLoading(true);
            await loadInvoices();
            const dashStats = await getDashboardStats();
            setStats(dashStats);
            setIsLoading(false);
        };
        loadData();
    }, [loadInvoices, getDashboardStats]);

    const recentInvoices = invoices.slice(0, 5);

    return (
        <>
            <Header
                title="Dashboard"
                subtitle={formatDate(new Date())}
                actions={
                    <Link href="/invoices/new" className="btn-primary flex items-center gap-2">
                        <span>➕</span>
                        <span className="hidden sm:inline">New Invoice</span>
                    </Link>
                }
            />

            <div className="p-4 lg:p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        title="Today's Sales"
                        value={stats ? formatCurrency(stats.todaySales) : '—'}
                        subtitle={stats ? `${stats.todayInvoices} invoice${stats.todayInvoices !== 1 ? 's' : ''}` : undefined}
                        color="bg-green-100"
                    />
                    <StatCard
                        title="Pending"
                        value={stats ? formatCurrency(stats.pendingAmount) : '—'}
                        subtitle={stats ? `${stats.pendingInvoices} invoice${stats.pendingInvoices !== 1 ? 's' : ''}` : undefined}
                        color="bg-amber-100"
                    />
                    <StatCard
                        title="Month Profit"
                        value={stats ? formatCurrency(stats.monthProfit) : '—'}
                        color="bg-blue-100"
                    />
                    <StatCard
                        title="Customers"
                        value={stats ? String(stats.totalCustomers) : '—'}
                        color="bg-purple-100"
                    />
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Link
                            href="/invoices/new"
                            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-green-500 hover:bg-green-50 transition-colors"
                        >
                            <span className="text-2xl">📄</span>
                            <span className="text-sm font-medium text-gray-700">New Invoice</span>
                        </Link>
                        <Link
                            href="/customers/new"
                            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-green-500 hover:bg-green-50 transition-colors"
                        >
                            <span className="text-2xl">👤</span>
                            <span className="text-sm font-medium text-gray-700">Add Customer</span>
                        </Link>
                        <Link
                            href="/invoices"
                            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-green-500 hover:bg-green-50 transition-colors"
                        >
                            <span className="text-2xl">📋</span>
                            <span className="text-sm font-medium text-gray-700">All Invoices</span>
                        </Link>
                        <Link
                            href="/customers"
                            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-green-500 hover:bg-green-50 transition-colors"
                        >
                            <span className="text-2xl">👥</span>
                            <span className="text-sm font-medium text-gray-700">Customers</span>
                        </Link>
                    </div>
                </div>

                {/* Recent Invoices */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                        <Link href="/invoices" className="text-sm text-green-600 hover:text-green-700 font-medium">
                            View All →
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-8">
                            <span className="text-2xl animate-spin inline-block">⏳</span>
                        </div>
                    ) : recentInvoices.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <span className="text-3xl mb-2 block">📄</span>
                            <p>No invoices yet. Create your first invoice!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentInvoices.map((invoice) => (
                                <Link
                                    key={invoice.localId}
                                    href={`/invoices/${invoice.localId}`}
                                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-6 px-6 transition-colors"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-green-600">{invoice.invoiceNumber}</span>
                                            {invoice.status === 'draft' && (
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Draft</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{formatDate(new Date(invoice.invoiceDate))}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                                        <StatusBadge status={invoice.paymentStatus} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
