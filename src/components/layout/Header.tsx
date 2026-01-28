'use client';

interface HeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
    return (
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">{title}</h1>
                    {subtitle && (
                        <div className="mt-0.5 text-sm text-gray-500">{subtitle}</div>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        </header>
    );
}
