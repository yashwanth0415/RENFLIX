-- RENFLIX final tenant payment proof, admin review, and community announcement delivery.

-- ============================================================
-- PAYMENT REVIEW FIELDS / STATUSES
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS submission_screenshot_url TEXT;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN (
    'PENDING','UNDER_REVIEW','RECEIVED','PAID',
    'PARTIALLY_PAID','OVERDUE','WAIVED','CANCELLED'
  ));

-- ============================================================
-- PRIVATE PAYMENT SCREENSHOT STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-submissions', 'payment-submissions', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "payment proof tenant upload" ON storage.objects;
CREATE POLICY "payment proof tenant upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "payment proof owner admin read" ON storage.objects;
CREATE POLICY "payment proof owner admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-submissions'
  AND (
    public.is_renflix_admin()
    OR EXISTS (
      SELECT 1
      FROM public.payments pay
      JOIN public.tenants ten ON ten.id = pay.tenant_id
      JOIN public.profiles tp ON tp.id = ten.profile_id
      WHERE pay.submission_screenshot_url = name
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles op
            WHERE op.id = auth.uid()
              AND op.organization_id = pay.organization_id
              AND op.role IN ('OWNER','PROPERTY_MANAGER','HOSTEL_MANAGER','ADMIN')
          )
          OR tp.id = auth.uid()
        )
    )
  )
);

DROP POLICY IF EXISTS "payment proof tenant delete own" ON storage.objects;
CREATE POLICY "payment proof tenant delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- TENANT SUBMITS OFFLINE/MANUAL PAYMENT PROOF
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_payment_id UUID,
  p_payment_method TEXT,
  p_reference_number TEXT,
  p_remarks TEXT,
  p_screenshot_url TEXT DEFAULT NULL
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

  IF v_payment.status NOT IN ('PENDING','OVERDUE','PARTIALLY_PAID') THEN
    RAISE EXCEPTION 'This payment cannot be submitted for review';
  END IF;

  IF p_payment_method IS NULL OR trim(p_payment_method) = '' THEN
    RAISE EXCEPTION 'Payment mode is required';
  END IF;

  IF p_reference_number IS NULL OR trim(p_reference_number) = '' THEN
    RAISE EXCEPTION 'Transaction ID is required';
  END IF;

  UPDATE public.payments
  SET
    status = 'UNDER_REVIEW',
    payment_method = upper(trim(p_payment_method)),
    reference_number = trim(p_reference_number),
    notes = NULLIF(trim(COALESCE(p_remarks, '')), ''),
    submission_screenshot_url = NULLIF(trim(COALESCE(p_screenshot_url, '')), '')
  WHERE id = p_payment_id
  RETURNING * INTO v_updated;

  -- Notify all RENFLIX administrators.
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
      'Payment submitted for review',
      format(
        '%s submitted ₹%s for review. Transaction ID: %s',
        v_tenant.full_name,
        to_char(v_updated.amount, 'FM999G999G999G990D00'),
        v_updated.reference_number
      ),
      false,
      'payment',
      v_updated.id,
      jsonb_build_object('payment_id', v_updated.id)
    );
  END LOOP;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof(UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(UUID,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- ============================================================
-- ADMIN REVIEW NOTIFICATION
-- Admin changes UNDER_REVIEW -> RECEIVED.
-- Tenant gets DONE; owner gets RECEIVED.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_payment_review_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants;
  v_owner RECORD;
BEGIN
  IF OLD.status = 'UNDER_REVIEW' AND NEW.status = 'RECEIVED' THEN
    IF NEW.paid_date IS NULL THEN
      UPDATE public.payments
      SET paid_date = CURRENT_DATE
      WHERE id = NEW.id;
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = NEW.tenant_id;

    IF v_tenant.profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, organization_id, type, title, message,
        read, entity_type, entity_id, metadata
      )
      VALUES (
        v_tenant.profile_id,
        NEW.organization_id,
        'payment_received',
        'Payment approved',
        format('Your payment of ₹%s has been approved and marked as done.',
          to_char(NEW.amount, 'FM999G999G999G990D00')),
        false, 'payment', NEW.id,
        jsonb_build_object('payment_id', NEW.id)
      );
    END IF;

    FOR v_owner IN
      SELECT id FROM public.profiles
      WHERE organization_id = NEW.organization_id
        AND role IN ('OWNER','PROPERTY_MANAGER','HOSTEL_MANAGER')
    LOOP
      INSERT INTO public.notifications (
        user_id, organization_id, type, title, message,
        read, entity_type, entity_id, metadata
      )
      VALUES (
        v_owner.id,
        NEW.organization_id,
        'payment_received',
        'Payment received',
        format('%s payment of ₹%s was approved by admin.',
          COALESCE(v_tenant.full_name, 'Tenant'),
          to_char(NEW.amount, 'FM999G999G999G990D00')),
        false, 'payment', NEW.id,
        jsonb_build_object('payment_id', NEW.id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_review_result ON public.payments;
CREATE TRIGGER trg_payment_review_result
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_review_result();

-- ============================================================
-- COMMUNITY ANNOUNCEMENTS -> TENANT NOTIFICATIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_tenants_of_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
BEGIN
  FOR v_tenant IN
    SELECT profile_id
    FROM public.tenants
    WHERE organization_id = NEW.organization_id
      AND status = 'ACTIVE'
      AND profile_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (
      user_id, organization_id, type, title, message,
      read, entity_type, entity_id, metadata
    )
    VALUES (
      v_tenant.profile_id,
      NEW.organization_id,
      'announcement',
      NEW.title,
      NEW.body,
      false,
      'announcement',
      NEW.id,
      jsonb_build_object(
        'announcement_id', NEW.id,
        'priority', NEW.priority
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announcement_notify_tenants ON public.community_announcements;
CREATE TRIGGER trg_announcement_notify_tenants
AFTER INSERT ON public.community_announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_tenants_of_announcement();

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;
