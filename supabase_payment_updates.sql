-- =============================================
-- PAYMENT ENHANCEMENTS MIGRATION
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT NOT NULL UNIQUE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL CHECK (amount >= 0),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_method TEXT NOT NULL, -- 'cash', 'bank', 'cheque', etc.
    reference_number TEXT,
    notes TEXT,
    sync_status TEXT DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns if they don't exist (migrations for existing table)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'payment_date'
    ) THEN
        ALTER TABLE payments ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE payments ADD COLUMN payment_method TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'reference_number'
    ) THEN
        ALTER TABLE payments ADD COLUMN reference_number TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'notes'
    ) THEN
        ALTER TABLE payments ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 3. Create/Update sync_payment function
DROP FUNCTION IF EXISTS sync_payment(TEXT, TEXT, DECIMAL, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION sync_payment(
    p_local_id TEXT,
    p_invoice_local_id TEXT,
    p_amount DECIMAL,
    p_payment_date TIMESTAMP WITH TIME ZONE,
    p_payment_method TEXT,
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_invoice_id UUID;
BEGIN
    -- Find invoice UUID from local_id
    SELECT id INTO v_invoice_id FROM invoices WHERE local_id = p_invoice_local_id;
    
    IF v_invoice_id IS NULL THEN
        -- Try to look up by invoice_number if needed, or fail
        -- Ideally, invoice should be synced first. 
        -- If not found, we can't link payment. 
        -- Return NULL or raise error? Raise error to retry later.
        RAISE EXCEPTION 'Invoice not found for local_id %', p_invoice_local_id;
    END IF;

    -- Check if payment exists
    SELECT id INTO v_id FROM payments WHERE local_id = p_local_id;
    
    IF v_id IS NOT NULL THEN
        UPDATE payments SET
            amount = p_amount,
            payment_date = p_payment_date,
            payment_method = p_payment_method,
            reference_number = p_reference_number,
            notes = p_notes,
            sync_status = 'synced'
        WHERE id = v_id;
    ELSE
        INSERT INTO payments (local_id, invoice_id, amount, payment_date, payment_method, reference_number, notes, sync_status)
        VALUES (p_local_id, v_invoice_id, p_amount, p_payment_date, p_payment_method, p_reference_number, p_notes, 'synced')
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_payment(TEXT, TEXT, DECIMAL, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sync_payment(TEXT, TEXT, DECIMAL, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT) TO authenticated;
