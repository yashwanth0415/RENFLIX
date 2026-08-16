-- ============================================================
-- RENFLIX ADMIN PANEL
-- EXISTING TABLES ONLY
-- READ ACCESS FOR CURRENT ADMIN PANEL USER
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Admin identity helper
-- ------------------------------------------------------------
-- Your current AdminPage.tsx identifies the administrator
-- using this exact email.
--
-- We use auth.jwt() instead of querying profiles, so there
-- is no RLS recursion problem.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_renflix_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT
        COALESCE(auth.jwt() ->> 'email', '') =
        'thurpatiyashwanth@gmail.com';
$$;


-- ------------------------------------------------------------
-- 2. Enable RLS on the existing application tables
-- ------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. ADMIN SELECT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "RENFLIX admin read organizations"
ON public.organizations;

CREATE POLICY "RENFLIX admin read organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read profiles"
ON public.profiles;

CREATE POLICY "RENFLIX admin read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read properties"
ON public.properties;

CREATE POLICY "RENFLIX admin read properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read units"
ON public.units;

CREATE POLICY "RENFLIX admin read units"
ON public.units
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read tenants"
ON public.tenants;

CREATE POLICY "RENFLIX admin read tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read leases"
ON public.leases;

CREATE POLICY "RENFLIX admin read leases"
ON public.leases
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read payments"
ON public.payments;

CREATE POLICY "RENFLIX admin read payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read maintenance"
ON public.maintenance_requests;

CREATE POLICY "RENFLIX admin read maintenance"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read conversations"
ON public.conversations;

CREATE POLICY "RENFLIX admin read conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read announcements"
ON public.community_announcements;

CREATE POLICY "RENFLIX admin read announcements"
ON public.community_announcements
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


DROP POLICY IF EXISTS "RENFLIX admin read notifications"
ON public.notifications;

CREATE POLICY "RENFLIX admin read notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    public.is_renflix_admin()
);


-- ------------------------------------------------------------
-- 4. Allow authenticated users to execute the helper
-- ------------------------------------------------------------

GRANT EXECUTE
ON FUNCTION public.is_renflix_admin()
TO authenticated;


COMMIT;


-- ============================================================
-- 5. VERIFY ADMIN ACCESS
-- ============================================================

SELECT
    auth.jwt() ->> 'email' AS current_email,
    public.is_renflix_admin() AS is_admin;