-- ============================================
-- MI PRINTERS - RLS SECURITY UPDATE
-- Run this script in Supabase SQL Editor
-- This enables Row Level Security on ALL tables
-- ============================================

-- 1. Enable RLS on all tables
ALTER TABLE owner_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. OWNER ACCESS POLICIES (Full Access)
-- ============================================

-- Customers
CREATE POLICY "Owner can do everything on customers" ON customers
    FOR ALL USING (auth.role() = 'authenticated');

-- Suppliers
CREATE POLICY "Owner can do everything on suppliers" ON suppliers
    FOR ALL USING (auth.role() = 'authenticated');

-- Invoices
CREATE POLICY "Owner can do everything on invoices" ON invoices
    FOR ALL USING (auth.role() = 'authenticated');

-- Invoice Items
CREATE POLICY "Owner can do everything on invoice_items" ON invoice_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Payments
CREATE POLICY "Owner can do everything on payments" ON payments
    FOR ALL USING (auth.role() = 'authenticated');

-- Quotations
CREATE POLICY "Owner can do everything on quotations" ON quotations
    FOR ALL USING (auth.role() = 'authenticated');

-- Quotation Items
CREATE POLICY "Owner can do everything on quotation_items" ON quotation_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Signed Photos
CREATE POLICY "Owner can do everything on signed_photos" ON signed_photos
    FOR ALL USING (auth.role() = 'authenticated');

-- Sync Queue
CREATE POLICY "Owner can do everything on sync_queue" ON sync_queue
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 3. OWNER PROFILE SPECIFIC POLICIES
-- ============================================

-- Allow Owner to update their own profile
CREATE POLICY "Owner can update profile" ON owner_profile
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow Owner to view profile
CREATE POLICY "Owner can view profile" ON owner_profile
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow Public to VIEW business info (for Contact Page)
-- This is critical for the website to work for visitors
CREATE POLICY "Public can view business info" ON owner_profile
    FOR SELECT USING (true);


-- ============================================
-- 4. UPDATE OWNER_PROFILE TABLE 
-- Add missing bank columns if they don't exist
-- ============================================
DO $$ 
BEGIN 
    -- Add bank columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_profile' AND column_name = 'account_title') THEN
        ALTER TABLE owner_profile ADD COLUMN account_title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_profile' AND column_name = 'account_number') THEN
        ALTER TABLE owner_profile ADD COLUMN account_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_profile' AND column_name = 'bank_name') THEN
        ALTER TABLE owner_profile ADD COLUMN bank_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_profile' AND column_name = 'iban') THEN
        ALTER TABLE owner_profile ADD COLUMN iban TEXT;
    END IF;
    
    -- Rename columns to match the code expectations if needed
    -- The code uses: business_name, phone, email, address, bank_name, account_title, account_number, iban
    -- Your existing schema has: business_name, phone, address, bank_details
    
    -- We can drop 'bank_details' if it's unused or migrate data
    -- ALTER TABLE owner_profile DROP COLUMN bank_details;

END $$;
