DROP TABLE IF EXISTS public.app_state;

CREATE OR REPLACE FUNCTION public.is_salon_customer(_uid uuid, _salon uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = _uid AND c.salon_id = _salon);
$$;
REVOKE ALL ON FUNCTION public.is_salon_customer(uuid, uuid) FROM public;

CREATE POLICY "customer services read" ON public.services FOR SELECT TO authenticated
  USING (active AND public.is_salon_customer(auth.uid(), salon_id));
CREATE POLICY "customer staff read" ON public.staff FOR SELECT TO authenticated
  USING (active AND public.is_salon_customer(auth.uid(), salon_id));
CREATE POLICY "customer service staff read" ON public.service_staff FOR SELECT TO authenticated
  USING (public.is_salon_customer(auth.uid(), salon_id));
CREATE POLICY "customer coupon read" ON public.coupons FOR SELECT TO authenticated
  USING (active AND public.is_salon_customer(auth.uid(), salon_id));

CREATE POLICY "customer invoice insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "customer payment insert" ON public.invoice_payments FOR INSERT TO authenticated
  WITH CHECK (invoice_id IN (
    SELECT i.id FROM public.invoices i JOIN public.customers c ON c.id = i.customer_id
    WHERE c.user_id = auth.uid()));
CREATE POLICY "customer wallet insert" ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
           OR counterparty_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "customer loyalty insert" ON public.loyalty_transactions FOR INSERT TO authenticated
  WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_customer_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage_salon(auth.uid(), OLD.salon_id) THEN
    RETURN NEW;
  END IF;
  NEW.salon_id := OLD.salon_id;
  NEW.user_id := OLD.user_id;
  NEW.wallet_balance := OLD.wallet_balance;
  NEW.loyalty_points := OLD.loyalty_points;
  NEW.visits := OLD.visits;
  NEW.total_spent := OLD.total_spent;
  NEW.referral_code := OLD.referral_code;
  NEW.wallet_id := OLD.wallet_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_customer_self_update ON public.customers;
CREATE TRIGGER guard_customer_self_update
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_self_update();

CREATE OR REPLACE FUNCTION public.ensure_client_profile()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _cid uuid; _salon uuid; _name text; _phone text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO _cid FROM public.customers WHERE user_id = _uid LIMIT 1;
  IF _cid IS NOT NULL THEN RETURN _cid; END IF;
  IF EXISTS (SELECT 1 FROM public.salon_members WHERE user_id = _uid) THEN RETURN NULL; END IF;
  SELECT id INTO _salon FROM public.salons WHERE is_suspended = false ORDER BY created_at LIMIT 1;
  IF _salon IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(p.full_name, 'عميل'), COALESCE(p.phone, '') INTO _name, _phone
    FROM public.profiles p WHERE p.id = _uid;
  INSERT INTO public.customers (salon_id, user_id, name, phone)
  VALUES (_salon, _uid, COALESCE(NULLIF(_name,''), 'عميل'), COALESCE(NULLIF(_phone,''), ''))
  RETURNING id INTO _cid;
  RETURN _cid;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_client_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_client_profile() TO authenticated;