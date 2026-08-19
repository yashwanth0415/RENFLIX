-- RENFLIX: replace the four-argument payment request RPC with an optional remarks argument.\n-- Existing business validation, payment creation and tenant notification behavior are retained.\n\nDROP FUNCTION IF EXISTS public.push_payment_request(UUID, UUID, NUMERIC, DATE);

CREATE OR REPLACE FUNCTION public.push_payment_request(
  p_property_id UUID,
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_month DATE,
  p_remarks TEXT DEFAULT NULL
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
    CASE
      WHEN p_remarks IS NULL OR btrim(p_remarks) = '' THEN
        format('Payment request for %s', to_char(date_trunc('month', p_month), 'FMMonth YYYY'))
      ELSE
        format('Payment request for %s. Remarks: %s',
          to_char(date_trunc('month', p_month), 'FMMonth YYYY'),
          btrim(p_remarks))
    END
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

REVOKE ALL ON FUNCTION public.push_payment_request(UUID, UUID, NUMERIC, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.push_payment_request(UUID, UUID, NUMERIC, DATE, TEXT) TO authenticated;
