-- 1. Add the walk_in_customer_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'walk_in_customer_name') THEN
        ALTER TABLE invoices ADD COLUMN walk_in_customer_name TEXT;
    END IF;
END $$;

-- 2. Drop all existing overloads of sync_invoice to prevent conflicts
DO $$
BEGIN
    -- Drop function with various signatures (ignore errors if they don't exist)
    BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT)';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, JSONB)';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB)';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- 3. Create the sync_invoice function with EXACT parameter order matching JS code
-- The JS sends parameters in this order (from syncService.ts lines 340-364):
--   p_local_id, p_invoice_number, p_customer_id, p_walk_in_customer_name (4th!),
--   p_invoice_date, p_due_date, p_subtotal, p_tax_amount, p_total_amount,
--   p_design_charges, p_delivery_charges, p_tax_rate, p_other_charges,
--   p_other_charges_label, p_total_cost, p_margin, p_margin_percentage,
--   p_payment_status, p_amount_paid, p_balance_due, p_notes, p_internal_notes,
--   p_status, p_custom_columns
CREATE OR REPLACE FUNCTION sync_invoice(
    p_local_id TEXT,
    p_invoice_number TEXT,
    p_customer_id UUID DEFAULT NULL,
    p_walk_in_customer_name TEXT DEFAULT NULL,  -- 4th parameter to match JS
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
    p_custom_columns JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- First, check if invoice exists by local_id (primary check)
    SELECT id INTO v_id FROM invoices WHERE local_id = p_local_id;
    
    -- If not found by local_id, also check by invoice_number (to handle duplicates)
    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM invoices WHERE invoice_number = p_invoice_number;
    END IF;
    
    IF v_id IS NOT NULL THEN
        -- Update existing (found by local_id OR invoice_number)
        UPDATE invoices SET
            local_id = p_local_id,  -- Update local_id in case we found by invoice_number
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
            status, custom_columns, sync_status
        )
        VALUES (
            p_local_id, p_invoice_number, p_customer_id, p_walk_in_customer_name,
            p_invoice_date, p_due_date, p_subtotal, p_tax_amount, p_total_amount,
            p_design_charges, p_delivery_charges, p_tax_rate, p_other_charges,
            p_other_charges_label, p_total_cost, p_margin, p_margin_percentage,
            p_payment_status, p_amount_paid, p_balance_due, p_notes, p_internal_notes,
            p_status, p_custom_columns, 'synced'
        )
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions to both anon and authenticated roles
-- The signature now has 24 parameters in this exact order:
-- TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB
GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, TEXT, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB) TO authenticated;