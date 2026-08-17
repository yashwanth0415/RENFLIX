-- RENFLIX final fixes: human payment IDs, community deletion, and named conversations.

-- ============================================================
-- 5-DIGIT PAYMENT ID
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_display_id TEXT;

CREATE OR REPLACE FUNCTION public.generate_payment_display_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
BEGIN
  LOOP
    v_id := LPAD((FLOOR(10000 + random() * 90000))::INT::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.payments WHERE payment_display_id = v_id
    );
  END LOOP;
  RETURN v_id;
END;
$$;

UPDATE public.payments
SET payment_display_id = public.generate_payment_display_id()
WHERE payment_display_id IS NULL;

ALTER TABLE public.payments
  ALTER COLUMN payment_display_id SET DEFAULT public.generate_payment_display_id();

CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_display_id_uidx
  ON public.payments(payment_display_id);

-- ============================================================
-- OWNER / ADMIN COMMUNITY ANNOUNCEMENT DELETE
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_community_announcements(
  p_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.community_announcements ca
  WHERE ca.id = ANY(p_ids)
    AND (
      public.is_renflix_admin()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.organization_id = ca.organization_id
          AND p.role IN ('OWNER','PROPERTY_MANAGER','HOSTEL_MANAGER','ADMIN')
      )
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_community_announcements(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_community_announcements(UUID[]) TO authenticated;

-- ============================================================
-- NAMED DIRECT CONVERSATIONS
-- Existing generic titles are corrected when the conversation is opened.
-- ============================================================
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
  v_other_name TEXT;
  v_conv public.conversations;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT organization_id, role INTO v_org, v_role
  FROM public.profiles WHERE id = v_me;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No organization configured for this account';
  END IF;

  IF v_role = 'TENANT' THEN
    SELECT p.id, COALESCE(NULLIF(trim(p.full_name),''),'Property Owner')
    INTO v_other, v_other_name
    FROM public.profiles p
    WHERE p.organization_id = v_org
      AND p.role = 'OWNER'
    ORDER BY p.created_at ASC
    LIMIT 1;

    IF v_other IS NULL THEN
      SELECT o.owner_id, COALESCE(NULLIF(trim(p.full_name),''),'Property Owner')
      INTO v_other, v_other_name
      FROM public.organizations o
      LEFT JOIN public.profiles p ON p.id = o.owner_id
      WHERE o.id = v_org
      LIMIT 1;
    END IF;

    IF v_other IS NULL THEN
      RAISE EXCEPTION 'No property owner is configured for this organization';
    END IF;
  ELSE
    IF p_other_user_id IS NULL THEN
      RAISE EXCEPTION 'Please select a tenant';
    END IF;

    SELECT p.id, COALESCE(NULLIF(trim(p.full_name),''),'Tenant')
    INTO v_other, v_other_name
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

  IF v_other = v_me THEN RAISE EXCEPTION 'You cannot start a conversation with yourself'; END IF;

  SELECT c.* INTO v_conv
  FROM public.conversations c
  WHERE c.organization_id = v_org
    AND EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=v_me)
    AND EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=v_other)
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF v_conv.id IS NOT NULL THEN
    -- Always expose the real other person's name, including for old conversations.
    UPDATE public.conversations
    SET title = v_other_name,
        updated_at = NOW()
    WHERE id = v_conv.id
      AND (title IS NULL OR title IN ('Property Owner','Tenant Conversation','Conversation'));
    SELECT * INTO v_conv FROM public.conversations WHERE id = v_conv.id;
    RETURN v_conv;
  END IF;

  INSERT INTO public.conversations (organization_id, title)
  VALUES (v_org, v_other_name)
  RETURNING * INTO v_conv;

  INSERT INTO public.conversation_members (conversation_id,user_id)
  VALUES (v_conv.id,v_me),(v_conv.id,v_other);

  RETURN v_conv;
END;
$$;

REVOKE ALL ON FUNCTION public.start_user_conversation(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_user_conversation(UUID,TEXT) TO authenticated;
ALTER FUNCTION public.start_user_conversation(UUID,TEXT) OWNER TO postgres;
