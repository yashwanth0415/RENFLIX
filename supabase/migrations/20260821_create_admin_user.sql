-- RENFLIX Create Admin User Directly
-- Version: 2026-08-21
-- Creates admin user directly in auth.users and profiles tables
-- Bypasses signup flow entirely

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── CREATE ADMIN USER IN auth.users ──────────────────────────────────────────

-- Delete existing admin user if exists (for clean re-run)
DELETE FROM auth.users WHERE email = 'thurpatiyashwanth@gmail.com';
DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'thurpatiyashwanth@gmail.com');

-- Insert admin user directly into auth.users
-- Using crypt() with bcrypt for password hashing
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'thurpatiyashwanth@gmail.com',
  crypt('Yash@1234', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Admin User", "role": "ADMIN"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- ── CREATE PROFILE FOR ADMIN USER ────────────────────────────────────────────

INSERT INTO profiles (id, full_name, role, created_at, updated_at)
SELECT 
  id,
  'Admin User',
  'ADMIN',
  now(),
  now()
FROM auth.users
WHERE email = 'thurpatiyashwanth@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = now();

-- ── VERIFICATION ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  admin_user_id UUID;
  profile_count INT;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'thurpatiyashwanth@gmail.com';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not created in auth.users';
  ELSE
    RAISE NOTICE 'Admin user created with ID: %', admin_user_id;
  END IF;
  
  -- Check profile exists
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE id = admin_user_id;
  
  IF profile_count = 0 THEN
    RAISE EXCEPTION 'Profile not created for admin user';
  ELSE
    RAISE NOTICE 'Profile created for admin user';
  END IF;
  
  RAISE NOTICE 'Admin user setup completed successfully!';
  RAISE NOTICE 'Email: thurpatiyashwanth@gmail.com';
  RAISE NOTICE 'Password: Yash@1234';
END $$;