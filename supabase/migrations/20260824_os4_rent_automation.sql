-- RENFLIX OS4: monthly rent automation, due status, and targeted community announcements.
-- Apply after the existing RENFLIX migrations.

BEGIN;

-- ============================================================
-- 1. PAYMENT STATUS: PENDING -> DUE AFTER THE 10TH
-- ============================================================
DO $$
DECLARE r RECORD;
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
  ADD CONSTRAINT payments_status_check_os4
  CHECK (status IN (
    'PENDING','DUE','UNDER_REVIEW','RECEIVED','PAID',
    'PARTIALLY_PAID','OVERDUE','WAIVED','CANCELLED'
  ));

-- ============================================================
-- 2. TARGETED COMMUNITY ANNOUNCEMENTS
-- ============================================================
ALTER TABLE public.community_announcements
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_property
  ON public.community_announcements(property_id);
CREATE INDEX IF NOT EXISTS idx_announcements_unit
  ON public.community_announcements(unit_id);

CREATE OR REPLACE FUNCTION public.notify_tenants_of_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tenant RECORD;
BEGIN
  FOR v_tenant IN
    SELECT t.profile_id
    FROM public.tenants t
    WHERE t.organization_id = NEW.organization_id
      AND t.status = 'ACTIVE'
      AND t.profile_id IS NOT NULL
      AND (
        (NEW.unit_id IS NOT NULL AND t.unit_id = NEW.unit_id)
        OR
        (NEW.unit_id IS NULL AND NEW.property_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.units u
          WHERE u.id = t.unit_id AND u.property_id = NEW.property_id
        ))
        OR
        (NEW.property_id IS NULL AND NEW.unit_id IS NULL)
      )
  LOOP
    INSERT INTO public.notifications (
      user_id, organization_id, type, title, message,
      read, entity_type, entity_id, metadata
    )
    VALUES (
      v_tenant.profile_id, NEW.organization_id, 'announcement',
      NEW.title, NEW.body, false, 'announcement', NEW.id,
      jsonb_build_object(
        'announcement_id', NEW.id,
        'property_id', NEW.property_id,
        'unit_id', NEW.unit_id,
        'priority', NEW.priority
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announcement_notify_tenants
  ON public.community_announcements;
CREATE TRIGGER trg_announcement_notify_tenants
AFTER INSERT ON public.community_announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_tenants_of_announcement();

-- ============================================================
-- 3. AUTOMATIC MONTHLY RENT PAYMENTS
-- Creates one payment per active tenant/unit for the 1st of
-- the current month. New payments start as PENDING. On/after
-- the 11th, unpaid PENDING payments become DUE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_rent_payments(p_run_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_due_date DATE := date_trunc('month', p_run_date)::date;
  r RECORD;
BEGIN
  -- Staff/admin cron execution can create payments for every organization.
  -- The unique guard below makes the function safe to run repeatedly.
  FOR r IN
    SELECT
      t.id AS tenant_id,
      t.organization_id,
      t.unit_id,
      u.property_id,
      u.monthly_rent,
      l.id AS lease_id
    FROM public.tenants t
    JOIN public.units u ON u.id = t.unit_id
    LEFT JOIN LATERAL (
      SELECT id
      FROM public.leases
      WHERE tenant_id = t.id
        AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    ) l ON true
    WHERE t.status = 'ACTIVE'
      AND t.unit_id IS NOT NULL
      AND COALESCE(u.monthly_rent, 0) > 0
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.tenant_id = r.tenant_id
        AND p.unit_id = r.unit_id
        AND p.due_date = v_due_date
        AND p.status <> 'CANCELLED'
    ) THEN
      INSERT INTO public.payments (
        organization_id, lease_id, tenant_id, unit_id, property_id,
        amount, due_date, status, notes
      )
      VALUES (
        r.organization_id, r.lease_id, r.tenant_id, r.unit_id, r.property_id,
        r.monthly_rent, v_due_date, 'PENDING',
        format('Monthly rent for %s', to_char(v_due_date, 'FMMonth YYYY'))
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  IF EXTRACT(DAY FROM p_run_date) > 10 THEN
    UPDATE public.payments
    SET status = 'DUE'
    WHERE due_date = v_due_date
      AND status = 'PENDING'
      AND paid_date IS NULL;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_monthly_rent_payments(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_monthly_rent_payments(DATE) TO authenticated;

-- If pg_cron is available in the Supabase project, run this daily.
-- The function itself is idempotent, so reruns are safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'renflix-monthly-rent-payments';
      PERFORM cron.schedule(
        'renflix-monthly-rent-payments',
        '5 0 * * *',
        $job$SELECT public.generate_monthly_rent_payments(CURRENT_DATE);$job$
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron could not be configured automatically: %', SQLERRM;
    END;
  END IF;
END $$;

COMMIT;
