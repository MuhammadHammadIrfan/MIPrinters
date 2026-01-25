-- ============================================
-- MI PRINTERS - ROW LEVEL SECURITY (RLS) POLICIES
-- Run this AFTER the main schema is created
-- ============================================

-- For a single-user system, we use a simple approach:
-- Only allow access when a valid session exists
-- The anon key alone cannot read/write data

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

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
-- OWNER PROFILE POLICIES
-- Only the authenticated owner can access
-- ============================================

CREATE POLICY "Owner can read own profile"
ON owner_profile FOR SELECT
TO authenticated
USING (true);  -- There's only one owner, so allow if authenticated

CREATE POLICY "Owner can update own profile"
ON owner_profile FOR UPDATE
TO authenticated
USING (true);

-- ============================================
-- CUSTOMERS POLICIES
-- ============================================

CREATE POLICY "Authenticated can read customers"
ON customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert customers"
ON customers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update customers"
ON customers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete customers"
ON customers FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- SUPPLIERS POLICIES
-- ============================================

CREATE POLICY "Authenticated can read suppliers"
ON suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert suppliers"
ON suppliers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update suppliers"
ON suppliers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete suppliers"
ON suppliers FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- INVOICES POLICIES
-- ============================================

CREATE POLICY "Authenticated can read invoices"
ON invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update invoices"
ON invoices FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete invoices"
ON invoices FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- INVOICE ITEMS POLICIES
-- ============================================

CREATE POLICY "Authenticated can read invoice_items"
ON invoice_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert invoice_items"
ON invoice_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update invoice_items"
ON invoice_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete invoice_items"
ON invoice_items FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

CREATE POLICY "Authenticated can read payments"
ON payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert payments"
ON payments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update payments"
ON payments FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete payments"
ON payments FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- QUOTATIONS POLICIES
-- ============================================

CREATE POLICY "Authenticated can read quotations"
ON quotations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert quotations"
ON quotations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update quotations"
ON quotations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete quotations"
ON quotations FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- QUOTATION ITEMS POLICIES
-- ============================================

CREATE POLICY "Authenticated can read quotation_items"
ON quotation_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert quotation_items"
ON quotation_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update quotation_items"
ON quotation_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete quotation_items"
ON quotation_items FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- SIGNED PHOTOS POLICIES
-- ============================================

CREATE POLICY "Authenticated can read signed_photos"
ON signed_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert signed_photos"
ON signed_photos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can delete signed_photos"
ON signed_photos FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- SYNC QUEUE POLICIES
-- ============================================

CREATE POLICY "Authenticated can read sync_queue"
ON sync_queue FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert sync_queue"
ON sync_queue FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update sync_queue"
ON sync_queue FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete sync_queue"
ON sync_queue FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- DONE!
-- ============================================
-- 
-- With RLS enabled:
-- - Anonymous users (with just anon key) CANNOT access any data
-- - Only authenticated users can read/write
-- - Since there's only one owner, all policies use (true)
-- - This is secure because auth is required first
--
-- ============================================
