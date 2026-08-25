-- 1) One salon per owner
CREATE OR REPLACE FUNCTION public.create_salon(_name text, _slug text, _phone text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE new_id uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF EXISTS (SELECT 1 FROM public.salons WHERE owner_id = uid)
     OR EXISTS (SELECT 1 FROM public.salon_members WHERE user_id = uid AND role = 'salon_owner') THEN
    RAISE EXCEPTION 'لديك مشغل بالفعل — لا يمكن إنشاء مشغل جديد بنفس الحساب';
  END IF;
  INSERT INTO public.salons (name, slug, phone, owner_id, trial_ends_at)
  VALUES (_name, lower(_slug), _phone, uid, now() + interval '30 days')
  RETURNING id INTO new_id;
  INSERT INTO public.branches (salon_id, name) VALUES (new_id, 'الفرع الرئيسي');
  INSERT INTO public.salon_members (user_id, salon_id, role) VALUES (uid, new_id, 'salon_owner');
  INSERT INTO public.salon_settings (salon_id) VALUES (new_id);
  PERFORM public.seed_chart_accounts(new_id);
  RETURN new_id;
END; $function$;

-- 2) Client profile is per-salon; a person may be a client at several salons
CREATE OR REPLACE FUNCTION public.ensure_client_profile(_salon uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _cid uuid; _target uuid := _salon; _name text; _phone text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _target IS NULL THEN
    SELECT salon_id INTO _target FROM public.customers WHERE user_id = _uid ORDER BY created_at LIMIT 1;
  END IF;
  IF _target IS NULL THEN
    SELECT id INTO _target FROM public.salons WHERE is_suspended = false ORDER BY created_at LIMIT 1;
  END IF;
  IF _target IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO _cid FROM public.customers WHERE user_id = _uid AND salon_id = _target LIMIT 1;
  IF _cid IS NOT NULL THEN RETURN _cid; END IF;

  SELECT COALESCE(p.full_name, 'عميل'), COALESCE(p.phone, '') INTO _name, _phone
    FROM public.profiles p WHERE p.id = _uid;
  INSERT INTO public.customers (salon_id, user_id, name, phone)
  VALUES (_target, _uid, COALESCE(NULLIF(_name,''), 'عميل'), COALESCE(NULLIF(_phone,''), ''))
  RETURNING id INTO _cid;
  RETURN _cid;
END; $function$;

-- 3) Staff invitations
CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  job_title text,
  role app_role NOT NULL DEFAULT 'staff',
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_by uuid,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invites TO authenticated;
GRANT ALL ON public.staff_invites TO service_role;

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage salon invites" ON public.staff_invites
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER update_staff_invites_updated_at
  BEFORE UPDATE ON public.staff_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX staff_invites_salon_idx ON public.staff_invites (salon_id, status);

-- create an invite (manager only)
CREATE OR REPLACE FUNCTION public.create_staff_invite(
  _salon uuid, _name text, _email text, _branch uuid DEFAULT NULL,
  _job_title text DEFAULT NULL, _staff uuid DEFAULT NULL
) RETURNS public.staff_invites LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _row public.staff_invites; _code text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.can_manage_salon(_uid, _salon) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  _code := upper(replace(encode(gen_random_bytes(6), 'hex'), '-', ''));
  INSERT INTO public.staff_invites (salon_id, branch_id, staff_id, email, name, job_title, code, created_by)
  VALUES (_salon, _branch, _staff, lower(trim(_email)), trim(_name), _job_title, _code, _uid)
  RETURNING * INTO _row;
  RETURN _row;
END; $function$;

-- accept an invite: links the signed-in user to that salon's staff record only
CREATE OR REPLACE FUNCTION public.accept_staff_invite(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _inv public.staff_invites; _staff uuid; _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  SELECT * INTO _inv FROM public.staff_invites WHERE code = upper(trim(_code));
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'رمز الدعوة غير صحيح'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'الدعوة مستخدمة أو ملغاة'; END IF;
  IF _inv.expires_at < now() THEN RAISE EXCEPTION 'انتهت صلاحية الدعوة'; END IF;
  IF lower(_inv.email) <> lower(COALESCE(_email, '')) THEN
    RAISE EXCEPTION 'هذه الدعوة مُرسلة لبريد إلكتروني آخر';
  END IF;

  _staff := _inv.staff_id;
  IF _staff IS NOT NULL THEN
    UPDATE public.staff SET user_id = _uid, updated_at = now()
    WHERE id = _staff AND salon_id = _inv.salon_id;
  ELSE
    SELECT id INTO _staff FROM public.staff
      WHERE salon_id = _inv.salon_id AND lower(COALESCE(email,'')) = lower(_inv.email) LIMIT 1;
    IF _staff IS NULL THEN
      INSERT INTO public.staff (salon_id, branch_id, user_id, name, email, job_title)
      VALUES (_inv.salon_id, _inv.branch_id, _uid, _inv.name, _inv.email, _inv.job_title)
      RETURNING id INTO _staff;
    ELSE
      UPDATE public.staff SET user_id = _uid, branch_id = COALESCE(_inv.branch_id, branch_id), updated_at = now()
      WHERE id = _staff;
    END IF;
  END IF;

  INSERT INTO public.salon_members (user_id, salon_id, branch_id, role)
  VALUES (_uid, _inv.salon_id, _inv.branch_id, _inv.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.staff_invites
    SET status = 'accepted', accepted_by = _uid, accepted_at = now()
  WHERE id = _inv.id;

  RETURN jsonb_build_object('salon_id', _inv.salon_id, 'staff_id', _staff);
END; $function$;