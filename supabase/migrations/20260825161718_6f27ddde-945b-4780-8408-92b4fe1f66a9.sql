-- إلغاء الحجوزات المعلّقة التي انتهت مهلة دفعها
CREATE OR REPLACE FUNCTION public.cancel_expired_holds(_salon uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _n integer;
BEGIN
  IF _uid IS NULL OR NOT public.is_salon_member(_uid, _salon) THEN
    IF _uid IS NULL OR NOT public.is_salon_customer(_uid, _salon) THEN
      RAISE EXCEPTION 'لا تملك صلاحية على هذا المشغل';
    END IF;
  END IF;

  WITH upd AS (
    UPDATE public.bookings b
    SET status = 'cancelled', pay_status = 'void', updated_at = now(),
        notes = COALESCE(b.notes || ' · ', '') || 'إلغاء تلقائي (انتهت مهلة الدفع)'
    WHERE b.salon_id = _salon
      AND b.payment_method = 'hold'
      AND b.hold_expires_at IS NOT NULL
      AND b.hold_expires_at < now()
      AND b.status NOT IN ('cancelled', 'completed', 'no_show')
    RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END; $$;

REVOKE EXECUTE ON FUNCTION public.cancel_expired_holds(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_expired_holds(uuid) TO authenticated;

-- استبدال نقاط الولاء إلى رصيد محفظة (عبر حركات مسجّلة)
CREATE OR REPLACE FUNCTION public.redeem_loyalty(_customer uuid, _points numeric, _rate numeric DEFAULT 1)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  c public.customers;
  _pts numeric;
  _value numeric;
  _rate_safe numeric := GREATEST(COALESCE(_rate, 1), 0);
BEGIN
  SELECT * INTO c FROM public.customers WHERE id = _customer FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'العميل غير موجود'; END IF;
  IF _uid IS NULL OR (c.user_id IS DISTINCT FROM _uid AND NOT public.can_manage_salon(_uid, c.salon_id)) THEN
    RAISE EXCEPTION 'لا تملك صلاحية الاستبدال';
  END IF;

  _pts := LEAST(GREATEST(COALESCE(_points, 0), 0), COALESCE(c.loyalty_points, 0));
  IF _pts <= 0 THEN RAISE EXCEPTION 'لا توجد نقاط كافية للاستبدال'; END IF;
  _value := ROUND(_pts * _rate_safe, 2);

  INSERT INTO public.loyalty_transactions (salon_id, customer_id, points, reason, created_by)
  VALUES (c.salon_id, c.id, -_pts, 'استبدال ' || _pts || ' نقطة', _uid);

  IF _value > 0 THEN
    INSERT INTO public.wallet_transactions (salon_id, customer_id, amount, kind, reason, created_by)
    VALUES (c.salon_id, c.id, _value, 'topup', 'استبدال نقاط ولاء', _uid);
  END IF;

  RETURN _value;
END; $$;

REVOKE EXECUTE ON FUNCTION public.redeem_loyalty(uuid, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty(uuid, numeric, numeric) TO authenticated;

-- إتمام حجز: فاتورة + دفع + مخزون + محفظة + ولاء + إحالة، في معاملة واحدة
CREATE OR REPLACE FUNCTION public.checkout_booking(
  _booking uuid,
  _method text DEFAULT 'cash',
  _wallet_used numeric DEFAULT 0,
  _coupon text DEFAULT NULL,
  _loyalty_rate numeric DEFAULT 0,
  _referral_pct numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  b public.bookings;
  cust public.customers;
  _is_manager boolean;
  _subtotal numeric := 0;
  _discount numeric := 0;
  _coupon_row public.coupons;
  _coupon_discount numeric := 0;
  _used integer;
  _vat_pct numeric := 0;
  _vat numeric; _total numeric; _taxable numeric;
  _seq bigint; _number text; _invoice uuid;
  _wallet numeric; _balance numeric;
  _points numeric := 0;
  _referrer public.customers;
  _ref_amount numeric := 0;
  m record;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'الحجز غير موجود'; END IF;

  _is_manager := _uid IS NOT NULL AND public.can_manage_salon(_uid, b.salon_id);
  IF b.customer_id IS NOT NULL THEN
    SELECT * INTO cust FROM public.customers WHERE id = b.customer_id FOR UPDATE;
  END IF;
  IF NOT _is_manager AND (cust.id IS NULL OR cust.user_id IS DISTINCT FROM _uid) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إتمام هذا الحجز';
  END IF;

  IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = _booking AND status <> 'void') THEN
    RAISE EXCEPTION 'تم إصدار فاتورة لهذا الحجز مسبقًا';
  END IF;
  IF b.status IN ('cancelled', 'no_show') THEN
    RAISE EXCEPTION 'لا يمكن إتمام حجز ملغى';
  END IF;

  -- الأسعار تُقرأ من قاعدة البيانات لا من المتصفح
  SELECT COALESCE(SUM(COALESCE(s.price, bs.price)), 0) INTO _subtotal
  FROM public.booking_services bs
  LEFT JOIN public.services s ON s.id = bs.service_id AND s.salon_id = b.salon_id
  WHERE bs.booking_id = _booking;

  IF _subtotal <= 0 THEN _subtotal := COALESCE(b.price, 0); END IF;
  IF _subtotal <= 0 THEN RAISE EXCEPTION 'لا يمكن إصدار فاتورة بقيمة صفر'; END IF;

  -- الخصم اليدوي يقبل من الإدارة فقط
  IF _is_manager THEN
    _discount := LEAST(GREATEST(COALESCE(b.discount, 0), 0), _subtotal);
  END IF;

  -- الكوبون
  IF COALESCE(NULLIF(trim(COALESCE(_coupon, '')), ''), NULLIF(b.coupon_code, '')) IS NOT NULL THEN
    SELECT * INTO _coupon_row FROM public.coupons
    WHERE salon_id = b.salon_id
      AND upper(code) = upper(COALESCE(NULLIF(trim(COALESCE(_coupon, '')), ''), b.coupon_code))
    FOR UPDATE;

    IF _coupon_row.id IS NULL OR NOT _coupon_row.active THEN
      RAISE EXCEPTION 'الكوبون غير صالح';
    END IF;
    IF _coupon_row.starts_at IS NOT NULL AND _coupon_row.starts_at > now() THEN
      RAISE EXCEPTION 'الكوبون لم يبدأ بعد';
    END IF;
    IF _coupon_row.ends_at IS NOT NULL AND _coupon_row.ends_at < now() THEN
      RAISE EXCEPTION 'انتهت صلاحية الكوبون';
    END IF;
    IF (_subtotal - _discount) < COALESCE(_coupon_row.min_total, 0) THEN
      RAISE EXCEPTION 'قيمة الفاتورة أقل من الحد الأدنى للكوبون';
    END IF;
    SELECT count(*) INTO _used FROM public.coupon_redemptions WHERE coupon_id = _coupon_row.id;
    IF _coupon_row.max_uses IS NOT NULL AND _used >= _coupon_row.max_uses THEN
      RAISE EXCEPTION 'تم استنفاد عدد استخدامات الكوبون';
    END IF;

    _coupon_discount := CASE
      WHEN _coupon_row.kind = 'percent' THEN ROUND((_subtotal - _discount) * _coupon_row.value / 100.0, 2)
      ELSE _coupon_row.value END;
    _coupon_discount := LEAST(GREATEST(_coupon_discount, 0), _subtotal - _discount);
  END IF;

  _taxable := ROUND(_subtotal - _discount - _coupon_discount, 2);
  SELECT COALESCE(vat_pct, 0) INTO _vat_pct FROM public.salons WHERE id = b.salon_id;
  _vat := ROUND(_taxable * COALESCE(_vat_pct, 0) / 100.0, 2);
  _total := ROUND(_taxable + _vat, 2);

  -- التحقق من المخزون قبل أي كتابة
  FOR m IN
    SELECT sm.item_id, SUM(sm.qty) AS need, MAX(i.name) AS name, MAX(i.stock) AS stock
    FROM public.booking_services bs
    JOIN public.service_materials sm ON sm.service_id = bs.service_id AND sm.salon_id = b.salon_id
    JOIN public.inventory_items i ON i.id = sm.item_id AND i.salon_id = b.salon_id
    WHERE bs.booking_id = _booking
    GROUP BY sm.item_id
  LOOP
    IF COALESCE(b.stock_deducted, false) = false AND m.stock < m.need THEN
      RAISE EXCEPTION 'المخزون غير كافٍ للمادة: % (المتوفر %)', m.name, m.stock;
    END IF;
  END LOOP;

  -- المحفظة
  _wallet := GREATEST(COALESCE(_wallet_used, 0), 0);
  IF _wallet > 0 THEN
    IF cust.id IS NULL THEN RAISE EXCEPTION 'لا يمكن الدفع من المحفظة بدون عميل'; END IF;
    SELECT COALESCE(SUM(amount), 0) INTO _balance
    FROM public.wallet_transactions WHERE customer_id = cust.id;
    _wallet := LEAST(_wallet, _total, _balance);
    IF _wallet <= 0 THEN RAISE EXCEPTION 'رصيد المحفظة غير كافٍ'; END IF;
  END IF;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO _seq FROM public.invoices WHERE salon_id = b.salon_id;
  _number := 'INV-' || lpad(_seq::text, 6, '0');

  INSERT INTO public.invoices (salon_id, branch_id, seq, number, booking_id, customer_id,
                               subtotal, discount, vat, total, paid, status, payment_method,
                               created_by, source)
  VALUES (b.salon_id, b.branch_id, _seq, _number, _booking, b.customer_id,
          _subtotal, ROUND(_discount + _coupon_discount, 2), _vat, _total, _total,
          'paid'::public.pay_status, _method, _uid, 'booking')
  RETURNING id INTO _invoice;

  INSERT INTO public.invoice_items (salon_id, invoice_id, kind, ref_id, name, qty, unit_price, total)
  SELECT b.salon_id, _invoice, 'service', bs.service_id,
         COALESCE(s.name, 'خدمة'), 1, COALESCE(s.price, bs.price), COALESCE(s.price, bs.price)
  FROM public.booking_services bs
  LEFT JOIN public.services s ON s.id = bs.service_id
  WHERE bs.booking_id = _booking;

  IF _wallet > 0 THEN
    INSERT INTO public.wallet_transactions (salon_id, customer_id, amount, kind, reason, invoice_id, created_by)
    VALUES (b.salon_id, cust.id, -_wallet, 'spend', 'دفع فاتورة ' || _number, _invoice, _uid);
    INSERT INTO public.invoice_payments (salon_id, invoice_id, amount, method, is_refund, created_by)
    VALUES (b.salon_id, _invoice, _wallet, 'wallet', false, _uid);
  END IF;
  IF _total - _wallet > 0 THEN
    INSERT INTO public.invoice_payments (salon_id, invoice_id, amount, method, is_refund, created_by)
    VALUES (b.salon_id, _invoice, ROUND(_total - _wallet, 2), _method, false, _uid);
  END IF;

  IF _coupon_row.id IS NOT NULL AND _coupon_discount > 0 THEN
    INSERT INTO public.coupon_redemptions (salon_id, coupon_id, customer_id, invoice_id, amount)
    VALUES (b.salon_id, _coupon_row.id, b.customer_id, _invoice, _coupon_discount);
  END IF;

  -- خصم المواد من المخزون مرة واحدة فقط
  IF COALESCE(b.stock_deducted, false) = false THEN
    INSERT INTO public.stock_movements (salon_id, item_id, qty, kind, reason, booking_id, created_by)
    SELECT b.salon_id, sm.item_id, -SUM(sm.qty), 'consume'::public.stock_move_type,
           'استهلاك خدمات الحجز ' || COALESCE(b.code, ''), b.id, _uid
    FROM public.booking_services bs
    JOIN public.service_materials sm ON sm.service_id = bs.service_id AND sm.salon_id = b.salon_id
    WHERE bs.booking_id = _booking
    GROUP BY sm.item_id;
  END IF;

  -- نقاط الولاء وعمولة الإحالة
  _points := ROUND(_total * GREATEST(COALESCE(_loyalty_rate, 0), 0), 2);
  IF cust.id IS NOT NULL AND _points > 0 THEN
    INSERT INTO public.loyalty_transactions (salon_id, customer_id, points, reason, invoice_id, created_by)
    VALUES (b.salon_id, cust.id, _points, 'فاتورة ' || _number, _invoice, _uid);
  END IF;

  IF cust.id IS NOT NULL AND COALESCE(cust.referred_by, '') <> '' AND COALESCE(_referral_pct, 0) > 0 THEN
    SELECT * INTO _referrer FROM public.customers
    WHERE salon_id = b.salon_id AND referral_code = cust.referred_by AND id <> cust.id
    LIMIT 1;
    IF _referrer.id IS NOT NULL THEN
      _ref_amount := ROUND(_total * _referral_pct / 100.0, 2);
      IF _ref_amount > 0 THEN
        INSERT INTO public.wallet_transactions (salon_id, customer_id, amount, kind, reason, invoice_id, counterparty_id, created_by)
        VALUES (b.salon_id, _referrer.id, _ref_amount, 'referral',
                'عمولة إحالة (فاتورة ' || _number || ')', _invoice, cust.id, _uid);
      END IF;
    END IF;
  END IF;

  UPDATE public.bookings SET
    status = 'completed', pay_status = 'paid', stock_deducted = true,
    payment_method = _method, wallet_used = _wallet,
    coupon_code = COALESCE(_coupon_row.code, coupon_code),
    coupon_discount = _coupon_discount,
    hold_expires_at = NULL, updated_at = now()
  WHERE id = _booking;

  IF cust.id IS NOT NULL THEN
    UPDATE public.customers
    SET visits = COALESCE(visits, 0) + 1,
        total_spent = ROUND(COALESCE(total_spent, 0) + _total, 2),
        updated_at = now()
    WHERE id = cust.id;
  END IF;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (b.salon_id, _uid, 'booking_checkout', 'invoice', _invoice,
          jsonb_build_object('number', _number, 'total', _total, 'method', _method,
                             'wallet_used', _wallet, 'coupon', _coupon_row.code,
                             'coupon_discount', _coupon_discount, 'points', _points,
                             'referral', _ref_amount));

  RETURN jsonb_build_object('invoice_id', _invoice, 'number', _number, 'subtotal', _subtotal,
                            'discount', ROUND(_discount + _coupon_discount, 2), 'vat', _vat,
                            'total', _total, 'wallet_used', _wallet, 'points', _points);
END; $$;

REVOKE EXECUTE ON FUNCTION public.checkout_booking(uuid, text, numeric, text, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.checkout_booking(uuid, text, numeric, text, numeric, numeric) TO authenticated;