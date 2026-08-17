-- RENFLIX messaging RLS recursion + tenant owner lookup fix.
-- Apply AFTER 20260818_tenant_maintenance_messages.sql.

-- ------------------------------------------------------------
-- SECURITY-DEFINER helpers.
-- These read the base tables without re-entering their RLS
-- policies, preventing infinite recursion.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.conversation_belongs_to_org(
  p_conversation_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE id = p_conversation_id
      AND organization_id = p_org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_property_owner_id(
  p_org_id UUID
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT o.owner_id
      FROM public.organizations o
      WHERE o.id = p_org_id
      LIMIT 1
    ),
    (
      SELECT p.id
      FROM public.profiles p
      WHERE p.organization_id = p_org_id
        AND p.role = 'OWNER'
      ORDER BY p.created_at ASC
      LIMIT 1
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.conversation_belongs_to_org(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_owner_id(UUID) TO authenticated;

-- ------------------------------------------------------------
-- Replace conversation policies with non-recursive policies.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS conversations_org ON public.conversations;
DROP POLICY IF EXISTS conversations_staff ON public.conversations;
DROP POLICY IF EXISTS conversations_tenant ON public.conversations;
DROP POLICY IF EXISTS conversations_tenant_insert ON public.conversations;

DROP POLICY IF EXISTS conversation_members_org ON public.conversation_members;
DROP POLICY IF EXISTS conversation_members_staff ON public.conversation_members;
DROP POLICY IF EXISTS conversation_members_tenant ON public.conversation_members;
DROP POLICY IF EXISTS conversation_members_tenant_insert ON public.conversation_members;

DROP POLICY IF EXISTS messages_org ON public.messages;
DROP POLICY IF EXISTS messages_staff ON public.messages;
DROP POLICY IF EXISTS messages_tenant ON public.messages;
DROP POLICY IF EXISTS messages_tenant_insert ON public.messages;

CREATE POLICY conversations_staff
ON public.conversations
FOR ALL
TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) <> 'TENANT'
)
WITH CHECK (
  organization_id = public.get_user_org_id()
  AND COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) <> 'TENANT'
);

CREATE POLICY conversations_tenant
ON public.conversations
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND public.is_conversation_member(id, auth.uid())
);

CREATE POLICY conversations_tenant_insert
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id()
  AND COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) = 'TENANT'
);

-- ------------------------------------------------------------
-- Conversation members.
-- IMPORTANT: do not SELECT conversations directly here because
-- the conversations policy checks conversation membership.
-- ------------------------------------------------------------

CREATE POLICY conversation_members_staff
ON public.conversation_members
FOR ALL
TO authenticated
USING (
  public.conversation_belongs_to_org(
    conversation_id,
    public.get_user_org_id()
  )
  AND COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) <> 'TENANT'
)
WITH CHECK (
  public.conversation_belongs_to_org(
    conversation_id,
    public.get_user_org_id()
  )
  AND COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) <> 'TENANT'
);

CREATE POLICY conversation_members_tenant
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_conversation_member(
    conversation_id,
    auth.uid()
  )
);

CREATE POLICY conversation_members_tenant_insert
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.conversation_belongs_to_org(
    conversation_id,
    public.get_user_org_id()
  )
  AND (
    user_id = auth.uid()
    OR user_id = public.get_property_owner_id(
      public.get_user_org_id()
    )
  )
);

-- ------------------------------------------------------------
-- Messages.
-- ------------------------------------------------------------

CREATE POLICY messages_staff
ON public.messages
FOR ALL
TO authenticated
USING (
  public.conversation_belongs_to_org(
    conversation_id,
    public.get_user_org_id()
  )
  AND COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) <> 'TENANT'
)
WITH CHECK (
  public.conversation_belongs_to_org(
    conversation_id,
    public.get_user_org_id()
  )
  AND COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) <> 'TENANT'
);

CREATE POLICY messages_tenant
ON public.messages
FOR SELECT
TO authenticated
USING (
  public.is_conversation_member(
    conversation_id,
    auth.uid()
  )
);

CREATE POLICY messages_tenant_insert
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_member(
    conversation_id,
    auth.uid()
  )
);

-- ------------------------------------------------------------
-- Tenant owner lookup can be called from the client safely.
-- It returns only the owner UUID for the caller's organization
-- and does not expose organization rows.
-- ------------------------------------------------------------

