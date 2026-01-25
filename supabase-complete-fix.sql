-- ============================================
-- MI PRINTERS - COMPREHENSIVE DATABASE FIX
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. LOGIN FUNCTION (for authentication)
-- This bypasses RLS to check credentials
-- ============================================
CREATE OR REPLACE FUNCTION login_owner(input_email TEXT, plain_password TEXT)
RETURNS JSON AS $$
DECLARE
    stored_hash TEXT;
    owner_data JSON;
BEGIN
    -- Get the password hash
    SELECT password_hash INTO stored_hash 
    FROM owner_profile 
    WHERE email = input_email;
    
    IF stored_hash IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid email or password');
    END IF;
    
    -- Verify password
    IF stored_hash != crypt(plain_password, stored_hash) THEN
        RETURN json_build_object('success', false, 'error', 'Invalid email or password');
    END IF;
    
    -- Password is valid, return owner data
    SELECT json_build_object(
        'success', true,
        'user', json_build_object(
            'id', id,
            'email', email,
            'businessName', business_name
        )
    ) INTO owner_data
    FROM owner_profile
    WHERE email = input_email;
    
    RETURN owner_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon (needed for login before authenticated)
GRANT EXECUTE ON FUNCTION login_owner(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION login_owner(TEXT, TEXT) TO authenticated;

-- ============================================
-- 2. SYNC FUNCTIONS (bypass RLS for data sync)
-- These are SECURITY DEFINER so they can write data
-- ============================================

-- Sync customer function
CREATE OR REPLACE FUNCTION sync_customer(
    p_local_id TEXT,
    p_name TEXT,
    p_company TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Check if customer exists by local_id
    SELECT id INTO v_id FROM customers WHERE local_id = p_local_id;
    
    IF v_id IS NOT NULL THEN
        -- Update existing
        UPDATE customers SET
            name = p_name,
            company = p_company,
            phone = p_phone,
            email = p_email,
            address = p_address,
            city = p_city,
            notes = p_notes,
            is_active = p_is_active,
            sync_status = 'synced',
            updated_at = NOW()
        WHERE id = v_id;
    ELSE
        -- Insert new
        INSERT INTO customers (name, company, phone, email, address, city, notes, is_active, local_id, sync_status)
        VALUES (p_name, p_company, p_phone, p_email, p_address, p_city, p_notes, p_is_active, p_local_id, 'synced')
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION sync_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Sync invoice function
CREATE OR REPLACE FUNCTION sync_invoice(
    p_local_id TEXT,
    p_invoice_number TEXT,
    p_customer_id UUID DEFAULT NULL,
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
    p_status TEXT DEFAULT 'final'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Check if invoice exists by local_id
    SELECT id INTO v_id FROM invoices WHERE local_id = p_local_id;
    
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
            sync_status = 'synced',
            updated_at = NOW()
        WHERE id = v_id;
    ELSE
        -- Insert new
        INSERT INTO invoices (
            invoice_number, customer_id, invoice_date, due_date,
            subtotal, tax_amount, total_amount, design_charges, delivery_charges,
            tax_rate, other_charges, other_charges_label, total_cost, margin, margin_percentage,
            payment_status, amount_paid, balance_due, notes, internal_notes, status, local_id, sync_status
        )
        VALUES (
            p_invoice_number, p_customer_id, p_invoice_date, p_due_date,
            p_subtotal, p_tax_amount, p_total_amount, p_design_charges, p_delivery_charges,
            p_tax_rate, p_other_charges, p_other_charges_label, p_total_cost, p_margin, p_margin_percentage,
            p_payment_status, p_amount_paid, p_balance_due, p_notes, p_internal_notes, p_status, p_local_id, 'synced'
        )
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sync_invoice(TEXT, TEXT, UUID, DATE, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================
-- 3. DISABLE RLS (simpler for single-user app)
-- Since this is a single-owner business app,
-- RLS adds complexity without much benefit
-- ============================================
ALTER TABLE owner_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE signed_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. GRANT TABLE PERMISSIONS TO ANON
-- ============================================
GRANT SELECT, INSERT, UPDATE ON customers TO anon;
GRANT SELECT, INSERT, UPDATE ON invoices TO anon;
GRANT SELECT, INSERT, UPDATE ON invoice_items TO anon;
GRANT SELECT, INSERT, UPDATE ON suppliers TO anon;
GRANT SELECT, INSERT, UPDATE ON payments TO anon;
GRANT SELECT ON owner_profile TO anon;

-- ============================================
-- 5. VERIFY OWNER EXISTS
-- Check if you have an owner profile set up
-- ============================================
SELECT 'Owner exists: ' || COALESCE(email, 'NO OWNER FOUND') FROM owner_profile LIMIT 1;

-- If no owner exists, create one (CHANGE THESE VALUES!):
-- INSERT INTO owner_profile (email, password_hash, business_name)
-- VALUES ('your@email.com', crypt('your_password', gen_salt('bf', 10)), 'MI Printers');
