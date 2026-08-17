# RENFLIX Tenant Features — Updated

## Tenant navigation
Tenant accounts now see Dashboard, Payments, Maintenance, Messages and Settings.

## Maintenance
Tenant can submit a request only. The assigned property/unit is taken from the tenant account. The tenant cannot read the maintenance list/status or edit/close requests.

Owner/staff have no New Request action. They can view requests and update the status. Status changes create a notification for the tenant.

Apply `supabase/migrations/20260818_tenant_maintenance_messages.sql`.

## Messages
Tenant can message the organization owner only. Owner/staff can select an active tenant and start/open a direct conversation.

## Tenant deletion
Tenants page has Select -> checkboxes -> Delete. Deletion calls `tenant-delete`, removes the tenant record and Supabase Auth account, clears the linked profile through the Auth/profile cascade, and releases the assigned unit. Historical payments are retained with tenant_id set to NULL.

Deploy `supabase functions deploy tenant-delete`.

## Tenant password
Tenant provisioning uses the 10-digit Indian phone number as the initial password. Example: 9876543210 -> password 9876543210. The Auth phone is normalized to +919876543210.

Deploy `supabase functions deploy tenant-provision`.
