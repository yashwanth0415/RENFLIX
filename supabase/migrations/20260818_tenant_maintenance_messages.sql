-- RENFLIX tenant maintenance + owner/tenant messaging permissions.
-- Apply after the existing tenant portal migration.

-- ------------------------------------------------------------
-- Tenant maintenance: insert only for own tenant/unit.
-- Tenant cannot update/delete/track through direct table access.
-- Owner/staff can update status but cannot create from the UI.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS maintenance_org ON public.maintenance_requests;
DROP POLICY IF EXISTS maintenance_tenant_insert ON public.maintenance_requests;
DROP POLICY IF EXISTS maintenance_tenant_select ON public.maintenance_requests;
DROP POLICY IF EXISTS maintenance_staff_select ON public.maintenance_requests;
DROP POLICY IF EXISTS maintenance_staff_update ON public.maintenance_requests;

CREATE POLICY maintenance_staff_select
ON public.maintenance_requests FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
);

CREATE POLICY maintenance_staff_update
ON public.maintenance_requests FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
)
WITH CHECK (
  organization_id = public.get_user_org_id()
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
);

CREATE POLICY maintenance_tenant_insert
ON public.maintenance_requests FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid())
  AND organization_id = public.get_user_org_id()
  AND unit_id IN (
    SELECT unit_id FROM public.tenants
    WHERE profile_id = auth.uid() AND unit_id IS NOT NULL
  )
);

-- RLS-safe membership helper avoids recursive conversation_members policies.
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------
-- Conversations:
-- Owners/staff can access all conversations in their org.
-- Tenants can access only conversations in which they are members.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS conversations_org ON public.conversations;
DROP POLICY IF EXISTS conversations_staff ON public.conversations;
DROP POLICY IF EXISTS conversations_tenant ON public.conversations;
DROP POLICY IF EXISTS conversation_members_org ON public.conversation_members;
DROP POLICY IF EXISTS conversation_members_staff ON public.conversation_members;
DROP POLICY IF EXISTS conversation_members_tenant ON public.conversation_members;
DROP POLICY IF EXISTS messages_org ON public.messages;
DROP POLICY IF EXISTS messages_staff ON public.messages;
DROP POLICY IF EXISTS messages_tenant ON public.messages;

CREATE POLICY conversations_staff
ON public.conversations FOR ALL TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
)
WITH CHECK (
  organization_id = public.get_user_org_id()
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
);

CREATE POLICY conversations_tenant
ON public.conversations FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY conversations_tenant_insert
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id()
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') = 'TENANT'
);

CREATE POLICY conversation_members_staff
ON public.conversation_members FOR ALL TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE organization_id = public.get_user_org_id()
  )
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE organization_id = public.get_user_org_id()
  )
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
);

CREATE POLICY conversation_members_tenant
ON public.conversation_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY conversation_members_tenant_insert
ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE organization_id = public.get_user_org_id()
  )
  AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT o.owner_id
      FROM public.organizations o
      WHERE o.id = public.get_user_org_id()
    )
  )
);

CREATE POLICY messages_staff
ON public.messages FOR ALL TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE organization_id = public.get_user_org_id()
  )
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE organization_id = public.get_user_org_id()
  )
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
);

CREATE POLICY messages_tenant
ON public.messages FOR SELECT TO authenticated
USING (
  public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY messages_tenant_insert
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT cm.conversation_id
    FROM public.conversation_members cm
    WHERE cm.user_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- Notify the tenant when an owner changes maintenance status.
-- Tenant notification is visible even though the tenant cannot
-- query maintenance_requests directly.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_maintenance_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tenant_profile UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.tenant_id IS NOT NULL THEN
    SELECT profile_id INTO tenant_profile
    FROM public.tenants
    WHERE id = NEW.tenant_id;

    IF tenant_profile IS NOT NULL THEN
      PERFORM public.create_notification(
        tenant_profile,
        NEW.organization_id,
        'maintenance_updated',
        'Maintenance request updated',
        format('Your request "%s" is now %s.', NEW.title, replace(NEW.status, '_', ' ')),
        'maintenance',
        NEW.id,
        jsonb_build_object('status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_maintenance_status_changed ON public.maintenance_requests;
CREATE TRIGGER trg_notify_maintenance_status_changed
AFTER UPDATE OF status ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_status_changed();


-- Keep historical payment records when a tenant account is removed.
ALTER TABLE public.payments
  ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_tenant_id_fkey
  FOREIGN KEY (tenant_id)
  REFERENCES public.tenants(id)
  ON DELETE SET NULL;
