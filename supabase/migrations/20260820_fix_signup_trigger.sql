-- RENFLIX Fix Signup Trigger
-- Version: 2026-08-20
-- Fixes the handle_new_user trigger to bypass RLS for profile creation on signup

-- ── FIX: Disable RLS for handle_new_user trigger ──────────────────────────────

-- Drop and recreate the trigger function with RLS bypass
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  -- Temporarily disable RLS for this transaction (correct parameter name)
  SET LOCAL row_security = off;
  
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'OWNER')
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── ALSO FIX: Ensure profiles table allows inserts from trigger ────────────────

-- Drop existing policies and recreate with proper logic
DROP POLICY IF EXISTS "profiles_self" ON profiles;
DROP POLICY IF EXISTS "profiles_org_read" ON profiles;
DROP POLICY IF EXISTS "profiles_signup_insert" ON profiles;

-- Allow users to manage their own profile (when auth.uid() is set)
CREATE POLICY "profiles_self" ON profiles 
  FOR ALL USING (id = auth.uid());

-- Allow org members to read profiles in their org
CREATE POLICY "profiles_org_read" ON profiles 
  FOR SELECT USING (organization_id = get_user_org_id());

-- Allow system to insert profiles during signup (when auth.uid() might not be set yet)
-- This allows the handle_new_user trigger to work
CREATE POLICY "profiles_signup_insert" ON profiles 
  FOR INSERT WITH CHECK (
    -- Allow if the user is creating their own profile
    id = auth.uid() 
    OR 
    -- Allow if auth.uid() is not set (trigger context)
    auth.uid() IS NULL
  );

-- ── VERIFICATION: Check that trigger function exists ──────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE 'handle_new_user function exists - signup trigger fix applied successfully';
  ELSE
    RAISE EXCEPTION 'handle_new_user function not found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'on_auth_user_created trigger exists - signup trigger fix applied successfully';
  ELSE
    RAISE EXCEPTION 'on_auth_user_created trigger not found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_signup_insert' AND tablename = 'profiles'
  ) THEN
    RAISE NOTICE 'profiles_signup_insert policy exists - signup trigger fix applied successfully';
  ELSE
    RAISE EXCEPTION 'profiles_signup_insert policy not found';
  END IF;
END $$;