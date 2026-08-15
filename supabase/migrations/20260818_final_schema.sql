-- RENFLIX Complete Schema Migration (Fresh Install)
-- Version: 2026-08-18
-- Drops ALL existing tables and creates complete schema from scratch
-- Includes: Organizations, Profiles, Properties, Units, Tenants, Leases, Payments,
-- Maintenance Requests, Conversations, Messages, Announcements, Notifications
-- With: Auto display IDs (164**), Auto Notifications, RLS Policies, Realtime

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DROP ALL EXISTING TABLES (with CASCADE for dependencies)
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS
  notifications,
  messages,
  conversation_members,
  conversations,
  community_announcements,
  maintenance_requests,
  payments,
  leases,
  tenants,
  units,
  properties,
  profiles,
  organizations
CASCADE;

-- Also drop any sequences that might exist
DROP SEQUENCE IF EXISTS property_display_id_seq CASCADE;
DROP SEQUENCE IF EXISTS tenant_display_id_seq CASCADE;
DROP SEQUENCE IF EXISTS tenant_display_id_seq_1 CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CREATE ALL TABLES FROM SCRATCH
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ORGANIZATIONS ────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PROFILES ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER','PROPERTY_MANAGER','TENANT','HOSTEL_MANAGER','TECHNICIAN','COMMUNITY_MANAGER','ADMIN')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PROPERTIES ───────────────────────────────────────────────────────────────
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  portfolio_id UUID,
  name TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('HOUSE','APARTMENT','PG','HOSTEL','COLIVING','VILLA','GATED_COMMUNITY','COMMERCIAL','SHOP','OFFICE','WAREHOUSE','PLOT','LAND','MIXED')),
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  property_display_id TEXT UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_display_id ON properties(property_display_id);

-- ── UNITS ─────────────────────────────────────────────────────────────────────
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  building_id UUID,
  floor_id UUID,
  unit_number TEXT NOT NULL,
  unit_type TEXT,
  name TEXT,
  area NUMERIC,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','OCCUPIED','MAINTENANCE','RESERVED','BLOCKED')),
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  security_deposit NUMERIC,
  metadata JSONB,
  property_display_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_org ON units(organization_id);
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_property_display_id ON units(property_display_id);

-- ── TENANTS ───────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','FORMER')),
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  move_in_date DATE,
  move_out_date DATE,
  tenant_display_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_org ON tenants(organization_id);
CREATE INDEX idx_tenants_unit ON tenants(unit_id);
CREATE INDEX idx_tenants_display_id ON tenants(tenant_display_id);

-- ── LEASES ────────────────────────────────────────────────────────────────────
CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  security_deposit NUMERIC NOT NULL DEFAULT 0,
  notice_period_days INTEGER NOT NULL DEFAULT 30,
  late_fee_percentage NUMERIC NOT NULL DEFAULT 2,
  payment_day INTEGER NOT NULL DEFAULT 5 CHECK (payment_day >= 1 AND payment_day <= 31),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','EXPIRED','TERMINATED','RENEWED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leases_org ON leases(organization_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);

-- ── PAYMENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_date DATE,
  payment_method TEXT CHECK (payment_method IN ('UPI','CARD','BANK_TRANSFER','CASH','CHEQUE','OTHER')),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','PARTIALLY_PAID','OVERDUE','WAIVED','CANCELLED')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ── MAINTENANCE REQUESTS ──────────────────────────────────────────────────────
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','REVIEWED','ASSIGNED','ACCEPTED','SCHEDULED','IN_PROGRESS','WAITING_FOR_PARTS','COMPLETED','VERIFIED','CLOSED')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  scheduled_date DATE,
  completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maint_org ON maintenance_requests(organization_id);
CREATE INDEX idx_maint_property ON maintenance_requests(property_id);
CREATE INDEX idx_maint_status ON maintenance_requests(status);
CREATE INDEX idx_maint_priority ON maintenance_requests(priority);

-- ── CONVERSATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_org ON conversations(organization_id);

CREATE TABLE conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id);

-- ── COMMUNITY ANNOUNCEMENTS ───────────────────────────────────────────────────
CREATE TABLE community_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','IMPORTANT','URGENT')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_org ON community_announcements(organization_id);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_self" ON notifications FOR ALL USING (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 3. DISPLAY ID SEQUENCES & TRIGGERS (164**)
-- ════════════════════════════════════════════════════════════════════════════

-- Property display ID sequence (per organization)
CREATE SEQUENCE property_display_id_seq;

-- Tenant display ID sequence (global per organization)
CREATE SEQUENCE tenant_display_id_seq;

-- Property display ID trigger
CREATE OR REPLACE FUNCTION generate_property_display_id() RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
  display_id TEXT;
BEGIN
  next_seq := nextval('property_display_id_seq');
  display_id := '164' || LPAD(next_seq::TEXT, 2, '0');
  IF next_seq > 99 THEN
    RAISE EXCEPTION 'Maximum of 99 properties per organization reached (16401-16499)';
  END IF;
  NEW.property_display_id := display_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_property_display_id ON properties;
CREATE TRIGGER trigger_property_display_id
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION generate_property_display_id();

-- Tenant display ID trigger
CREATE OR REPLACE FUNCTION generate_tenant_display_id() RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
  display_id TEXT;
BEGIN
  next_seq := nextval('tenant_display_id_seq');
  display_id := '164' || LPAD(next_seq::TEXT, 2, '0');
  IF next_seq > 99 THEN
    RAISE EXCEPTION 'Maximum of 99 tenants per organization reached (16401-16499)';
  END IF;
  NEW.tenant_display_id := display_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_tenant_display_id ON tenants;
CREATE TRIGGER trigger_tenant_display_id
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION generate_tenant_display_id();

-- Backfill display IDs for properties
DO $$
DECLARE
  prop RECORD;
  seq_val INT := 0;
BEGIN
  FOR prop IN SELECT id FROM properties WHERE property_display_id IS NULL ORDER BY created_at LOOP
    seq_val := seq_val + 1;
    UPDATE properties SET property_display_id = '164' || LPAD(seq_val::TEXT, 2, '0') WHERE id = prop.id;
  END LOOP;
  IF seq_val > 0 THEN
    PERFORM setval('property_display_id_seq', seq_val);
  END IF;
END $$;

-- Backfill display IDs for tenants
DO $$
DECLARE
  ten RECORD;
  seq_val INT := 0;
BEGIN
  FOR ten IN SELECT id FROM tenants WHERE tenant_display_id IS NULL ORDER BY created_at LOOP
    seq_val := seq_val + 1;
    UPDATE tenants SET tenant_display_id = '164' || LPAD(seq_val::TEXT, 2, '0') WHERE id = ten.id;
  END LOOP;
  IF seq_val > 0 THEN
    PERFORM setval('tenant_display_id_seq', seq_val);
  END IF;
END $$;

-- Sync units with property display ID
UPDATE units u SET property_display_id = p.property_display_id
FROM properties p WHERE u.property_id = p.id AND u.property_display_id IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. NOTIFICATION SYSTEM
-- ════════════════════════════════════════════════════════════════════════════

-- Notification trigger helper
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID, p_organization_id UUID, p_type TEXT,
  p_title TEXT, p_message TEXT,
  p_entity_type TEXT DEFAULT NULL, p_entity_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, organization_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_organization_id, p_type, p_title, p_message, p_entity_type, p_entity_id, p_metadata);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Property created notification
CREATE OR REPLACE FUNCTION notify_property_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(auth.uid(), NEW.organization_id, 'property_created',
    'New Property Added', 'Property "' || NEW.name || '" has been created.',
    'property', NEW.id, jsonb_build_object('property_name', NEW.name, 'property_type', NEW.property_type));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_property_created ON properties;
CREATE TRIGGER trigger_property_created AFTER INSERT ON properties FOR EACH ROW EXECUTE FUNCTION notify_property_created();

-- Tenant added notification
CREATE OR REPLACE FUNCTION notify_tenant_added() RETURNS TRIGGER AS $$
DECLARE v_prop_name TEXT;
BEGIN
  IF NEW.unit_id IS NOT NULL THEN
    SELECT p.name INTO v_prop_name FROM properties p JOIN units u ON u.property_id = p.id WHERE u.id = NEW.unit_id;
  END IF;
  PERFORM create_notification(auth.uid(), NEW.organization_id, 'tenant_added',
    'New Tenant Added', 'Tenant "' || NEW.full_name || '" has been added' || CASE WHEN v_prop_name IS NOT NULL THEN ' to ' || v_prop_name ELSE '' END || '.',
    'tenant', NEW.id, jsonb_build_object('tenant_name', NEW.full_name, 'property_name', v_prop_name, 'unit_id', NEW.unit_id));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_tenant_added ON tenants;
CREATE TRIGGER trigger_tenant_added AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION notify_tenant_added();

-- Payment received notification
CREATE OR REPLACE FUNCTION notify_payment_received() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PAID' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.status IS NULL) THEN
    PERFORM create_notification(auth.uid(), NEW.organization_id, 'payment_received',
      'Payment Received', 'Payment of ' || NEW.amount || ' received from tenant.',
      'payment', NEW.id, jsonb_build_object('amount', NEW.amount, 'tenant_id', NEW.tenant_id, 'property_id', NEW.property_id));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_received ON payments;
CREATE TRIGGER trigger_payment_received AFTER INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION notify_payment_received();

-- Maintenance created notification
CREATE OR REPLACE FUNCTION notify_maintenance_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(auth.uid(), NEW.organization_id, 'maintenance_created',
    'New Maintenance Request', 'Maintenance request: "' || NEW.title || '" (' || NEW.priority || ' priority).',
    'maintenance', NEW.id, jsonb_build_object('title', NEW.title, 'priority', NEW.priority, 'property_id', NEW.property_id));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_maintenance_created ON maintenance_requests;
CREATE TRIGGER trigger_maintenance_created AFTER INSERT ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION notify_maintenance_created();

-- Lease created notification
CREATE OR REPLACE FUNCTION notify_lease_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(auth.uid(), NEW.organization_id, 'lease_created',
    'New Lease Created', 'Lease created for tenant on unit.',
    'lease', NEW.id, jsonb_build_object('tenant_id', NEW.tenant_id, 'unit_id', NEW.unit_id, 'monthly_rent', NEW.monthly_rent));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_lease_created ON leases;
CREATE TRIGGER trigger_lease_created AFTER INSERT ON leases FOR EACH ROW EXECUTE FUNCTION notify_lease_created();

-- Mark read functions
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[]) RETURNS VOID AS $$
BEGIN UPDATE notifications SET read = true WHERE id = ANY(p_notification_ids) AND user_id = auth.uid(); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read() RETURNS VOID AS $$
BEGIN UPDATE notifications SET read = true WHERE user_id = auth.uid() AND read = false; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: get user's organization_id
CREATE OR REPLACE FUNCTION get_user_org_id() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies
CREATE POLICY "org_owner_all" ON organizations FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "profiles_org_read" ON profiles FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "props_org" ON properties FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "units_org" ON units FOR ALL USING (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()));
CREATE POLICY "tenants_org" ON tenants FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "leases_org" ON leases FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "payments_org" ON payments FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "maint_org" ON maintenance_requests FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "conv_org" ON conversations FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "conv_members_org" ON conversation_members FOR ALL USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id = get_user_org_id()));
CREATE POLICY "messages_org" ON messages FOR ALL USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id = get_user_org_id()));
CREATE POLICY "announce_org" ON community_announcements FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "notif_self" ON notifications FOR ALL USING (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'OWNER')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
-- 7. REALTIME
-- ════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE community_announcements;

-- ════════════════════════════════════════════════════════════════════════════
-- COMPLETE - All tables, triggers, policies, and functions created
-- ════════════════════════════════════════════════════════════════════════════