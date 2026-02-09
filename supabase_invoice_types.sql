-- =============================================
-- DUAL INVOICE TYPES MIGRATION
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add tax fields to customers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'st_reg_no'
    ) THEN
        ALTER TABLE customers ADD COLUMN st_reg_no TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'ntn_no'
    ) THEN
        ALTER TABLE customers ADD COLUMN ntn_no TEXT;
    END IF;
END $$;

-- 2. Add invoice_type to invoices table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_type'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT 'A';
        CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
    END IF;
END $$;

-- 3. Add Type B fields to invoice_items table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_items' AND column_name = 'weight'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN weight DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_items' AND column_name = 'value_excl_tax'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN value_excl_tax DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_items' AND column_name = 'sales_tax_percent'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN sales_tax_percent DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_items' AND column_name = 'total_sales_tax'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN total_sales_tax DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_items' AND column_name = 'value_incl_tax'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN value_incl_tax DECIMAL DEFAULT 0;
    END IF;
END $$;

-- 4. Add owner tax fields to owner_profile table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owner_profile' AND column_name = 'st_reg_no'
    ) THEN
        ALTER TABLE owner_profile ADD COLUMN st_reg_no TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owner_profile' AND column_name = 'ntn_no'
    ) THEN
        ALTER TABLE owner_profile ADD COLUMN ntn_no TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owner_profile' AND column_name = 'next_invoice_number_b'
    ) THEN
        ALTER TABLE owner_profile ADD COLUMN next_invoice_number_b INTEGER DEFAULT 1;
    END IF;
END $$;

-- 5. Update sync_customer function to handle new fields
DROP FUNCTION IF EXISTS sync_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS sync_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT);

CREATE OR REPLACE FUNCTION sync_customer(
    p_local_id TEXT,
    p_name TEXT,
    p_company TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_st_reg_no TEXT DEFAULT NULL,
    p_ntn_no TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM customers WHERE local_id = p_local_id;
    
    IF v_id IS NOT NULL THEN
        UPDATE customers SET
            name = p_name,
            company = p_company,
            phone = p_phone,
            email = p_email,
            address = p_address,
            city = p_city,
            notes = p_notes,
            is_active = p_is_active,
            st_reg_no = p_st_reg_no,
            ntn_no = p_ntn_no,
            sync_status = 'synced',
            updated_at = NOW()
        WHERE id = v_id;
    ELSE
        INSERT INTO customers (local_id, name, company, phone, email, address, city, notes, is_active, st_reg_no, ntn_no, sync_status)
        VALUES (p_local_id, p_name, p_company, p_phone, p_email, p_address, p_city, p_notes, p_is_active, p_st_reg_no, p_ntn_no, 'synced')
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sync_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;

-- 6. Update sync_invoice function to handle invoice_type
DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT);

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
    p_is_deleted BOOLEAN DEFAULT FALSE,
    p_invoice_type TEXT DEFAULT 'A'
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
            invoice_type = p_invoice_type,
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
            status, custom_columns, is_deleted, invoice_type, sync_status
        )
        VALUES (
            p_local_id, p_invoice_number, p_customer_id, p_walk_in_customer_name,
            p_invoice_date, p_due_date, p_subtotal, p_tax_amount, p_total_amount,
            p_design_charges, p_delivery_charges, p_tax_rate, p_other_charges,
            p_other_charges_label, p_total_cost, p_margin, p_margin_percentage,
            p_payment_status, p_amount_paid, p_balance_due, p_notes, p_internal_notes,
            p_status, p_custom_columns, p_is_deleted, p_invoice_type, 'synced'
        )
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;

-- Done! Summary:
-- - Customers: Added st_reg_no, ntn_no
-- - Invoices: Added invoice_type ('A' or 'B')
-- - Invoice Items: Added weight, value_excl_tax, sales_tax_percent, total_sales_tax, value_incl_tax
-- - Owner Profile: Added st_reg_no, ntn_no, next_invoice_number_b
