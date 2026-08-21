# RENFLIX Public Property + Client Portal

This update adds:

- Public property pages at `/<property_display_id>` (for example `/16401`).
- Public property search from the landing page using property name, city, or property ID.
- Public enquiry form with name, phone, optional email, enquiry type, amount and details.
- Admin-only client creation at `/admin?section=clients`.
- Client usernames/passwords backed by Supabase Auth; passwords are never stored in application tables.
- Multiple property assignments per client.
- Automatic public publishing for assigned properties.
- Client portal at `/client`.
- Client editing of public headline, description, features, enquiry types and public images.
- Client lead inbox showing visitor details.

## Required Supabase setup

Apply:

`supabase/migrations/20260821_public_property_clients.sql`

Deploy these Edge Functions:

- `supabase/functions/admin-create-client`
- `supabase/functions/admin-update-client`

The Edge Functions use Supabase's built-in `SUPABASE_SERVICE_ROLE_KEY` and do not require you to place a service key in the frontend.

## Important

The supplied project ZIP did not contain a complete `node_modules` install, and the build could not be executed in this environment because Vite was unavailable locally. The source integration was checked and the existing project structure was preserved.

Run your normal install/build flow after extracting the ZIP:

```bash
npm install
npm run build
```

Because the current dependency lock resolves to React Router 8.3.0, use the Node version required by that dependency when installing/building.
