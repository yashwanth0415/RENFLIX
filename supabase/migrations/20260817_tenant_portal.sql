-- RENFLIX tenant portal, tenant account security and monthly rent automation.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS emergency_email TEXT;
CREATE INDEX IF NOT EXISTS idx_tenants_profile_id ON public.tenants(profile_id);

-- One rent record per tenant per due date. Existing duplicate data is left untouched;
-- remove duplicates manually if this unique index reports a conflict.
CREATE UNIQUE INDEX IF NOT EXISTS uq_renflix_tenant_payment_due ON public.payments(tenant_id, due_date) WHERE due_date IS NOT NULL AND status <> 'CANCELLED';

-- Tenant access: tenants can see their own tenancy and payments only.
DROP POLICY IF EXISTS tenants_tenant_self ON public.tenants;
CREATE POLICY tenants_tenant_self ON public.tenants FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS tenants_tenant_update ON public.tenants;
CREATE POLICY tenants_tenant_update ON public.tenants FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS payments_tenant_self ON public.payments;
CREATE POLICY payments_tenant_self ON public.payments FOR SELECT TO authenticated USING (tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid()));

-- Prevent tenant users from changing protected tenancy fields. Owners/managers remain unrestricted by this trigger.
CREATE OR REPLACE FUNCTION public.guard_tenant_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r TEXT;
BEGIN
  SELECT role INTO r FROM public.profiles WHERE id = auth.uid();
  IF r = 'TENANT' AND OLD.profile_id = auth.uid() THEN
    IF NEW.profile_id IS DISTINCT FROM OLD.profile_id OR
       NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
       NEW.full_name IS DISTINCT FROM OLD.full_name OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.phone IS DISTINCT FROM OLD.phone OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.unit_id IS DISTINCT FROM OLD.unit_id OR
       NEW.move_in_date IS DISTINCT FROM OLD.move_in_date OR
       NEW.move_out_date IS DISTINCT FROM OLD.move_out_date OR
       NEW.tenant_display_id IS DISTINCT FROM OLD.tenant_display_id THEN
      RAISE EXCEPTION 'Tenants may update only emergency contact information';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_tenant_self_update ON public.tenants;
CREATE TRIGGER trg_guard_tenant_self_update BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_self_update();

-- Generate the current month's rent on the first day of each month.
CREATE OR REPLACE FUNCTION public.generate_monthly_rent_payments(p_run_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_count INTEGER := 0; due_day DATE; t RECORD; new_payment UUID;
BEGIN
  due_day := date_trunc('month', p_run_date)::date;
  FOR t IN
    SELECT tn.id tenant_id, tn.organization_id, tn.unit_id, u.property_id, u.monthly_rent, tn.profile_id
    FROM public.tenants tn JOIN public.units u ON u.id = tn.unit_id
    WHERE tn.status = 'ACTIVE' AND tn.unit_id IS NOT NULL AND u.monthly_rent > 0
  LOOP
    INSERT INTO public.payments(organization_id,tenant_id,unit_id,property_id,amount,due_date,status,notes)
    VALUES(t.organization_id,t.tenant_id,t.unit_id,t.property_id,t.monthly_rent,due_day,'PENDING','Monthly rent generated automatically')
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_payment;
    IF new_payment IS NOT NULL THEN
      created_count := created_count + 1;
      IF t.profile_id IS NOT NULL THEN
        PERFORM public.create_notification(t.profile_id,t.organization_id,'rent_due','Monthly rent is due',format('Your rent of ₹%s is due today.',to_char(t.monthly_rent,'FM999,999,999.00')),'payment',new_payment,jsonb_build_object('due_date',due_day));
      END IF;
      new_payment := NULL;
    END IF;
  END LOOP;
  RETURN created_count;
END; $$;

-- Enable pg_cron where available. The schedule runs at 18:35 UTC = 00:05 IST.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'renflix-monthly-rent';
SELECT cron.schedule('renflix-monthly-rent','35 18 1 * *','SELECT public.generate_monthly_rent_payments(CURRENT_DATE);');

-- Optional helper for a first run after deployment.
-- SELECT public.generate_monthly_rent_payments(CURRENT_DATE);
