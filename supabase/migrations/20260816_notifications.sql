-- RENFLIX Notifications System Migration
-- Version: 2026-08-16
-- Depends on: 20260816_ensure_organization_ids.sql (must run first)

-- ── NOTIFICATIONS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- ── RLS POLICIES ──────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_self" ON notifications FOR ALL USING (user_id = auth.uid());

-- ── HELPER FUNCTIONS ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID, p_organization_id UUID, p_type TEXT,
  p_title TEXT, p_message TEXT,
  p_entity_type TEXT DEFAULT NULL, p_entity_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, organization_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_organization_id, p_type, p_title, p_message, p_entity_type, p_entity_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── TRIGGER FUNCTIONS ──────────────────────────────────────────────────────────

-- Property created
CREATE OR REPLACE FUNCTION notify_property_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(NEW.created_by, NEW.organization_id, 'property_created',
    'New Property Added', 'Property "' || NEW.name || '" has been created.',
    'property', NEW.id, jsonb_build_object('property_name', NEW.name, 'property_type', NEW.property_type));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_property_created ON properties;
CREATE TRIGGER trigger_property_created AFTER INSERT ON properties FOR EACH ROW EXECUTE FUNCTION notify_property_created();

-- Tenant added
CREATE OR REPLACE FUNCTION notify_tenant_added() RETURNS TRIGGER AS $$
DECLARE v_prop_name TEXT;
BEGIN
  IF NEW.unit_id IS NOT NULL THEN
    SELECT p.name INTO v_prop_name FROM properties p JOIN units u ON u.property_id = p.id WHERE u.id = NEW.unit_id;
  END IF;
  PERFORM create_notification(NEW.organization_id, NEW.organization_id, 'tenant_added',
    'New Tenant Added', 'Tenant "' || NEW.full_name || '" has been added' || (v_prop_name IS NOT NULL ? ' to ' || v_prop_name : '') || '.',
    'tenant', NEW.id, jsonb_build_object('tenant_name', NEW.full_name, 'property_name', v_prop_name, 'unit_id', NEW.unit_id));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_tenant_added ON tenants;
CREATE TRIGGER trigger_tenant_added AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION notify_tenant_added();

-- Payment received
CREATE OR REPLACE FUNCTION notify_payment_received() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PAID' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.status IS NULL) THEN
    PERFORM create_notification(NEW.organization_id, NEW.organization_id, 'payment_received',
      'Payment Received', 'Payment of ' || NEW.amount || ' received from tenant.',
      'payment', NEW.id, jsonb_build_object('amount', NEW.amount, 'tenant_id', NEW.tenant_id, 'property_id', NEW.property_id));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_payment_received ON payments;
CREATE TRIGGER trigger_payment_received AFTER INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION notify_payment_received();

-- Maintenance created
CREATE OR REPLACE FUNCTION notify_maintenance_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(NEW.organization_id, NEW.organization_id, 'maintenance_created',
    'New Maintenance Request', 'Maintenance request: "' || NEW.title || '" (' || NEW.priority || ' priority).',
    'maintenance', NEW.id, jsonb_build_object('title', NEW.title, 'priority', NEW.priority, 'property_id', NEW.property_id));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_maintenance_created ON maintenance_requests;
CREATE TRIGGER trigger_maintenance_created AFTER INSERT ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION notify_maintenance_created();

-- Lease created
CREATE OR REPLACE FUNCTION notify_lease_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(NEW.organization_id, NEW.organization_id, 'lease_created',
    'New Lease Created', 'Lease created for tenant on unit.',
    'lease', NEW.id, jsonb_build_object('tenant_id', NEW.tenant_id, 'unit_id', NEW.unit_id, 'monthly_rent', NEW.monthly_rent));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_lease_created ON leases;
CREATE TRIGGER trigger_lease_created AFTER INSERT ON leases FOR EACH ROW EXECUTE FUNCTION notify_lease_created();

-- ── MARK AS READ ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[]) RETURNS VOID AS $$
BEGIN UPDATE notifications SET read = true WHERE id = ANY(p_notification_ids) AND user_id = auth.uid(); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read() RETURNS VOID AS $$
BEGIN UPDATE notifications SET read = true WHERE user_id = auth.uid() AND read = false; END; $$ LANGUAGE plpgsql SECURITY DEFINER;