-- RENFLIX archive system
-- Adds soft-archive timestamps across user-managed records and permanently
-- removes archived records after 10 days through a daily pg_cron job.

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.community_announcements ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_properties_archived_at ON public.properties(archived_at);
CREATE INDEX IF NOT EXISTS idx_units_archived_at ON public.units(archived_at);
CREATE INDEX IF NOT EXISTS idx_tenants_archived_at ON public.tenants(archived_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_archived_at ON public.maintenance_requests(archived_at);
CREATE INDEX IF NOT EXISTS idx_announcements_archived_at ON public.community_announcements(archived_at);
CREATE INDEX IF NOT EXISTS idx_conversations_archived_at ON public.conversations(archived_at);

CREATE OR REPLACE FUNCTION public.cleanup_renflix_archived_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - interval '10 days';
BEGIN
  -- Messages are removed automatically with their archived conversations.
  DELETE FROM public.conversations
    WHERE archived_at IS NOT NULL AND archived_at <= cutoff;

  DELETE FROM public.community_announcements
    WHERE archived_at IS NOT NULL AND archived_at <= cutoff;

  DELETE FROM public.maintenance_requests
    WHERE archived_at IS NOT NULL AND archived_at <= cutoff;

  DELETE FROM public.tenants t
    WHERE t.archived_at IS NOT NULL AND t.archived_at <= cutoff
      AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.tenant_id = t.id);

  DELETE FROM public.units
    WHERE archived_at IS NOT NULL AND archived_at <= cutoff;

  -- Only remove properties when no child unit/maintenance still references them.
  DELETE FROM public.properties p
    WHERE p.archived_at IS NOT NULL
      AND p.archived_at <= cutoff
      AND NOT EXISTS (SELECT 1 FROM public.units u WHERE u.property_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.maintenance_requests m WHERE m.property_id = p.id);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_renflix_archived_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_renflix_archived_records() TO service_role;

-- Schedule daily cleanup at 03:15 UTC.
DO $cron$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'renflix-archive-cleanup';

  PERFORM cron.schedule(
    'renflix-archive-cleanup',
    '15 3 * * *',
    $job$SELECT public.cleanup_renflix_archived_records()$job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RENFLIX archive cleanup function created, but pg_cron could not be scheduled: %', SQLERRM;
END $cron$;
