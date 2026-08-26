CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'staff',
  name text NOT NULL,
  email text,
  phone text,
  job_title text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT join_requests_kind_chk CHECK (kind IN ('staff','client')),
  CONSTRAINT join_requests_status_chk CHECK (status IN ('pending','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE ON public.join_requests TO authenticated;
GRANT ALL ON public.join_requests TO service_role;

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants see own requests" ON public.join_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Applicants create own requests" ON public.join_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers read salon requests" ON public.join_requests
  FOR SELECT TO authenticated USING (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "Managers update salon requests" ON public.join_requests
  FOR UPDATE TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE UNIQUE INDEX join_requests_pending_uniq
  ON public.join_requests (salon_id, user_id, kind) WHERE status = 'pending';
CREATE INDEX join_requests_salon_idx ON public.join_requests (salon_id, status, created_at DESC);

CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Self sign-up: clients activate immediately, staff wait for approval.
CREATE OR REPLACE FUNCTION public.request_join_salon(
  _salon uuid, _kind text, _name text DEFAULT NULL,
  _phone text DEFAULT NULL, _job_title text DEFAULT NULL, _note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _email text; _cid uuid; _pending uuid;
  _final_name text; _salon_name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF _kind NOT IN ('staff','client') THEN RAISE EXCEPTION 'نوع الطلب غير صحيح'; END IF;
  SELECT name INTO _salon_name FROM public.salons WHERE id = _salon AND is_suspended = false;
  IF _salon_name IS NULL THEN RAISE EXCEPTION 'المشغل غير متاح'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  SELECT COALESCE(NULLIF(trim(COALESCE(_name, '')), ''), NULLIF(p.full_name, ''), split_part(COALESCE(_email,''), '@', 1))
    INTO _final_name FROM public.profiles p WHERE p.id = _uid;
  _final_name := COALESCE(_final_name, 'مستخدم');

  IF _kind = 'client' THEN
    _cid := public.ensure_client_profile(_salon);
    INSERT INTO public.notification_events (salon_id, customer_id, kind, channel, recipient, title, body, status, meta)
    VALUES (_salon, _cid, 'client_signup', 'inapp', _email,
            'تسجيل عميلة جديدة',
            _final_name || ' سجّلت حسابًا جديدًا في ' || _salon_name,
            'pending', jsonb_build_object('user_id', _uid));
    RETURN jsonb_build_object('status', 'active', 'customer_id', _cid);
  END IF;

  IF EXISTS (SELECT 1 FROM public.salon_members WHERE user_id = _uid AND salon_id = _salon) THEN
    RETURN jsonb_build_object('status', 'member');
  END IF;

  SELECT id INTO _pending FROM public.join_requests
    WHERE salon_id = _salon AND user_id = _uid AND kind = 'staff' AND status = 'pending';
  IF _pending IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'pending', 'request_id', _pending);
  END IF;

  INSERT INTO public.join_requests (salon_id, user_id, kind, name, email, phone, job_title, note)
  VALUES (_salon, _uid, 'staff', _final_name, lower(COALESCE(_email,'')), NULLIF(trim(COALESCE(_phone,'')), ''),
          NULLIF(trim(COALESCE(_job_title,'')), ''), NULLIF(trim(COALESCE(_note,'')), ''))
  RETURNING id INTO _pending;

  INSERT INTO public.notification_events (salon_id, kind, channel, recipient, title, body, status, meta)
  VALUES (_salon, 'staff_join_request', 'inapp', _email,
          'طلب انضمام موظف جديد',
          _final_name || ' يطلب الانضمام كموظف — بانتظار موافقتك',
          'pending', jsonb_build_object('request_id', _pending, 'user_id', _uid));

  RETURN jsonb_build_object('status', 'pending', 'request_id', _pending);
END; $function$;

-- Manager decision on a staff join request.
CREATE OR REPLACE FUNCTION public.review_join_request(
  _request uuid, _approve boolean, _branch uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _req public.join_requests; _staff uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  SELECT * INTO _req FROM public.join_requests WHERE id = _request;
  IF _req.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF NOT public.can_manage_salon(_uid, _req.salon_id) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _req.status <> 'pending' THEN RAISE EXCEPTION 'تمت مراجعة هذا الطلب مسبقًا'; END IF;

  IF NOT _approve THEN
    UPDATE public.join_requests
      SET status = 'rejected', reviewed_by = _uid, reviewed_at = now()
    WHERE id = _req.id;
    INSERT INTO public.notification_events (salon_id, kind, channel, recipient, title, body, status, meta)
    VALUES (_req.salon_id, 'staff_join_rejected', 'inapp', _req.email,
            'تم رفض طلب الانضمام', _req.name || ' — تم رفض الطلب', 'pending',
            jsonb_build_object('request_id', _req.id, 'user_id', _req.user_id));
    RETURN jsonb_build_object('status', 'rejected');
  END IF;

  SELECT id INTO _staff FROM public.staff
    WHERE salon_id = _req.salon_id AND lower(COALESCE(email,'')) = lower(COALESCE(_req.email,'')) LIMIT 1;
  IF _staff IS NULL THEN
    INSERT INTO public.staff (salon_id, branch_id, user_id, name, email, phone, job_title)
    VALUES (_req.salon_id, COALESCE(_branch, _req.branch_id), _req.user_id, _req.name, _req.email, _req.phone, _req.job_title)
    RETURNING id INTO _staff;
  ELSE
    UPDATE public.staff
      SET user_id = _req.user_id,
          branch_id = COALESCE(_branch, _req.branch_id, branch_id),
          active = true,
          updated_at = now()
    WHERE id = _staff;
  END IF;

  INSERT INTO public.salon_members (user_id, salon_id, branch_id, role)
  VALUES (_req.user_id, _req.salon_id, COALESCE(_branch, _req.branch_id), 'staff')
  ON CONFLICT DO NOTHING;

  UPDATE public.join_requests
    SET status = 'approved', reviewed_by = _uid, reviewed_at = now(),
        branch_id = COALESCE(_branch, branch_id)
  WHERE id = _req.id;

  INSERT INTO public.notification_events (salon_id, staff_id, kind, channel, recipient, title, body, status, meta)
  VALUES (_req.salon_id, _staff, 'staff_join_approved', 'inapp', _req.email,
          'تم قبول طلب الانضمام', _req.name || ' أصبح موظفًا في المشغل', 'pending',
          jsonb_build_object('request_id', _req.id, 'user_id', _req.user_id));

  RETURN jsonb_build_object('status', 'approved', 'staff_id', _staff);
END; $function$;

REVOKE ALL ON FUNCTION public.request_join_salon(uuid, text, text, text, text, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.review_join_request(uuid, boolean, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_join_salon(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, boolean, uuid) TO authenticated;