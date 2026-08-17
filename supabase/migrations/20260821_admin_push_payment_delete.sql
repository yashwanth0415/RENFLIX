-- RENFLIX: admin deletion, push payment requests, and safe delete policies.
-- Apply after all existing RENFLIX migrations.

-- ============================================================
-- ADMIN BULK DELETE
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_delete_records(
  p_table TEXT,
  p_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_id UUID;
BEGIN
  IF NOT public.is_renflix_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_table NOT IN (
    'organizations','profiles','properties','units','tenants',
    'leases','payments','maintenance_requests','conversations',
    'community_announcements','notifications'
  ) THEN
    RAISE EXCEPTION 'Table is not allowed for admin deletion';
  END IF;

  FOREACH v_id IN ARRAY p_ids LOOP
    IF p_table = 'organizations' THEN
      DELETE FROM public.organizations WHERE id = v_id;
    ELSIF p_table = 'profiles' THEN
      DELETE FROM public.profiles WHERE id = v_id;
    ELSIF p_table = 'properties' THEN
      DELETE FROM public.properties WHERE id = v_id;
    ELSIF p_table = 'units' THEN
      DELETE FROM public.units WHERE id = v_id;
    ELSIF p_table = 'tenants' THEN
      DELETE FROM public.tenants WHERE id = v_id;
    ELSIF p_table = 'leases' THEN
      DELETE FROM public.leases WHERE id = v_id;
    ELSIF p_table = 'payments' THEN
      DELETE FROM public.payments WHERE id = v_id;
    ELSIF p_table = 'maintenance_requests' THEN
      DELETE FROM public.maintenance_requests WHERE id = v_id;
    ELSIF p_table = 'conversations' THEN
      DELETE FROM public.conversations WHERE id = v_id;
    ELSIF p_table = 'community_announcements' THEN
      DELETE FROM public.community_announcements WHERE id = v_id;
    ELSIF p_table = 'notifications' THEN
      DELETE FROM public.notifications WHERE id = v_id;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_records(TEXT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_records(TEXT, UUID[]) TO authenticated;

-- ============================================================
-- OWNER -> TENANT PUSH PAYMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.push_payment_request(
  p_property_id UUID,
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_month DATE
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_org UUID;
  v_role TEXT;
  v_tenant public.tenants;
  v_unit public.units;
  v_payment public.payments;
  v_property_name TEXT;
BEGIN
  SELECT organization_id, role INTO v_org, v_role
  FROM public.profiles WHERE id = v_me;

  IF v_me IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'Unauthorized or no organization configured';
  END IF;

  IF v_role NOT IN ('OWNER','PROPERTY_MANAGER','HOSTEL_MANAGER','ADMIN') THEN
    RAISE EXCEPTION 'Only property staff can push payment requests';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE id = p_tenant_id
    AND organization_id = v_org
    AND status = 'ACTIVE';

  IF v_tenant.id IS NULL THEN
    RAISE EXCEPTION 'Selected tenant is not valid';
  END IF;

  IF v_tenant.unit_id IS NULL THEN
    RAISE EXCEPTION 'Selected tenant is not assigned to a unit';
  END IF;

  SELECT * INTO v_unit
  FROM public.units
  WHERE id = v_tenant.unit_id
    AND property_id = p_property_id
    AND organization_id = v_org;

  IF v_unit.id IS NULL THEN
    RAISE EXCEPTION 'Selected tenant does not belong to this property';
  END IF;

  SELECT name INTO v_property_name
  FROM public.properties
  WHERE id = p_property_id AND organization_id = v_org;

  INSERT INTO public.payments (
    organization_id, tenant_id, unit_id, property_id,
    amount, due_date, status, notes
  )
  VALUES (
    v_org, v_tenant.id, v_unit.id, p_property_id,
    p_amount, date_trunc('month', p_month)::date, 'PENDING',
    format('Payment request for %s', to_char(date_trunc('month', p_month), 'FMMonth YYYY'))
  )
  RETURNING * INTO v_payment;

  IF v_tenant.profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, organization_id, type, title, message,
      read, entity_type, entity_id, metadata
    )
    VALUES (
      v_tenant.profile_id,
      v_org,
      'payment_request',
      'Payment request received',
      format(
        '%s has requested ₹%s for %s. Open Payments to pay now.',
        COALESCE(v_property_name, 'Your property'),
        to_char(p_amount, 'FM999G999G999G990D00'),
        to_char(date_trunc('month', p_month), 'FMMonth YYYY')
      ),
      false,
      'payment',
      v_payment.id,
      jsonb_build_object(
        'payment_id', v_payment.id,
        'month', to_char(date_trunc('month', p_month), 'YYYY-MM'),
        'amount', p_amount
      )
    );
  END IF;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.push_payment_request(UUID, UUID, NUMERIC, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.push_payment_request(UUID, UUID, NUMERIC, DATE) TO authenticated;

-- ============================================================
-- MAINTENANCE DELETE
-- ============================================================
DROP POLICY IF EXISTS maintenance_staff_delete ON public.maintenance_requests;
DROP POLICY IF EXISTS maintenance_tenant_delete ON public.maintenance_requests;

CREATE POLICY maintenance_staff_delete
ON public.maintenance_requests
FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
);

CREATE POLICY maintenance_tenant_delete
ON public.maintenance_requests
FOR DELETE TO authenticated
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE profile_id = auth.uid()
  )
);

-- ============================================================
-- CONVERSATION DELETE
-- ============================================================
DROP POLICY IF EXISTS conversations_tenant_delete ON public.conversations;

CREATE POLICY conversations_tenant_delete
ON public.conversations
FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND (
    COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'TENANT'
    OR public.is_conversation_member(id, auth.uid())
  )
);

-- Messages are deleted automatically with their conversation.

-- Tenant may see their own requests so Select/Delete can be used.
DROP POLICY IF EXISTS maintenance_tenant_select ON public.maintenance_requests;
CREATE POLICY maintenance_tenant_select
ON public.maintenance_requests
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE profile_id = auth.uid()
  )
);
