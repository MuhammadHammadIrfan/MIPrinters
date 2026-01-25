/**
 * Format a number as Pakistani Rupees
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a number with commas (no currency symbol)
 */
export function formatNumber(num: number, decimals = 2): string {
    return new Intl.NumberFormat('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(num);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | number | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | number | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

/**
 * Format time
 */
export function formatTime(date: Date | number | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-PK', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format phone number (Pakistan format)
 */
export function formatPhone(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Format as 03XX-XXXXXXX
    if (digits.length === 11 && digits.startsWith('03')) {
        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
}
