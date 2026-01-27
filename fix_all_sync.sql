-- =============================================
-- FIX 1: Add missing columns to owner_profile
-- =============================================
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS account_title TEXT;
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC DEFAULT 0;
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS default_payment_terms INTEGER DEFAULT 7;
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =============================================
-- FIX 2: Create sync_supplier RPC
-- =============================================
CREATE OR REPLACE FUNCTION sync_supplier(
    p_local_id TEXT,
    p_name TEXT,
    p_phone TEXT,
    p_supplier_type TEXT,
    p_notes TEXT,
    p_is_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Try to find existing supplier by local_id
    SELECT id INTO v_id FROM suppliers WHERE local_id = p_local_id LIMIT 1;

    IF v_id IS NOT NULL THEN
        -- Update existing
        UPDATE suppliers SET
            name = p_name,
            phone = p_phone,
            supplier_type = p_supplier_type,
            notes = p_notes,
            is_active = p_is_active,
            updated_at = NOW()
        WHERE id = v_id;
    ELSE
        -- Insert new
        INSERT INTO suppliers (local_id, name, phone, supplier_type, notes, is_active)
        VALUES (p_local_id, p_name, p_phone, p_supplier_type, p_notes, p_is_active)
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION sync_supplier TO authenticated;

-- =============================================
-- FIX 3: Update sync_invoice RPC (Add custom_columns)
-- =============================================
-- First, DROP the old function with the EXACT signature to avoid "function name is not unique" errors
DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT);

-- Also drop generic signature if it matches my previous attempts (TimeStamp) just in case
DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, TIMESTAMP, TIMESTAMP, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION sync_invoice(
    p_local_id TEXT,
    p_invoice_number TEXT,
    p_customer_id UUID,
    p_invoice_date TIMESTAMP,
    p_due_date TIMESTAMP,
    p_subtotal NUMERIC,
    p_tax_amount NUMERIC,
    p_total_amount NUMERIC,
    p_design_charges NUMERIC,
    p_delivery_charges NUMERIC,
    p_tax_rate NUMERIC,
    p_other_charges NUMERIC,
    p_other_charges_label TEXT,
    p_total_cost NUMERIC,
    p_margin NUMERIC,
    p_margin_percentage NUMERIC,
    p_payment_status TEXT,
    p_amount_paid NUMERIC,
    p_balance_due NUMERIC,
    p_notes TEXT,
    p_internal_notes TEXT,
    p_status TEXT,
    p_custom_columns JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Try to find existing invoice by local_id
    SELECT id INTO v_id FROM invoices WHERE local_id = p_local_id LIMIT 1;

    IF v_id IS NOT NULL THEN
        -- Update existing
        UPDATE invoices SET
            invoice_number = p_invoice_number,
            customer_id = p_customer_id,
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
            updated_at = NOW()
        WHERE id = v_id;
    ELSE
        -- Insert new
        INSERT INTO invoices (
            local_id, invoice_number, customer_id, invoice_date, due_date,
            subtotal, tax_amount, total_amount, design_charges, delivery_charges,
            tax_rate, other_charges, other_charges_label, total_cost, margin, margin_percentage,
            payment_status, amount_paid, balance_due, notes, internal_notes, status, custom_columns
        )
        VALUES (
            p_local_id, p_invoice_number, p_customer_id, p_invoice_date, p_due_date,
            p_subtotal, p_tax_amount, p_total_amount, p_design_charges, p_delivery_charges,
            p_tax_rate, p_other_charges, p_other_charges_label, p_total_cost, p_margin, p_margin_percentage,
            p_payment_status, p_amount_paid, p_balance_due, p_notes, p_internal_notes, p_status, p_custom_columns
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_invoice TO authenticated;

-- =============================================
-- FIX 4: RLS Policies
-- =============================================
-- IMPORTANT: This app uses CUSTOM AUTHENTICATION (password in owner_profile)
-- NOT Supabase Auth. So we need to allow 'anon' role to access data.
-- For production, consider using service_role key instead.

-- Owner Profile (settings)
ALTER TABLE owner_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner can do everything on profile" ON owner_profile;
DROP POLICY IF EXISTS "Public read and write for owner_profile" ON owner_profile;
CREATE POLICY "Public read and write for owner_profile" ON owner_profile
    FOR ALL USING (true) WITH CHECK (true);

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can do everything on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Public access to suppliers" ON suppliers;
CREATE POLICY "Public access to suppliers" ON suppliers
    FOR ALL USING (true) WITH CHECK (true);

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can do everything on customers" ON customers;
DROP POLICY IF EXISTS "Public access to customers" ON customers;
CREATE POLICY "Public access to customers" ON customers
    FOR ALL USING (true) WITH CHECK (true);

-- Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can do everything on invoices" ON invoices;
DROP POLICY IF EXISTS "Public access to invoices" ON invoices;
CREATE POLICY "Public access to invoices" ON invoices
    FOR ALL USING (true) WITH CHECK (true);

-- Invoice Items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can do everything on invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Public access to invoice_items" ON invoice_items;
CREATE POLICY "Public access to invoice_items" ON invoice_items
    FOR ALL USING (true) WITH CHECK (true);
