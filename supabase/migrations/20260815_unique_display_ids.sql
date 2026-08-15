-- RENFLIX Unique Display ID Migration
-- Version: 2026-08-15
-- Adds unique 5-digit display IDs starting with 164** for properties and tenants
-- Format: 164XX (where XX is sequential 01-99)

-- ── SEQUENCES FOR DISPLAY IDS ──────────────────────────────────────────────────

-- Property display ID sequence per organization
-- Each org gets their own sequence starting at 1 (max 99 properties)
CREATE SEQUENCE IF NOT EXISTS property_display_id_seq;

-- Tenant display ID sequence (global across all properties in org)
-- Max 99 tenants per organization
CREATE SEQUENCE IF NOT EXISTS tenant_display_id_seq;

-- ── ADD DISPLAY_ID COLUMNS ─────────────────────────────────────────────────────

-- Add property_display_id to properties table
-- Format: 164 + zero-padded sequence (e.g., 16401, 16402, ... 16499)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_display_id TEXT UNIQUE;

-- Add tenant_display_id to tenants table  
-- Format: 164 + zero-padded sequence (e.g., 16401, 16402, ... 16499)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_display_id TEXT UNIQUE;

-- Add property_display_id to units for reference (optional, for queries)
ALTER TABLE units ADD COLUMN IF NOT EXISTS property_display_id TEXT;

-- ── TRIGGER FUNCTIONS ──────────────────────────────────────────────────────────

-- Function to generate property display ID: 164 + 2-digit zero-padded sequence
CREATE OR REPLACE FUNCTION generate_property_display_id()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
  display_id TEXT;
BEGIN
  -- Get next sequence value for this organization
  next_seq := nextval('property_display_id_seq');
  
  -- Generate display ID: 164 + 2-digit zero-padded
  display_id := '164' || LPAD(next_seq::TEXT, 2, '0');
  
  -- Check if we've exceeded 99 properties for this org
  IF next_seq > 99 THEN
    RAISE EXCEPTION 'Maximum of 99 properties per organization reached (16401-16499)';
  END IF;
  
  NEW.property_display_id := display_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate tenant display ID: 164 + 2-digit zero-padded global sequence
CREATE OR REPLACE FUNCTION generate_tenant_display_id()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
  display_id TEXT;
BEGIN
  -- Get next global sequence value for tenants in this organization
  next_seq := nextval('tenant_display_id_seq');
  
  -- Generate display ID: 164 + 2-digit zero-padded
  display_id := '164' || LPAD(next_seq::TEXT, 2, '0');
  
  -- Check if we've exceeded 99 tenants for this org
  IF next_seq > 99 THEN
    RAISE EXCEPTION 'Maximum of 99 tenants per organization reached (16401-16499)';
  END IF;
  
  NEW.tenant_display_id := display_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── TRIGGERS ───────────────────────────────────────────────────────────────────

-- Trigger for properties
DROP TRIGGER IF EXISTS trigger_property_display_id ON properties;
CREATE TRIGGER trigger_property_display_id
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION generate_property_display_id();

-- Trigger for tenants
DROP TRIGGER IF EXISTS trigger_tenant_display_id ON tenants;
CREATE TRIGGER trigger_tenant_display_id
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION generate_tenant_display_id();

-- ── BACKFILL EXISTING DATA ─────────────────────────────────────────────────────

-- Backfill property display IDs for existing properties
DO $$
DECLARE
  prop RECORD;
  seq_val INT := 0;
BEGIN
  FOR prop IN 
    SELECT id FROM properties 
    WHERE property_display_id IS NULL 
    ORDER BY created_at
  LOOP
    seq_val := seq_val + 1;
    UPDATE properties 
    SET property_display_id = '164' || LPAD(seq_val::TEXT, 2, '0')
    WHERE id = prop.id;
  END LOOP;
  
  -- Reset sequence to continue from where we left off
  PERFORM setval('property_display_id_seq', seq_val);
END $$;

-- Backfill tenant display IDs for existing tenants (global sequence)
DO $$
DECLARE
  ten RECORD;
  seq_val INT := 0;
BEGIN
  FOR ten IN 
    SELECT id FROM tenants
    WHERE tenant_display_id IS NULL
    ORDER BY created_at
  LOOP
    seq_val := seq_val + 1;
    UPDATE tenants 
    SET tenant_display_id = '164' || LPAD(seq_val::TEXT, 2, '0')
    WHERE id = ten.id;
  END LOOP;
  
  -- Reset sequence to continue from where we left off
  PERFORM setval('tenant_display_id_seq', seq_val);
END $$;

-- ── SYNC UNITS WITH PROPERTY DISPLAY ID ────────────────────────────────────────

UPDATE units u
SET property_display_id = p.property_display_id
FROM properties p
WHERE u.property_id = p.id
AND u.property_display_id IS NULL;

-- ── INDEXES ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_properties_display_id ON properties(property_display_id);
CREATE INDEX IF NOT EXISTS idx_tenants_display_id ON tenants(tenant_display_id);
CREATE INDEX IF NOT EXISTS idx_units_property_display_id ON units(property_display_id);

-- ── COMMENTS ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN properties.property_display_id IS 'Unique 5-digit display ID starting with 164 (e.g., 16401, 16402) - max 99 per org';
COMMENT ON COLUMN tenants.tenant_display_id IS 'Unique 5-digit display ID starting with 164 (e.g., 16401, 16402) - max 99 per org, globally unique';
COMMENT ON COLUMN units.property_display_id IS 'Reference to property display ID for quick queries';