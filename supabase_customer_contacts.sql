-- =============================================
-- CUSTOMER MULTIPLE CONTACTS MIGRATION
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add additional_contacts column to customers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'additional_contacts'
    ) THEN
        ALTER TABLE customers ADD COLUMN additional_contacts JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Update sync_customer function to handle additional_contacts
DROP FUNCTION IF EXISTS sync_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION sync_customer(
    p_local_id TEXT,
    p_name TEXT,
    p_company TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_st_reg_no TEXT DEFAULT NULL,
    p_ntn_no TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_additional_contacts JSONB DEFAULT '[]'::jsonb -- New parameter
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Check if customer exists by local_id
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
            st_reg_no = p_st_reg_no,
            ntn_no = p_ntn_no,
            is_active = p_is_active,
            additional_contacts = p_additional_contacts, -- Update contacts
            updated_at = NOW(),
            sync_status = 'synced'
        WHERE id = v_id;
    ELSE
        INSERT INTO customers (
            local_id, name, company, phone, email, address, city, notes, 
            st_reg_no, ntn_no, is_active, additional_contacts, sync_status
        )
        VALUES (
            p_local_id, p_name, p_company, p_phone, p_email, p_address, p_city, p_notes, 
            p_st_reg_no, p_ntn_no, p_is_active, p_additional_contacts, 'synced'
        )
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
