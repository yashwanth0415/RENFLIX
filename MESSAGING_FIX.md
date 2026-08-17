# RENFLIX Messaging Fix

## Fixes
1. Removes infinite RLS recursion on `conversations` / `conversation_members`.
2. Adds SECURITY DEFINER helper `conversation_belongs_to_org`.
3. Adds `get_property_owner_id` so tenant messaging does not directly query the protected `organizations` table.
4. Tenant can message the configured organization owner.
5. Owner/staff can select tenants and start conversations.
6. Conversation/member/message RLS remains organization-scoped.

## Apply
Run the new migration after the previous migrations:

supabase/migrations/20260819_fix_conversation_rls.sql

If using Supabase CLI:
supabase db push

Or paste the migration into Supabase SQL Editor.

No frontend environment changes are required.

## Important
If the organization has neither:
- organizations.owner_id set to the owner's auth.users.id, nor
- a profiles row with role = OWNER and the same organization_id,

the tenant will still correctly receive:
"No property owner is configured for this organization."

In that case, set the organization's owner_id to the owner's Auth user UUID.
