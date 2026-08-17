-- Fix conversation creation for RENFLIX owner <-> tenant messaging.
-- This moves the create/find/member operation into one SECURITY DEFINER RPC,
-- avoiding client-side RLS ordering/insertion failures.

CREATE OR REPLACE FUNCTION public.start_user_conversation(
  p_other_user_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL
)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_org UUID;
  v_role TEXT;
  v_other UUID;
  v_other_role TEXT;
  v_conv public.conversations;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT organization_id, role
    INTO v_org, v_role
  FROM public.profiles
  WHERE id = v_me;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No organization configured for this account';
  END IF;

  -- Tenant always talks to the configured OWNER of their organization.
  IF v_role = 'TENANT' THEN
    SELECT p.id
      INTO v_other
    FROM public.profiles p
    WHERE p.organization_id = v_org
      AND p.role = 'OWNER'
    ORDER BY p.created_at ASC
    LIMIT 1;

    IF v_other IS NULL THEN
      SELECT o.owner_id
        INTO v_other
      FROM public.organizations o
      WHERE o.id = v_org
      LIMIT 1;
    END IF;

    IF v_other IS NULL THEN
      RAISE EXCEPTION 'No property owner is configured for this organization';
    END IF;

    v_other_role := 'OWNER';
  ELSE
    -- Owner/staff must explicitly select a tenant.
    IF p_other_user_id IS NULL THEN
      RAISE EXCEPTION 'Please select a tenant';
    END IF;

    SELECT p.id, p.role
      INTO v_other, v_other_role
    FROM public.profiles p
    JOIN public.tenants t ON t.profile_id = p.id
    WHERE p.id = p_other_user_id
      AND p.organization_id = v_org
      AND p.role = 'TENANT'
      AND t.organization_id = v_org
      AND t.status = 'ACTIVE'
    LIMIT 1;

    IF v_other IS NULL THEN
      RAISE EXCEPTION 'Selected tenant is not valid or is not active';
    END IF;
  END IF;

  IF v_other = v_me THEN
    RAISE EXCEPTION 'You cannot start a conversation with yourself';
  END IF;

  -- Reuse an existing direct conversation containing both users.
  SELECT c.*
    INTO v_conv
  FROM public.conversations c
  WHERE c.organization_id = v_org
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = c.id
        AND cm.user_id = v_me
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = c.id
        AND cm.user_id = v_other
    )
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF v_conv.id IS NOT NULL THEN
    RETURN v_conv;
  END IF;

  INSERT INTO public.conversations (
    organization_id,
    title
  ) VALUES (
    v_org,
    COALESCE(NULLIF(trim(p_title), ''),
      CASE WHEN v_role = 'TENANT' THEN 'Property Owner' ELSE 'Tenant Conversation' END)
  )
  RETURNING * INTO v_conv;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_conv.id, v_me), (v_conv.id, v_other);

  RETURN v_conv;
END;
$$;

REVOKE ALL ON FUNCTION public.start_user_conversation(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_user_conversation(UUID, TEXT) TO authenticated;

-- Make sure the function owner can bypass RLS even if the table policies change later.
ALTER FUNCTION public.start_user_conversation(UUID, TEXT) OWNER TO postgres;
