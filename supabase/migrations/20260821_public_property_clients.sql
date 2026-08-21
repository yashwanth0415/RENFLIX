-- RENFLIX public property publishing + client portal
-- Apply after the existing RENFLIX schema migrations.

BEGIN;

-- ------------------------------------------------------------
-- CLIENT ROLE
-- ------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN (
      'OWNER','PROPERTY_MANAGER','TENANT','HOSTEL_MANAGER',
      'TECHNICIAN','COMMUNITY_MANAGER','ADMIN','CLIENT'
    )
  );

-- ------------------------------------------------------------
-- CLIENT ACCOUNTS
-- Auth is still handled by Supabase Auth. The username is mapped
-- to a private synthetic auth email by the admin-create-client
-- edge function, so no plaintext passwords are stored in tables.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_username_format CHECK (username ~ '^[A-Za-z0-9._-]{3,40}$')
);

CREATE TABLE IF NOT EXISTS public.client_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, property_id)
);

-- ------------------------------------------------------------
-- PUBLIC PUBLISHING CONFIGURATION
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_property_configs (
  property_id UUID PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  headline TEXT,
  public_description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  inquiry_types JSONB NOT NULL DEFAULT '["Property Enquiry","Schedule a Visit","Interested in Renting"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, image_url)
);

-- ------------------------------------------------------------
-- PUBLIC LEADS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_property_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  inquiry_type TEXT NOT NULL,
  amount NUMERIC,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_properties_client ON public.client_properties(client_id);
CREATE INDEX IF NOT EXISTS idx_client_properties_property ON public.client_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_public_leads_client ON public.public_property_leads(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_leads_property ON public.public_property_leads(property_id, created_at DESC);

-- ------------------------------------------------------------
-- SECURITY HELPERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_client()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'CLIENT'
  );
$$;

CREATE OR REPLACE FUNCTION public.client_has_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_properties cp
    JOIN public.client_accounts ca ON ca.id = cp.client_id
    WHERE cp.property_id = p_property_id
      AND ca.profile_id = auth.uid()
      AND ca.active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.id
  FROM public.client_accounts ca
  WHERE ca.profile_id = auth.uid()
    AND ca.active = TRUE
  LIMIT 1;
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_property_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_property_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_accounts_admin_all ON public.client_accounts;
DROP POLICY IF EXISTS client_accounts_self ON public.client_accounts;
CREATE POLICY client_accounts_admin_all ON public.client_accounts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY client_accounts_self ON public.client_accounts
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS client_properties_admin_all ON public.client_properties;
DROP POLICY IF EXISTS client_properties_client_read ON public.client_properties;
DROP POLICY IF EXISTS client_properties_client_write ON public.client_properties;
CREATE POLICY client_properties_admin_all ON public.client_properties
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY client_properties_client_read ON public.client_properties
  FOR SELECT TO authenticated
  USING (client_id = public.get_current_client_id());
CREATE POLICY client_properties_client_write ON public.client_properties
  FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id())
  WITH CHECK (client_id = public.get_current_client_id());

DROP POLICY IF EXISTS public_config_admin_all ON public.public_property_configs;
DROP POLICY IF EXISTS public_config_client_all ON public.public_property_configs;
CREATE POLICY public_config_admin_all ON public.public_property_configs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY public_config_client_all ON public.public_property_configs
  FOR ALL TO authenticated
  USING (public.client_has_property(property_id))
  WITH CHECK (public.client_has_property(property_id));

DROP POLICY IF EXISTS public_images_admin_all ON public.public_property_images;
DROP POLICY IF EXISTS public_images_client_all ON public.public_property_images;
CREATE POLICY public_images_admin_all ON public.public_property_images
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY public_images_client_all ON public.public_property_images
  FOR ALL TO authenticated
  USING (public.client_has_property(property_id))
  WITH CHECK (public.client_has_property(property_id));

DROP POLICY IF EXISTS public_leads_admin_all ON public.public_property_leads;
DROP POLICY IF EXISTS public_leads_client_read ON public.public_property_leads;
CREATE POLICY public_leads_admin_all ON public.public_property_leads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY public_leads_client_read ON public.public_property_leads
  FOR SELECT TO authenticated
  USING (client_id = public.get_current_client_id());

-- ------------------------------------------------------------
-- Public property read/search RPCs.
-- These are intentionally narrow and return only public-safe data.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_property(p_display_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'property_display_id', p.property_display_id,
    'name', p.name,
    'property_type', p.property_type,
    'address', p.address,
    'city', p.city,
    'state', p.state,
    'country', p.country,
    'postal_code', p.postal_code,
    'image_url', p.image_url,
    'headline', COALESCE(c.headline, p.name),
    'public_description', COALESCE(c.public_description, p.description),
    'features', COALESCE(c.features, '[]'::jsonb),
    'inquiry_types', COALESCE(c.inquiry_types, '["Property Enquiry","Schedule a Visit","Interested in Renting"]'::jsonb),
    'images', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', i.id, 'image_url', i.image_url, 'alt_text', i.alt_text, 'sort_order', i.sort_order) ORDER BY i.sort_order, i.created_at)
      FROM public.public_property_images i
      WHERE i.property_id = p.id
    ), '[]'::jsonb),
    'units', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', u.id,
        'unit_number', u.unit_number,
        'unit_type', u.unit_type,
        'name', u.name,
        'area', u.area,
        'monthly_rent', u.monthly_rent,
        'status', u.status
      ) ORDER BY u.unit_number)
      FROM public.units u
      WHERE u.property_id = p.id
        AND u.status <> 'BLOCKED'
    ), '[]'::jsonb)
  )
  INTO result
  FROM public.properties p
  JOIN public.public_property_configs c ON c.property_id = p.id
  WHERE p.property_display_id = BTRIM(p_display_id)
    AND c.is_public = TRUE
    AND p.status = 'ACTIVE';

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_public_properties(p_query TEXT)
RETURNS TABLE (
  property_display_id TEXT,
  name TEXT,
  city TEXT,
  state TEXT,
  property_type TEXT,
  image_url TEXT,
  headline TEXT,
  starting_rent NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.property_display_id,
    p.name,
    p.city,
    p.state,
    p.property_type,
    p.image_url,
    COALESCE(c.headline, p.name) AS headline,
    MIN(u.monthly_rent) FILTER (WHERE u.status = 'AVAILABLE') AS starting_rent
  FROM public.properties p
  JOIN public.public_property_configs c ON c.property_id = p.id AND c.is_public = TRUE
  LEFT JOIN public.units u ON u.property_id = p.id
  WHERE p.status = 'ACTIVE'
    AND (
      BTRIM(COALESCE(p_query, '')) = ''
      OR p.property_display_id ILIKE '%' || BTRIM(p_query) || '%'
      OR p.name ILIKE '%' || BTRIM(p_query) || '%'
      OR p.city ILIKE '%' || BTRIM(p_query) || '%'
      OR c.headline ILIKE '%' || BTRIM(p_query) || '%'
    )
  GROUP BY p.id, c.headline
  ORDER BY p.name
  LIMIT 12;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_property_lead(
  p_property_display_id TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_inquiry_type TEXT DEFAULT 'Property Enquiry',
  p_amount NUMERIC DEFAULT NULL,
  p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_client_id UUID;
  v_lead_id UUID;
BEGIN
  SELECT p.id INTO v_property_id
  FROM public.properties p
  JOIN public.public_property_configs c ON c.property_id = p.id
  WHERE p.property_display_id = BTRIM(p_property_display_id)
    AND p.status = 'ACTIVE'
    AND c.is_public = TRUE
  LIMIT 1;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Property is not publicly available.' USING ERRCODE = 'P0001';
  END IF;

  SELECT cp.client_id INTO v_client_id
  FROM public.client_properties cp
  JOIN public.client_accounts ca ON ca.id = cp.client_id
  WHERE cp.property_id = v_property_id AND ca.active = TRUE
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'This property is not assigned to an active client.' USING ERRCODE = 'P0001';
  END IF;

  IF BTRIM(COALESCE(p_full_name, '')) = '' THEN
    RAISE EXCEPTION 'Name is required.';
  END IF;
  IF BTRIM(COALESCE(p_phone, '')) = '' THEN
    RAISE EXCEPTION 'Phone is required.';
  END IF;

  INSERT INTO public.public_property_leads (
    property_id, client_id, full_name, phone, email, inquiry_type, amount, details
  ) VALUES (
    v_property_id, v_client_id, BTRIM(p_full_name), BTRIM(p_phone), NULLIF(BTRIM(COALESCE(p_email, '')), ''),
    BTRIM(COALESCE(p_inquiry_type, 'Property Enquiry')), p_amount, NULLIF(BTRIM(COALESCE(p_details, '')), '')
  ) RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object('id', v_lead_id, 'success', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_property(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_properties(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_property_lead(TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC,TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- Storage bucket for client-managed public property photos.
-- The object path is <property_uuid>/<file-name>.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-property-images', 'public-property-images', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS public_property_images_read ON storage.objects;
DROP POLICY IF EXISTS public_property_images_insert ON storage.objects;
DROP POLICY IF EXISTS public_property_images_update ON storage.objects;
DROP POLICY IF EXISTS public_property_images_delete ON storage.objects;

CREATE POLICY public_property_images_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'public-property-images');

CREATE POLICY public_property_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-property-images'
    AND public.client_has_property(NULLIF(split_part(name, '/', 1), '')::uuid)
  );

CREATE POLICY public_property_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'public-property-images'
    AND public.client_has_property(NULLIF(split_part(name, '/', 1), '')::uuid)
  )
  WITH CHECK (
    bucket_id = 'public-property-images'
    AND public.client_has_property(NULLIF(split_part(name, '/', 1), '')::uuid)
  );

CREATE POLICY public_property_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'public-property-images'
    AND public.client_has_property(NULLIF(split_part(name, '/', 1), '')::uuid)
  );

COMMIT;
