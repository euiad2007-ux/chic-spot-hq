ALTER TABLE public.audit_log ADD COLUMN actor_name text;

UPDATE public.audit_log a
SET actor_name = COALESCE(NULLIF(p.full_name, ''), a.user_id::text)
FROM public.profiles p
WHERE p.id = a.user_id
  AND a.actor_name IS NULL;

CREATE OR REPLACE FUNCTION public.log_platform_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_before jsonb;
  row_after jsonb;
  target_salon uuid;
  target_id uuid;
  actor text;
BEGIN
  row_before := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  row_after := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;

  IF TG_TABLE_NAME = 'salons' THEN
    target_salon := COALESCE((row_after->>'id')::uuid, (row_before->>'id')::uuid);
  ELSE
    target_salon := COALESCE((row_after->>'salon_id')::uuid, (row_before->>'salon_id')::uuid);
  END IF;

  IF COALESCE(row_after->>'id', row_before->>'id') ~* '^[0-9a-f-]{36}$' THEN
    target_id := COALESCE((row_after->>'id')::uuid, (row_before->>'id')::uuid);
  END IF;

  SELECT COALESCE(NULLIF(p.full_name, ''), u.email, auth.uid()::text)
  INTO actor
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = auth.uid();

  INSERT INTO public.audit_log (salon_id, user_id, actor_name, action, entity, entity_id, before, after)
  VALUES (target_salon, auth.uid(), actor, lower(TG_OP), TG_TABLE_NAME, target_id, row_before, row_after);

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.log_platform_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_platform_change() TO service_role;