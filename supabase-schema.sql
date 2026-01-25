-- ============================================
-- MI PRINTERS - COMPLETE SUPABASE SQL SCHEMA
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For password hashing

-- ============================================
-- 1. OWNER PROFILE (Settings/Business Info + Auth)
-- ============================================
CREATE TABLE owner_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    -- Password stored as bcrypt hash (use pgcrypto's crypt function)
    password_hash TEXT NOT NULL,
    business_name TEXT NOT NULL DEFAULT 'MI Printers',
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    next_invoice_number INTEGER NOT NULL DEFAULT 1,
    quotation_prefix TEXT NOT NULL DEFAULT 'QUO-',
    next_quotation_number INTEGER NOT NULL DEFAULT 1,
    default_payment_terms INTEGER NOT NULL DEFAULT 15,
    bank_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FUNCTION: Hash password using bcrypt
-- ============================================
CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(plain_password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Verify password
-- ============================================
CREATE OR REPLACE FUNCTION verify_password(input_email TEXT, plain_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    stored_hash TEXT;
BEGIN
    SELECT password_hash INTO stored_hash FROM owner_profile WHERE email = input_email;
    
    IF stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN stored_hash = crypt(plain_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update password (with old password verification)
-- ============================================
CREATE OR REPLACE FUNCTION update_owner_password(
    input_email TEXT,
    old_password TEXT,
    new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    -- First verify the old password
    is_valid := verify_password(input_email, old_password);
    
    IF NOT is_valid THEN
        RETURN FALSE;
    END IF;
    
    -- Update to new password
    UPDATE owner_profile 
    SET password_hash = crypt(new_password, gen_salt('bf', 10)),
        updated_at = NOW()
    WHERE email = input_email;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CUSTOMERS
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    local_id TEXT UNIQUE,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster search
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- ============================================
-- 3. SUPPLIERS (Optional)
-- ============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    supplier_type TEXT CHECK (supplier_type IN ('offset', 'digital', 'binding', 'flexo', 'screen', 'other')),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    local_id TEXT UNIQUE,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- ============================================
-- 4. INVOICES
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Customer-facing amounts
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Additional charges
    design_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
    delivery_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    other_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_charges_label TEXT,
    
    -- INTERNAL ONLY - never on PDF
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    margin DECIMAL(12,2) NOT NULL DEFAULT 0,
    margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Payment tracking
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'void')),
    
    -- Sync
    local_id TEXT UNIQUE,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================
-- 5. INVOICE ITEMS (Line Items)
-- ============================================
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    specifications TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    rate DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- INTERNAL - never on PDF
    cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    item_margin DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    local_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_supplier_id ON invoice_items(supplier_id);

-- ============================================
-- 6. SIGNED PHOTOS (Invoice Delivery Photos)
-- ============================================
CREATE TABLE signed_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    local_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signed_photos_invoice_id ON signed_photos(invoice_id);

-- ============================================
-- 7. PAYMENTS
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'cheque', 'jazzcash', 'easypaisa', 'other')),
    reference_number TEXT,
    notes TEXT,
    local_id TEXT UNIQUE,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- ============================================
-- 8. QUOTATIONS (Optional)
-- ============================================
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    quotation_number TEXT NOT NULL UNIQUE,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')),
    converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    local_id TEXT UNIQUE,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_quotation_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_status ON quotations(status);

-- ============================================
-- 9. QUOTATION ITEMS
-- ============================================
CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    rate DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    local_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- ============================================
-- 10. SYNC QUEUE (For offline support)
-- ============================================
CREATE TABLE sync_queue (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier', 'invoice', 'quotation', 'payment')),
    entity_local_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    payload JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_local_id);

-- ============================================
-- TRIGGERS: Auto-update updated_at timestamp
-- NOTE: FOR EACH ROW means it fires ONLY for the
-- specific row being updated, NOT all rows in table
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- NEW refers to the single row being modified
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_owner_profile_updated_at
    BEFORE UPDATE ON owner_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-calculate invoice totals
-- FIXED: Properly calculates all values before update
-- ============================================
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal DECIMAL(12,2);
    v_total_cost DECIMAL(12,2);
    v_design_charges DECIMAL(12,2);
    v_delivery_charges DECIMAL(12,2);
    v_other_charges DECIMAL(12,2);
    v_tax_rate DECIMAL(5,2);
    v_amount_paid DECIMAL(12,2);
    v_tax_amount DECIMAL(12,2);
    v_total_amount DECIMAL(12,2);
    v_margin DECIMAL(12,2);
    v_margin_percentage DECIMAL(5,2);
    v_balance_due DECIMAL(12,2);
BEGIN
    -- Get the invoice ID (works for INSERT, UPDATE, and DELETE)
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate subtotal and cost from items for THIS SPECIFIC invoice only
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(cost * quantity), 0)
    INTO v_subtotal, v_total_cost
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;

    -- Get current invoice charges (to use in calculation)
    SELECT 
        design_charges,
        delivery_charges,
        other_charges,
        tax_rate,
        amount_paid
    INTO 
        v_design_charges,
        v_delivery_charges,
        v_other_charges,
        v_tax_rate,
        v_amount_paid
    FROM invoices
    WHERE id = v_invoice_id;

    -- Calculate all derived values BEFORE the update
    v_tax_amount := (v_subtotal + v_design_charges + v_delivery_charges + v_other_charges) * v_tax_rate / 100;
    v_total_amount := v_subtotal + v_design_charges + v_delivery_charges + v_other_charges + v_tax_amount;
    v_margin := v_subtotal - v_total_cost;
    v_margin_percentage := CASE WHEN v_subtotal > 0 THEN (v_margin / v_subtotal) * 100 ELSE 0 END;
    v_balance_due := v_total_amount - v_amount_paid;

    -- Update ONLY the specific invoice
    UPDATE invoices 
    SET 
        subtotal = v_subtotal,
        total_cost = v_total_cost,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount,
        margin = v_margin,
        margin_percentage = v_margin_percentage,
        balance_due = v_balance_due,
        updated_at = NOW()
    WHERE id = v_invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_invoice_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

-- ============================================
-- TRIGGER: Update payment status on payment change
-- Updates ONLY the specific invoice
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_paid DECIMAL(12,2);
    v_total_amount DECIMAL(12,2);
    v_balance_due DECIMAL(12,2);
    v_payment_status TEXT;
BEGIN
    -- Get the specific invoice ID
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Sum all payments for THIS SPECIFIC invoice only
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments WHERE invoice_id = v_invoice_id;
    
    -- Get this invoice's total amount
    SELECT total_amount INTO v_total_amount 
    FROM invoices WHERE id = v_invoice_id;
    
    -- Calculate derived values
    v_balance_due := v_total_amount - v_total_paid;
    v_payment_status := CASE 
        WHEN v_total_paid >= v_total_amount THEN 'paid'
        WHEN v_total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
    END;
    
    -- Update ONLY the specific invoice
    UPDATE invoices 
    SET 
        amount_paid = v_total_paid,
        balance_due = v_balance_due,
        payment_status = v_payment_status,
        updated_at = NOW()
    WHERE id = v_invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_status_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();

-- ============================================
-- FUNCTION: Generate next invoice number
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_number INTEGER;
    v_result TEXT;
BEGIN
    SELECT invoice_prefix, next_invoice_number 
    INTO v_prefix, v_number 
    FROM owner_profile LIMIT 1;
    
    IF v_prefix IS NULL THEN
        v_prefix := 'INV-';
        v_number := 1;
    END IF;
    
    v_result := v_prefix || LPAD(v_number::TEXT, 5, '0');
    
    -- Increment for next time
    UPDATE owner_profile SET next_invoice_number = next_invoice_number + 1;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Generate next quotation number
-- ============================================
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_number INTEGER;
    v_result TEXT;
BEGIN
    SELECT quotation_prefix, next_quotation_number 
    INTO v_prefix, v_number 
    FROM owner_profile LIMIT 1;
    
    IF v_prefix IS NULL THEN
        v_prefix := 'QUO-';
        v_number := 1;
    END IF;
    
    v_result := v_prefix || LPAD(v_number::TEXT, 5, '0');
    
    UPDATE owner_profile SET next_quotation_number = next_quotation_number + 1;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA: Create default owner profile
-- Default password: admin123 (CHANGE THIS!)
-- ============================================
INSERT INTO owner_profile (email, password_hash, business_name)
VALUES (
    'admin@miprinters.pk', 
    crypt('admin123', gen_salt('bf', 10)),  -- Default password: admin123
    'MI Printers'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable if you want to restrict access
-- ============================================
-- Uncomment these if you want to enable RLS:
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE signed_photos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE owner_profile ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STORAGE BUCKET FOR SIGNED PHOTOS
-- Run this separately in Supabase Storage settings
-- or via Supabase Dashboard > Storage > New Bucket
-- ============================================
-- Bucket name: signed-photos
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to add sample customers:
/*
INSERT INTO customers (name, company, phone, city) VALUES
('Ahmed Khan', 'Khan Enterprises', '0300-1234567', 'Lahore'),
('Sara Ali', 'Ali Trading Co.', '0321-9876543', 'Karachi'),
('Usman Malik', NULL, '0333-5555555', 'Islamabad');
*/

-- ============================================
-- DONE! Your database is ready.
-- ============================================
-- 
-- PASSWORD FUNCTIONS USAGE:
-- 
-- To LOGIN (verify password):
--   SELECT verify_password('admin@miprinters.pk', 'admin123');
--   Returns TRUE if valid, FALSE if invalid
-- 
-- To CHANGE PASSWORD:
--   SELECT update_owner_password('admin@miprinters.pk', 'old_password', 'new_password');
--   Returns TRUE if successful, FALSE if old password is wrong
-- 
-- ============================================

