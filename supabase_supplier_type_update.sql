-- =============================================
-- SUPPLIER TYPE UPDATE MIGRATION
-- Run this in your Supabase SQL Editor to allow custom supplier types
-- =============================================

-- 1. Remove the CHECK constraint that restricts supplier_type to fixed values
-- This allows any string value to be stored in supplier_type
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_supplier_type_check;

-- Optional: If you see "constraint does not exist" but still can't insert,
-- check if there's another constraint with a different name:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'suppliers'::regclass;

-- 2. No changes needed for sync_supplier function if it takes TEXT (which it does).
