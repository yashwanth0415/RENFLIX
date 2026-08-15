-- RENFLIX Migration: Add organization_id to All Tables
-- Version: 2026-08-16
-- Run this FIRST. This migration ONLY adds columns. No triggers, no notifications.

-- Ensure organizations table exists
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 1. ADD organization_id TO properties ─────────────────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);

-- ── 2. ADD organization_id TO units ──────────────────────────────────────────
ALTER TABLE units ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_units_org ON units(organization_id);

-- ── 3. ADD organization_id TO tenants ────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tenants_org ON tenants(organization_id);

-- ── 4. ADD organization_id TO payments ───────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);

-- ── 5. ADD organization_id TO maintenance_requests ───────────────────────────
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_maint_org ON maintenance_requests(organization_id);

-- ── 6. ADD organization_id TO leases ─────────────────────────────────────────
ALTER TABLE leases ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_leases_org ON leases(organization_id);

-- ── 7. ADD organization_id TO community_announcements ────────────────────────
ALTER TABLE community_announcements ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_announcements_org ON community_announcements(organization_id);

-- ── 8. ADD organization_id TO conversations ──────────────────────────────────
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);

-- ── VERIFY ALL COLUMNS EXIST ──────────────────────────────────────────────────
-- This will fail if any column is missing, confirming the migration worked
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'organization_id');
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'organization_id');
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'organization_id');
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'organization_id');
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'organization_id');
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leases' AND column_name = 'organization_id');
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_announcements' AND column_name = 'organization_id');
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'organization_id');
  RAISE NOTICE 'All organization_id columns verified successfully';
END $$;