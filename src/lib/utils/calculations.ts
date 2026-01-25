import type { InvoiceItemInput } from '@/types/database';

/**
 * Calculate line item amount
 */
export function calculateItemAmount(quantity: number, rate: number): number {
    return Math.round(quantity * rate * 100) / 100;
}

/**
 * Calculate line item margin
 */
export function calculateItemMargin(amount: number, cost: number, quantity: number): number {
    return Math.round((amount - cost * quantity) * 100) / 100;
}

/**
 * Calculate invoice totals from items
 */
export function calculateInvoiceTotals(
    items: InvoiceItemInput[],
    additionalCharges: {
        designCharges?: number;
        deliveryCharges?: number;
        taxRate?: number;
        otherCharges?: number;
    } = {}
) {
    const {
        designCharges = 0,
        deliveryCharges = 0,
        taxRate = 0,
        otherCharges = 0,
    } = additionalCharges;

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => {
        return sum + calculateItemAmount(item.quantity, item.rate);
    }, 0);

    // Calculate total cost (internal)
    const totalCost = items.reduce((sum, item) => {
        return sum + (item.cost || 0) * item.quantity;
    }, 0);

    // Pre-tax total
    const preTaxTotal = subtotal + designCharges + deliveryCharges + otherCharges;

    // Tax amount
    const taxAmount = Math.round(preTaxTotal * (taxRate / 100) * 100) / 100;

    // Final total
    const totalAmount = Math.round((preTaxTotal + taxAmount) * 100) / 100;

    // Margin
    const margin = Math.round((totalAmount - totalCost) * 100) / 100;
    const marginPercentage = totalAmount > 0 ? Math.round((margin / totalAmount) * 10000) / 100 : 0;

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        taxAmount,
        totalAmount,
        margin,
        marginPercentage,
    };
}

/**
 * Calculate balance due
 */
export function calculateBalanceDue(totalAmount: number, amountPaid: number): number {
    return Math.round((totalAmount - amountPaid) * 100) / 100;
}

/**
 * Determine payment status based on amounts
 */
export function getPaymentStatus(
    totalAmount: number,
    amountPaid: number
): 'unpaid' | 'partial' | 'paid' {
    if (amountPaid <= 0) return 'unpaid';
    if (amountPaid >= totalAmount) return 'paid';
    return 'partial';
}

/**
 * Generate next invoice number
 */
export function generateInvoiceNumber(prefix: string, nextNumber: number): string {
    const year = new Date().getFullYear();
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${prefix}-${year}-${paddedNumber}`;
}

/**
 * Generate next quotation number
 */
export function generateQuotationNumber(prefix: string, nextNumber: number): string {
    const year = new Date().getFullYear();
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${prefix}-${year}-${paddedNumber}`;
}
