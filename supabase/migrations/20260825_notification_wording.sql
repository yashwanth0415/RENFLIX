-- RENFLIX notification copy: concise titles in the requested format.
CREATE OR REPLACE FUNCTION public.notify_property_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recipient UUID;
BEGIN
  recipient := public.get_notification_recipient(NEW.organization_id);
  PERFORM public.create_notification(
    recipient, NEW.organization_id, 'property_created',
    (NEW.name || ' Property Added'),
    ('Property ' || NEW.name || ' was added successfully.'),
    'property', NEW.id,
    jsonb_build_object('property_name', NEW.name, 'property_type', NEW.property_type)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_tenant_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient UUID;
  property_name TEXT;
BEGIN
  recipient := public.get_notification_recipient(NEW.organization_id);
  SELECT p.name INTO property_name
  FROM public.units u JOIN public.properties p ON p.id = u.property_id
  WHERE u.id = NEW.unit_id;
  PERFORM public.create_notification(
    recipient, NEW.organization_id, 'tenant_added',
    (NEW.full_name || ' Tenant Added'),
    ('Tenant ' || NEW.full_name || ' was added' || CASE WHEN property_name IS NOT NULL THEN ' to ' || property_name ELSE '' END || '.'),
    'tenant', NEW.id,
    jsonb_build_object('tenant_name', NEW.full_name, 'property_name', property_name, 'unit_id', NEW.unit_id)
  );
  RETURN NEW;
END;
$$;
