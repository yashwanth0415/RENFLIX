-- RENFLIX UPI intent payments and tenant-safe owner UPI lookup.
-- Browser-based UPI intents cannot cryptographically verify bank success;
-- the tenant submission remains UNDER_REVIEW until an authorized reviewer confirms it.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS owner_upi_id TEXT;

CREATE OR REPLACE FUNCTION public.get_tenant_owner_upi()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_upi TEXT;
BEGIN
  SELECT organization_id INTO v_org
  FROM public.profiles
  WHERE id = auth.uid()
    AND role = 'TENANT'
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Tenant account not found';
  END IF;

  SELECT NULLIF(BTRIM(owner_upi_id), '') INTO v_upi
  FROM public.organizations
  WHERE id = v_org
  LIMIT 1;

  RETURN v_upi;
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_owner_upi() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_owner_upi() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_upi_intent_payment(
  p_payment_id UUID,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_tenant public.tenants;
  v_payment public.payments;
  v_updated public.payments;
  v_admin RECORD;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE profile_id = v_user
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_tenant.id IS NULL THEN
    RAISE EXCEPTION 'Tenant account not found';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND tenant_id = v_tenant.id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status NOT IN ('PENDING','DUE','OVERDUE','PARTIALLY_PAID') THEN
    RAISE EXCEPTION 'This payment cannot be paid now';
  END IF;

  UPDATE public.payments
  SET
    status = 'UNDER_REVIEW',
    payment_method = 'UPI',
    reference_number = NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    notes = 'UPI payment submitted from RENFLIX. Awaiting payment verification.'
  WHERE id = p_payment_id
  RETURNING * INTO v_updated;

  FOR v_admin IN
    SELECT id, organization_id
    FROM public.profiles
    WHERE role = 'ADMIN'
  LOOP
    INSERT INTO public.notifications (
      user_id, organization_id, type, title, message,
      read, entity_type, entity_id, metadata
    )
    VALUES (
      v_admin.id,
      v_updated.organization_id,
      'payment_review',
      'UPI payment submitted',
      format(
        '%s submitted ₹%s through UPI.%s',
        v_tenant.full_name,
        to_char(v_updated.amount, 'FM999G999G999G990D00'),
        CASE
          WHEN v_updated.reference_number IS NULL THEN ''
          ELSE format(' UTR: %s', v_updated.reference_number)
        END
      ),
      false,
      'payment',
      v_updated.id,
      jsonb_build_object('payment_id', v_updated.id, 'payment_method', 'UPI')
    );
  END LOOP;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_upi_intent_payment(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_upi_intent_payment(UUID,TEXT) TO authenticated;
