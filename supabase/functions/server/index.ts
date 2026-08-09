import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const SUPABASE_URL = () => Deno.env.get("FUNCTION_SUPABASE_URL")!;
const SERVICE_KEY = () => Deno.env.get("FUNCTION_SERVICE_ROLE_KEY")!;

async function runSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${SUPABASE_URL()}/rest/v1/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY()}`,
      "apikey": SERVICE_KEY(),
    },
    body: JSON.stringify({ query: sql }),
  });
  if (res.ok) return { ok: true };
  const body = await res.text();
  return { ok: false, error: body };
}

app.get("/make-server-e5ba9b74/health", (c) => c.json({ status: "ok" }));

// Run DB migration — idempotent, safe to call multiple times
app.post("/make-server-e5ba9b74/setup-db", async (c) => {
  const steps = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

    `CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      phone TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'OWNER',
      organization_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS properties (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      portfolio_id UUID,
      name TEXT NOT NULL,
      property_type TEXT NOT NULL,
      description TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'India',
      postal_code TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id)`,

    `CREATE TABLE IF NOT EXISTS units (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      building_id UUID,
      floor_id UUID,
      unit_number TEXT NOT NULL,
      unit_type TEXT,
      name TEXT,
      area NUMERIC,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      monthly_rent NUMERIC NOT NULL DEFAULT 0,
      security_deposit NUMERIC,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      profile_id UUID,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      unit_id UUID,
      move_in_date DATE,
      move_out_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS leases (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      property_id UUID NOT NULL,
      unit_id UUID NOT NULL,
      tenant_id UUID NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      monthly_rent NUMERIC NOT NULL,
      security_deposit NUMERIC NOT NULL DEFAULT 0,
      notice_period_days INTEGER NOT NULL DEFAULT 30,
      late_fee_percentage NUMERIC NOT NULL DEFAULT 2,
      payment_day INTEGER NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      lease_id UUID,
      tenant_id UUID NOT NULL,
      unit_id UUID,
      property_id UUID,
      amount NUMERIC NOT NULL,
      due_date DATE,
      paid_date DATE,
      payment_method TEXT,
      reference_number TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      receipt_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS maintenance_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      property_id UUID NOT NULL,
      unit_id UUID,
      tenant_id UUID,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      assigned_to UUID,
      estimated_cost NUMERIC,
      actual_cost NUMERIC,
      scheduled_date DATE,
      completed_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      title TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS conversation_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)`,

    `CREATE TABLE IF NOT EXISTS community_announcements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT false,
      entity_type TEXT,
      entity_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    // Enable RLS
    `DO $$ BEGIN
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
    END $$`,

    // Helper function
    `CREATE OR REPLACE FUNCTION get_user_org_id()
    RETURNS UUID AS $$
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    $$ LANGUAGE sql STABLE SECURITY DEFINER`,

    // RLS Policies — wrapped in DO blocks so they're idempotent
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organizations' AND policyname='org_owner_all') THEN
        CREATE POLICY "org_owner_all" ON organizations FOR ALL USING (owner_id = auth.uid());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_self') THEN
        CREATE POLICY "profiles_self" ON profiles FOR ALL USING (id = auth.uid());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='properties' AND policyname='props_org') THEN
        CREATE POLICY "props_org" ON properties FOR ALL USING (organization_id = get_user_org_id());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='units' AND policyname='units_org') THEN
        CREATE POLICY "units_org" ON units FOR ALL USING (
          property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id())
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_org') THEN
        CREATE POLICY "tenants_org" ON tenants FOR ALL USING (organization_id = get_user_org_id());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leases' AND policyname='leases_org') THEN
        CREATE POLICY "leases_org" ON leases FOR ALL USING (organization_id = get_user_org_id());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='payments_org') THEN
        CREATE POLICY "payments_org" ON payments FOR ALL USING (organization_id = get_user_org_id());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='maintenance_requests' AND policyname='maint_org') THEN
        CREATE POLICY "maint_org" ON maintenance_requests FOR ALL USING (organization_id = get_user_org_id());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='conv_org') THEN
        CREATE POLICY "conv_org" ON conversations FOR ALL USING (organization_id = get_user_org_id());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_org') THEN
        CREATE POLICY "messages_org" ON messages FOR ALL USING (
          conversation_id IN (SELECT id FROM conversations WHERE organization_id = get_user_org_id())
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_announcements' AND policyname='announce_org') THEN
        CREATE POLICY "announce_org" ON community_announcements FOR ALL USING (organization_id = get_user_org_id());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_self') THEN
        CREATE POLICY "notif_self" ON notifications FOR ALL USING (user_id = auth.uid());
      END IF;
    END $$`,

    // Auto-profile trigger
    `CREATE OR REPLACE FUNCTION handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO profiles (id, full_name, role)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'OWNER')
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER`,

    `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,

    `CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user()`,
  ];

  const errors: string[] = [];
  for (const sql of steps) {
    const result = await runSQL(sql);
    if (!result.ok && result.error) {
      // Skip "already exists" type errors
      if (!result.error.includes('already exists') && !result.error.includes('duplicate')) {
        errors.push(result.error.slice(0, 200));
      }
    }
  }

  // Verify
  const check = await runSQL(`SELECT count(*) FROM profiles LIMIT 1`);

  return c.json({
    success: check.ok,
    errors: errors.length > 0 ? errors : undefined,
    message: check.ok ? "Database ready ✓" : "Setup incomplete — check errors",
  });
});

Deno.serve(app.fetch);
