# RENFLIX Final Portal Updates

Implemented in this version:

- Admin page: Select -> checkboxes -> Delete; deletion uses `admin_delete_records` RPC and removes database records.
- Owner / Property Manager sidebar: Dashboard, Properties, Units, Tenants, Payments, Maintenance. `More` contains Messages, Community, Leases, Analytics and Intelligence with Beta badges.
- Settings moved to the bottom of the navigation. Sign out is inside Settings.
- Tenant sidebar keeps Dashboard, Payments, Maintenance, Messages and Settings; sign out is inside Settings.
- Owner Payments: Push Payment modal with property -> tenant -> amount -> month. Uses `push_payment_request` RPC and creates a tenant notification.
- Tenant Payments can pay pending requests with the existing Razorpay flow.
- Maintenance: Select/Delete for owners and tenants. Tenant requests are visible for selection/deletion; owners can update status but have no create-maintenance UI.
- Messages: Select/Delete conversations for owners and tenants. Deleting a conversation cascades its messages.
- Toast notifications already use fixed bottom-right positioning; the shared Toast component remains the single alert surface.
- PWA manifest/icons/public assets were preserved.

## Required Supabase migration

Apply:

`supabase/migrations/20260821_admin_push_payment_delete.sql`

This migration creates:
- `admin_delete_records`
- `push_payment_request`
- maintenance delete/select policies
- conversation delete policy

## Build

The uploaded project did not have a usable local dependency install in this environment, so the final ZIP excludes `node_modules` and stale `dist` output.

Run after extraction:

```bash
npm install
npm run build
```

Then deploy the generated build using your existing PWA hosting workflow.

For Supabase CLI:

```bash
supabase db push
```
