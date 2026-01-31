-- =============================================
-- SOFT DELETE MIGRATION
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add is_deleted column to invoices table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE invoices ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_invoices_is_deleted ON invoices(is_deleted);
    END IF;
END $$;

-- 2. Add is_active column to suppliers if not exists (customers already has it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'suppliers' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
    END IF;
END $$;

-- 3. Update sync_invoice function to handle is_deleted
DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, BOOLEAN);

CREATE OR REPLACE FUNCTION sync_invoice(
    p_local_id TEXT,
    p_invoice_number TEXT,
    p_customer_id UUID DEFAULT NULL,
    p_walk_in_customer_name TEXT DEFAULT NULL,
    p_invoice_date DATE DEFAULT CURRENT_DATE,
    p_due_date DATE DEFAULT NULL,
    p_subtotal DECIMAL DEFAULT 0,
    p_tax_amount DECIMAL DEFAULT 0,
    p_total_amount DECIMAL DEFAULT 0,
    p_design_charges DECIMAL DEFAULT 0,
    p_delivery_charges DECIMAL DEFAULT 0,
    p_tax_rate DECIMAL DEFAULT 0,
    p_other_charges DECIMAL DEFAULT 0,
    p_other_charges_label TEXT DEFAULT NULL,
    p_total_cost DECIMAL DEFAULT 0,
    p_margin DECIMAL DEFAULT 0,
    p_margin_percentage DECIMAL DEFAULT 0,
    p_payment_status TEXT DEFAULT 'unpaid',
    p_amount_paid DECIMAL DEFAULT 0,
    p_balance_due DECIMAL DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_internal_notes TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'final',
    p_custom_columns JSONB DEFAULT '[]'::jsonb,
    p_is_deleted BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- First, check if invoice exists by local_id (primary check)
    SELECT id INTO v_id FROM invoices WHERE local_id = p_local_id;
    
    -- If not found by local_id, also check by invoice_number (to handle duplicates)
    IF v_id IS NULL AND NOT p_is_deleted THEN
        SELECT id INTO v_id FROM invoices WHERE invoice_number = p_invoice_number;
    END IF;
    
    IF v_id IS NOT NULL THEN
        -- Update existing (found by local_id OR invoice_number)
        UPDATE invoices SET
            local_id = p_local_id,
            invoice_number = p_invoice_number,
            customer_id = p_customer_id,
            walk_in_customer_name = p_walk_in_customer_name,
            invoice_date = p_invoice_date,
            due_date = p_due_date,
            subtotal = p_subtotal,
            tax_amount = p_tax_amount,
            total_amount = p_total_amount,
            design_charges = p_design_charges,
            delivery_charges = p_delivery_charges,
            tax_rate = p_tax_rate,
            other_charges = p_other_charges,
            other_charges_label = p_other_charges_label,
            total_cost = p_total_cost,
            margin = p_margin,
            margin_percentage = p_margin_percentage,
            payment_status = p_payment_status,
            amount_paid = p_amount_paid,
            balance_due = p_balance_due,
            notes = p_notes,
            internal_notes = p_internal_notes,
            status = p_status,
            custom_columns = p_custom_columns,
            is_deleted = p_is_deleted,
            sync_status = 'synced',
            updated_at = NOW()
        WHERE id = v_id;
    ELSE
        -- Insert new
        INSERT INTO invoices (
            local_id, invoice_number, customer_id, walk_in_customer_name,
            invoice_date, due_date, subtotal, tax_amount, total_amount,
            design_charges, delivery_charges, tax_rate, other_charges,
            other_charges_label, total_cost, margin, margin_percentage,
            payment_status, amount_paid, balance_due, notes, internal_notes,
            status, custom_columns, is_deleted, sync_status
        )
        VALUES (
            p_local_id, p_invoice_number, p_customer_id, p_walk_in_customer_name,
            p_invoice_date, p_due_date, p_subtotal, p_tax_amount, p_total_amount,
            p_design_charges, p_delivery_charges, p_tax_rate, p_other_charges,
            p_other_charges_label, p_total_cost, p_margin, p_margin_percentage,
            p_payment_status, p_amount_paid, p_balance_due, p_notes, p_internal_notes,
            p_status, p_custom_columns, p_is_deleted, 'synced'
        )
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, BOOLEAN) TO authenticated;

-- 5. Update sync_supplier function to handle is_active properly
DROP FUNCTION IF EXISTS sync_supplier(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION sync_supplier(
    p_local_id TEXT,
    p_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_supplier_type TEXT DEFAULT 'other',
    p_notes TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM suppliers WHERE local_id = p_local_id;
    
    IF v_id IS NOT NULL THEN
        UPDATE suppliers SET
            name = p_name,
            phone = p_phone,
            supplier_type = p_supplier_type,
            notes = p_notes,
            is_active = p_is_active,
            sync_status = 'synced',
            updated_at = NOW()
        WHERE id = v_id;
    ELSE
        INSERT INTO suppliers (local_id, name, phone, supplier_type, notes, is_active, sync_status)
        VALUES (p_local_id, p_name, p_phone, p_supplier_type, p_notes, p_is_active, 'synced')
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_supplier(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION sync_supplier(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Done! Now soft delete will work for:
-- - Customers (already have is_active, just set to false on delete)
-- - Suppliers (using is_active)
-- - Invoices (using is_deleted)
