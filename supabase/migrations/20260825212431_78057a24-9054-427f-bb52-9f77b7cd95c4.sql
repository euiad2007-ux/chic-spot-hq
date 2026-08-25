CREATE OR REPLACE FUNCTION public.create_staff_invite(
  _salon uuid, _name text, _email text, _branch uuid DEFAULT NULL,
  _job_title text DEFAULT NULL, _staff uuid DEFAULT NULL
) RETURNS public.staff_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.staff_invites;
  _code text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  _code := upper(encode(extensions.gen_random_bytes(6), 'hex'));

  INSERT INTO public.staff_invites (salon_id, branch_id, staff_id, email, name, job_title, code, created_by)
  VALUES (_salon, _branch, _staff, lower(trim(_email)), trim(_name), _job_title, _code, _uid)
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_staff_invite(uuid, text, text, uuid, text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_staff_invite(uuid, text, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_invite(uuid, text, text, uuid, text, uuid) TO service_role;