-- =============================================
-- PAYMENT SYNC FIX
-- Updates sync_payment to accept invoice UUID directly
-- =============================================

DROP FUNCTION IF EXISTS sync_payment(TEXT, TEXT, DECIMAL, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS sync_payment(TEXT, TEXT, UUID, DECIMAL, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION sync_payment(
    p_local_id TEXT,
    p_invoice_local_id TEXT,
    p_amount DECIMAL,
    p_payment_date TIMESTAMP WITH TIME ZONE,
    p_payment_method TEXT,
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_invoice_id UUID DEFAULT NULL -- New optional parameter
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_invoice_id UUID;
BEGIN
    -- Determine Invoice UUID
    IF p_invoice_id IS NOT NULL THEN
        v_invoice_id := p_invoice_id;
    ELSE
        -- Fallback to looking up by local_id
        SELECT id INTO v_invoice_id FROM invoices WHERE local_id = p_invoice_local_id;
    END IF;
    
    IF v_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Invoice not found. Local ID: %, UUID: %', p_invoice_local_id, p_invoice_id;
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
            invoice_id = v_invoice_id, -- Ensure linked to correct invoice
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
