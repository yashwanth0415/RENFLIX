-- RENFLIX Phone Auth & Auto Tenant Account
-- Version: 2026-08-22
-- Add phone auth support and auto tenant account creation

-- 1. Add phone auth columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_confirmed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_auth_enabled BOOLEAN DEFAULT FALSE;

-- 2. Add phone auth columns to auth.users (via metadata handling)
-- Note: auth.users is managed by Supabase, we use metadata

-- 3. Update tenants table to link to profile_id properly
-- Add phone_confirmed_at to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_confirmed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Create index for phone lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);
CREATE INDEX IF NOT EXISTS idx_tenants_auth_user_id ON tenants(auth_user_id);

-- 6. Enable phone auth in Supabase (this is done via Supabase dashboard, not SQL)
-- The following enables phone auth in the auth schema
-- ALTER SYSTEM SET auth.phone_otp_enabled = true; -- Requires superuser

-- 7. Function to create tenant auth account
CREATE OR REPLACE FUNCTION create_tenant_auth_account(
  p_email TEXT,
  p_phone TEXT,
  p_full_name TEXT,
  p_organization_id UUID
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_password TEXT;
BEGIN
  -- Generate a temporary password
  v_password := substr(md5(random()::text || clock_timestamp()::text), 1, 12);
  
  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, phone,
    encrypted_password, email_confirmed_at, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    p_phone,
    crypt('TempPass' || v_password, gen_salt('bf')),
    CASE WHEN p_email IS NOT NULL THEN now() ELSE NULL END,
    CASE WHEN p_phone IS NOT NULL THEN now() ELSE NULL END,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'role', 'TENANT'),
    now(), now(), '', '', '', ''
  ) RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to link tenant to auth user
CREATE OR REPLACE FUNCTION link_tenant_to_auth_user(
  p_tenant_id UUID,
  p_auth_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE tenants 
  SET auth_user_id = $2, updated_at = now()
  WHERE id = $1;
  
  UPDATE profiles
  SET phone_confirmed_at = now(), phone_auth_enabled = true
  WHERE id = (SELECT profile_id FROM tenants WHERE id = $1);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Verification
DO $$
BEGIN
  RAISE NOTICE 'Phone auth migration applied successfully';
END $$;