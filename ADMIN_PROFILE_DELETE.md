# Admin profile deletion

Admin profile deletion now uses the `admin-delete-profile` Edge Function.

## Deploy

```bash
supabase functions deploy admin-delete-profile
```

No additional SQL migration is required for the Auth deletion flow.

The function:

- verifies the caller is an RENFLIX ADMIN;
- blocks deleting the currently signed-in admin;
- deletes organizations owned by an OWNER first, which cascades through the owner's properties, units, tenants, leases, payments, maintenance, conversations/messages, notifications and public-property records;
- deletes a TENANT's RENFLIX tenant record before deleting the Auth user;
- transfers any non-owner property creator references to the organization owner so the Auth FK remains valid;
- permanently deletes the corresponding Supabase Auth user with `deleteUser(..., false)`;
- lets Auth/database cascades remove profile-linked client accounts, memberships and other Auth-linked records.
