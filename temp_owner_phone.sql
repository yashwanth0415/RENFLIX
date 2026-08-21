-- Add owner_phone column to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS owner_phone TEXT;

-- Update/get tenant owner contact (upi_id and phone)
CREATE OR REPLACE FUNCTION public.get_tenant_owner_contact()
RETURNS TABLE (
  upi_id TEXT,
  phone TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_upi TEXT;
  v_phone TEXT;
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

  SELECT NULLIF(BTRIM(owner_phone), '') INTO v_phone
  FROM public.organizations
  WHERE id = v_org
  LIMIT 1;

  RETURN QUERY SELECT v_upi AS upi_id, v_phone AS phone;
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_owner_contact() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_owner_contact() TO authenticated;

-- Update submit_upi_intent_payment to accept phone parameter
CREATE OR REPLACE FUNCTION public.submit_upi_intent_payment(
  p_payment_id UUID,
  p_reference_number TEXT DEFAULT NULL,
  p_use_phone BOOLEAN DEFAULT FALSE
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
  v_contact RECORD;
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

  SELECT * INTO v_contact
  FROM public.get_tenant_owner_contact();

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status NOT IN ('PENDING','DUE','OVERDUE','PARTIALLY_PAID') THEN
    RAISE EXCEPTION 'This payment cannot be paid now';
  END IF;

  -- Update payment based on whether using phone or UPI
  IF p_use_phone AND v_contact.phone IS NOT NULL THEN
    UPDATE public.payments
    SET
      status = 'UNDER_REVIEW',
      payment_method = 'PHONE',
      reference_number = NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
      notes = 'Phone payment submitted from RENFLIX. Awaiting payment verification.'
    WHERE id = p_payment_id
    RETURNING * INTO v_updated;
  ELSE
    UPDATE public.payments
    SET
      status = 'UNDER_REVIEW',
      payment_method = 'UPI',
      reference_number = NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
      notes = 'UPI payment submitted from RENFLIX. Awaiting payment verification.'
    WHERE id = p_payment_id
    RETURNING * INTO v_updated;
  END IF;

  -- Notify admins
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
      'Payment submitted',
      format(
        '%s submitted payment through %s.%s',
        v_tenant.full_name,
        CASE WHEN p_use_phone THEN 'phone' ELSE 'UPI' END,
        CASE
          WHEN p_use_phone AND v_contact.phone IS NOT NULL THEN format(' Phone: %s', v_contact.phone)
          WHEN NOT p_use_phone AND v_contact.upi_id IS NOT NULL THEN format(' UPI: %s', v_contact.upi_id)
          ELSE ''
        END
      ),
      false,
      'payment',
      v_updated.id,
      jsonb_build_object('payment_id', v_updated.id, 'payment_method', CASE WHEN p_use_phone THEN 'PHONE' ELSE 'UPI' END)
    );
  END LOOP;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_upi_intent_payment(UUID,TEXT,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_upi_intent_payment(UUID,TEXT,BOOLEAN) TO authenticated;