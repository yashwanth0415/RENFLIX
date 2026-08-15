-- RENFLIX Admin Panel Migration
-- Version: 2026-08-19
-- Admin panel specific database additions

-- ── ADMIN AUDIT LOGS ──────────────────────────────────────────────────────────

-- Track all admin actions for audit trail
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_table ON admin_audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_record ON admin_audit_logs(record_id);

-- RLS for audit logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_self" ON admin_audit_logs 
  FOR ALL USING (admin_user_id = auth.uid());

-- ── ADMIN SETTINGS ────────────────────────────────────────────────────────────

-- Global admin settings (key-value store)
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO admin_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable maintenance mode for the platform'),
  ('max_properties_per_org', '99', 'Maximum properties per organization'),
  ('max_tenants_per_org', '99', 'Maximum tenants per organization'),
  ('default_property_status', '"ACTIVE"', 'Default status for new properties'),
  ('default_unit_status', '"AVAILABLE"', 'Default status for new units'),
  ('default_tenant_status', '"ACTIVE"', 'Default status for new tenants'),
  ('enable_notifications', 'true', 'Enable system notifications'),
  ('auto_archive_days', '365', 'Days after which inactive records are archived')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_settings_read" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "admin_settings_write" ON admin_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- ── SYSTEM HEALTH MONITORING ──────────────────────────────────────────────────

-- Track system metrics for admin dashboard
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  tags JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at DESC);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_metrics_admin" ON system_metrics 
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ── ADMIN ACTIVITY TRIGGER ────────────────────────────────────────────────────

-- Auto-log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_audit_logs (admin_user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── ADMIN VIEWS FOR DASHBOARD ─────────────────────────────────────────────────

-- View: Organization summary stats
CREATE OR REPLACE VIEW admin_org_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.created_at as org_created_at,
  COUNT(DISTINCT p.id) as total_properties,
  COUNT(DISTINCT u.id) as total_units,
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT l.id) as total_leases,
  COUNT(DISTINCT pay.id) as total_payments,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PAID'), 0) as total_revenue
FROM organizations o
LEFT JOIN properties p ON p.organization_id = o.id
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN tenants t ON t.organization_id = o.id
LEFT JOIN leases l ON l.organization_id = o.id
LEFT JOIN payments pay ON pay.organization_id = o.id
GROUP BY o.id, o.name, o.created_at;

-- View: System overview stats
CREATE OR REPLACE VIEW admin_system_overview AS
SELECT 
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM properties) as total_properties,
  (SELECT COUNT(*) FROM units) as total_units,
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  (SELECT COUNT(*) FROM leases WHERE status = 'ACTIVE') as active_leases,
  (SELECT COUNT(*) FROM payments WHERE status = 'PAID') as completed_payments,
  (SELECT COUNT(*) FROM maintenance_requests WHERE status IN ('SUBMITTED', 'REVIEWED', 'ASSIGNED', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS')) as open_maintenance,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'PAID') as total_collected,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'OVERDUE') as total_overdue;

-- ── COMMENTS ───────────────────────────────────────────────────────────────────

COMMENT ON TABLE admin_audit_logs IS 'Audit trail for all admin actions';
COMMENT ON TABLE admin_settings IS 'Global admin-configurable settings';
COMMENT ON TABLE system_metrics IS 'System health and performance metrics';
COMMENT ON VIEW admin_org_summary IS 'Per-organization summary statistics';
COMMENT ON VIEW admin_system_overview IS 'System-wide overview statistics';