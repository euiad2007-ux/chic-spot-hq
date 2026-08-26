CREATE OR REPLACE FUNCTION public.request_join_salon(
  _salon uuid, _kind text, _name text DEFAULT NULL,
  _phone text DEFAULT NULL, _job_title text DEFAULT NULL, _note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _email text; _cid uuid; _existing uuid; _pending uuid;
  _final_name text; _salon_name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF _kind NOT IN ('staff','client') THEN RAISE EXCEPTION 'نوع الطلب غير صحيح'; END IF;
  SELECT name INTO _salon_name FROM public.salons WHERE id = _salon AND is_suspended = false;
  IF _salon_name IS NULL THEN RAISE EXCEPTION 'المشغل غير متاح'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  SELECT COALESCE(NULLIF(trim(COALESCE(_name, '')), ''), NULLIF(p.full_name, ''), split_part(COALESCE(_email,''), '@', 1))
    INTO _final_name FROM public.profiles p WHERE p.id = _uid;
  _final_name := COALESCE(NULLIF(trim(COALESCE(_name, '')), ''), _final_name, 'مستخدم');

  IF _kind = 'client' THEN
    SELECT id INTO _existing FROM public.customers WHERE user_id = _uid AND salon_id = _salon LIMIT 1;
    _cid := public.ensure_client_profile(_salon);
    IF _existing IS NULL AND _cid IS NOT NULL THEN
      INSERT INTO public.notification_events (salon_id, customer_id, kind, channel, recipient, title, body, status, meta)
      VALUES (_salon, _cid, 'client_signup', 'inapp', _email,
              'تسجيل عميلة جديدة',
              _final_name || ' سجّلت حسابًا جديدًا في ' || _salon_name,
              'pending', jsonb_build_object('user_id', _uid));
    END IF;
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