# RENFLIX Archive Migration

This build adds the archive system and 10-day automatic cleanup.

Run this migration in Supabase:

`supabase/migrations/20260828_archive_retention.sql`

It adds `archived_at` to properties, units, tenants, maintenance requests, community announcements, and conversations; creates indexes; creates `cleanup_renflix_archived_records()`; and schedules the cleanup daily at 03:15 UTC when `pg_cron` is available.

After deploying the migration, no additional SQL migration is required for the UI changes in this build.

Important: tenant records that still have payment history are retained by the cleanup function because the existing `payments.tenant_id` relationship is required and deleting the tenant would cascade-delete historical payments. They remain safely archived until that dependency is removed.
