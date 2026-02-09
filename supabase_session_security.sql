-- ============================================
-- MI PRINTERS - SESSION INVALIDATION SECURITY FIX
-- Run this in Supabase SQL Editor
-- This adds session versioning for password change security
-- ============================================

-- ============================================
-- 1. ADD session_version COLUMN
-- ============================================
ALTER TABLE owner_profile ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;

-- ============================================
-- 2. UPDATE login_owner FUNCTION
-- Now returns session_version in the response
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
    
    -- Password is valid, return owner data WITH session_version
    SELECT json_build_object(
        'success', true,
        'user', json_build_object(
            'id', id,
            'email', email,
            'businessName', business_name,
            'sessionVersion', COALESCE(session_version, 1)
        )
    ) INTO owner_data
    FROM owner_profile
    WHERE email = input_email;
    
    RETURN owner_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION login_owner(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION login_owner(TEXT, TEXT) TO authenticated;

-- ============================================
-- 3. CREATE get_session_version FUNCTION
-- Used to validate tokens against current session version
-- ============================================
CREATE OR REPLACE FUNCTION get_session_version(owner_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_session_version INTEGER;
BEGIN
    SELECT COALESCE(session_version, 1) INTO v_session_version
    FROM owner_profile
    WHERE id = owner_id;
    
    RETURN v_session_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_session_version(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_session_version(UUID) TO authenticated;

-- ============================================
-- 4. UPDATE change_owner_password FUNCTION
-- Now increments session_version to invalidate all sessions
-- ============================================
CREATE OR REPLACE FUNCTION change_owner_password(
    owner_id UUID,
    current_password TEXT,
    new_password TEXT
)
RETURNS JSON AS $$
DECLARE
    stored_hash TEXT;
    v_email TEXT;
BEGIN
    -- Get current password hash and email
    SELECT password_hash, email INTO stored_hash, v_email
    FROM owner_profile 
    WHERE id = owner_id;
    
    IF stored_hash IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Owner not found');
    END IF;
    
    -- Verify current password
    IF stored_hash != crypt(current_password, stored_hash) THEN
        RETURN json_build_object('success', false, 'error', 'Current password is incorrect');
    END IF;
    
    -- Update password AND increment session_version
    UPDATE owner_profile 
    SET 
        password_hash = crypt(new_password, gen_salt('bf', 10)),
        session_version = COALESCE(session_version, 1) + 1,
        updated_at = NOW()
    WHERE id = owner_id;
    
    RETURN json_build_object('success', true, 'message', 'Password changed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION change_owner_password(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION change_owner_password(UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- 5. UPDATE update_owner_password FUNCTION (alternative version)
-- This is the function currently used by the change-password API
-- ============================================
CREATE OR REPLACE FUNCTION update_owner_password(
    input_email TEXT,
    old_password TEXT,
    new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    stored_hash TEXT;
BEGIN
    -- Get current password hash
    SELECT password_hash INTO stored_hash
    FROM owner_profile 
    WHERE email = input_email;
    
    IF stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verify old password
    IF stored_hash != crypt(old_password, stored_hash) THEN
        RETURN FALSE;
    END IF;
    
    -- Update password AND increment session_version to invalidate all sessions
    UPDATE owner_profile 
    SET 
        password_hash = crypt(new_password, gen_salt('bf', 10)),
        session_version = COALESCE(session_version, 1) + 1,
        updated_at = NOW()
    WHERE email = input_email;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_owner_password(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_owner_password(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================
-- ABOUT PASSWORD SECURITY
-- ============================================
-- Passwords are stored using bcrypt hashing via pgcrypto extension.
-- bcrypt is a ONE-WAY HASH - passwords CANNOT be decrypted.
-- This is the gold standard for password security.
--
-- If you forget the password, you must RESET it, not recover it.
-- To reset a password directly in the database:
--
-- UPDATE owner_profile 
-- SET password_hash = crypt('new_password_here', gen_salt('bf', 10))
-- WHERE email = 'your@email.com';
--
-- ============================================

