-- ============================================
-- MI PRINTERS - LOGIN FUNCTION FIX
-- Run this in Supabase SQL Editor
-- ============================================

-- This function verifies password AND returns owner data
-- Using SECURITY DEFINER to bypass RLS during login
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

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION login_owner(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION login_owner(TEXT, TEXT) TO authenticated;
