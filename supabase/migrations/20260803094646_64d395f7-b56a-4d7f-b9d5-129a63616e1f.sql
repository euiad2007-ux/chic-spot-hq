-- Secure peer-to-peer wallet transfer
CREATE OR REPLACE FUNCTION public.wallet_transfer(_to_wallet text, _amount numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _from public.customers; _to public.customers;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'المبلغ غير صحيح'; END IF;

  SELECT * INTO _from FROM public.customers WHERE user_id = _uid LIMIT 1;
  IF _from.id IS NULL THEN RAISE EXCEPTION 'لا يوجد ملف عميل'; END IF;
  IF COALESCE(_from.wallet_balance, 0) < _amount THEN RAISE EXCEPTION 'رصيد المحفظة غير كافٍ'; END IF;

  SELECT * INTO _to FROM public.customers WHERE upper(wallet_id) = upper(trim(_to_wallet)) LIMIT 1;
  IF _to.id IS NULL THEN RAISE EXCEPTION 'رقم المحفظة غير موجود'; END IF;
  IF _to.id = _from.id THEN RAISE EXCEPTION 'لا يمكن التحويل لنفس المحفظة'; END IF;

  INSERT INTO public.wallet_transactions (salon_id, customer_id, counterparty_id, amount, kind, reason)
  VALUES (_from.salon_id, _from.id, _to.id, -_amount, 'transfer_out',
          COALESCE(_note, 'تحويل إلى ' || _to.wallet_id));
  INSERT INTO public.wallet_transactions (salon_id, customer_id, counterparty_id, amount, kind, reason)
  VALUES (_to.salon_id, _to.id, _from.id, _amount, 'transfer_in',
          COALESCE(_note, 'تحويل من ' || _from.wallet_id));

  RETURN jsonb_build_object('to_customer', _to.id, 'amount', _amount);
END; $$;

GRANT EXECUTE ON FUNCTION public.wallet_transfer(text, numeric, text) TO authenticated;

-- Top-up requests: the customer asks, the salon approves; no self-crediting
CREATE TABLE IF NOT EXISTS public.wallet_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'card',
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

GRANT SELECT, INSERT ON public.wallet_topup_requests TO authenticated;
GRANT UPDATE ON public.wallet_topup_requests TO authenticated;
GRANT ALL ON public.wallet_topup_requests TO service_role;

ALTER TABLE public.wallet_topup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topup read" ON public.wallet_topup_requests
  FOR SELECT TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id)
         OR customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid()));

CREATE POLICY "customer requests topup" ON public.wallet_topup_requests
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending'
    AND customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid()));

CREATE POLICY "staff manages topup" ON public.wallet_topup_requests
  FOR UPDATE TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE OR REPLACE FUNCTION public.approve_wallet_topup(_request uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); r public.wallet_topup_requests;
BEGIN
  SELECT * INTO r FROM public.wallet_topup_requests WHERE id = _request FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, r.salon_id) THEN
    RAISE EXCEPTION 'لا تملك صلاحية اعتماد الشحن';
  END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'الطلب تم معالجته مسبقًا'; END IF;

  INSERT INTO public.wallet_transactions (salon_id, customer_id, amount, kind, reason)
  VALUES (r.salon_id, r.customer_id, r.amount, 'topup',
          COALESCE(r.note, 'شحن رصيد معتمد (' || r.method || ')'));

  UPDATE public.wallet_topup_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = _uid
  WHERE id = _request;

  RETURN jsonb_build_object('ok', true, 'amount', r.amount);
END; $$;

GRANT EXECUTE ON FUNCTION public.approve_wallet_topup(uuid) TO authenticated;