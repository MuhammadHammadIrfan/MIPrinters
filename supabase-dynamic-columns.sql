-- Add JSONB columns for dynamic fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS custom_columns JSONB;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS custom_values JSONB;
