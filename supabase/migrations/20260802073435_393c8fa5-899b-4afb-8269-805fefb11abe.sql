-- 1) Products for sale live in inventory
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_for_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sku text;

-- 2) Cash register shifts
CREATE TABLE IF NOT EXISTS public.cash_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  opened_by uuid,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_float numeric NOT NULL DEFAULT 0,
  closed_by uuid,
  closed_at timestamptz,
  counted_cash numeric,
  expected_cash numeric,
  difference numeric,
  cash_sales numeric NOT NULL DEFAULT 0,
  card_sales numeric NOT NULL DEFAULT 0,
  cash_expenses numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_shifts TO authenticated;
GRANT ALL ON public.cash_shifts TO service_role;
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift read" ON public.cash_shifts FOR SELECT TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "shift manage" ON public.cash_shifts FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- 3) Invoice line items (services + products)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref_id uuid,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice items read" ON public.invoice_items FOR SELECT TO authenticated
  USING (
    public.is_salon_member(auth.uid(), salon_id)
    OR invoice_id IN (SELECT i.id FROM public.invoices i JOIN public.customers c ON c.id = i.customer_id WHERE c.user_id = auth.uid())
  );
CREATE POLICY "invoice items manage" ON public.invoice_items FOR ALL TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id))
  WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

-- 4) Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES public.cash_shifts(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other',
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  spent_on date NOT NULL DEFAULT current_date,
  vendor text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense read" ON public.expenses FOR SELECT TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "expense manage" ON public.expenses FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- 5) Link invoices/payments to a shift and record the sale source
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.cash_shifts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'booking';
ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

CREATE TRIGGER cash_shifts_updated_at BEFORE UPDATE ON public.cash_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Open a shift
CREATE OR REPLACE FUNCTION public.open_shift(_salon uuid, _branch uuid, _opening_float numeric DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية فتح الوردية';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cash_shifts s
             WHERE s.salon_id = _salon AND s.status = 'open'
               AND (s.branch_id IS NOT DISTINCT FROM _branch)) THEN
    RAISE EXCEPTION 'هناك وردية مفتوحة بالفعل لهذا الفرع';
  END IF;
  INSERT INTO public.cash_shifts (salon_id, branch_id, opened_by, opening_float)
  VALUES (_salon, _branch, _uid, COALESCE(_opening_float, 0))
  RETURNING id INTO _id;
  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'open_shift', 'cash_shift', _id,
          jsonb_build_object('opening_float', COALESCE(_opening_float,0), 'branch_id', _branch));
  RETURN _id;
END; $$;

-- 7) Close a shift: compute expected cash and the difference
CREATE OR REPLACE FUNCTION public.close_shift(_shift uuid, _counted numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  s public.cash_shifts;
  _cash numeric; _card numeric; _exp numeric; _expected numeric; _diff numeric;
BEGIN
  SELECT * INTO s FROM public.cash_shifts WHERE id = _shift;
  IF s.id IS NULL THEN RAISE EXCEPTION 'الوردية غير موجودة'; END IF;
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, s.salon_id) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إغلاق الوردية';
  END IF;
  IF s.status <> 'open' THEN RAISE EXCEPTION 'الوردية مغلقة مسبقًا'; END IF;

  SELECT COALESCE(SUM(CASE WHEN p.method = 'cash' AND NOT p.is_refund THEN p.amount
                           WHEN p.method = 'cash' AND p.is_refund THEN -p.amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN p.method <> 'cash' AND NOT p.is_refund THEN p.amount
                           WHEN p.method <> 'cash' AND p.is_refund THEN -p.amount ELSE 0 END), 0)
    INTO _cash, _card
  FROM public.invoice_payments p WHERE p.shift_id = _shift;

  SELECT COALESCE(SUM(amount), 0) INTO _exp
  FROM public.expenses WHERE shift_id = _shift AND method = 'cash';

  _expected := COALESCE(s.opening_float,0) + _cash - _exp;
  _diff := COALESCE(_counted, 0) - _expected;

  UPDATE public.cash_shifts SET
    status = 'closed', closed_at = now(), closed_by = _uid,
    counted_cash = COALESCE(_counted, 0), expected_cash = _expected, difference = _diff,
    cash_sales = _cash, card_sales = _card, cash_expenses = _exp,
    note = COALESCE(_note, note), updated_at = now()
  WHERE id = _shift;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (s.salon_id, _uid, 'close_shift', 'cash_shift', _shift,
          jsonb_build_object('expected', _expected, 'counted', COALESCE(_counted,0), 'difference', _diff,
                             'cash_sales', _cash, 'card_sales', _card, 'cash_expenses', _exp));

  RETURN jsonb_build_object('expected_cash', _expected, 'counted_cash', COALESCE(_counted,0),
                            'difference', _diff, 'cash_sales', _cash, 'card_sales', _card,
                            'cash_expenses', _exp);
END; $$;

-- 8) Point of sale checkout: validates stock, deducts it, issues a paid invoice
CREATE OR REPLACE FUNCTION public.pos_checkout(
  _salon uuid,
  _branch uuid,
  _customer uuid,
  _items jsonb,
  _method text DEFAULT 'cash',
  _discount numeric DEFAULT 0,
  _shift uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  it jsonb;
  _subtotal numeric := 0;
  _vat_pct numeric := 0;
  _discount_safe numeric := GREATEST(COALESCE(_discount, 0), 0);
  _vat numeric; _total numeric; _seq bigint; _invoice uuid; _number text;
  _stock numeric; _name text; _qty numeric; _price numeric; _kind text; _ref uuid;
BEGIN
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إتمام البيع';
  END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'لا توجد أصناف في السلة';
  END IF;

  -- validate stock first: nothing is written when any product is short
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _kind := COALESCE(it->>'kind', 'product');
    _qty := COALESCE((it->>'qty')::numeric, 0);
    IF _qty <= 0 THEN RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر'; END IF;
    IF _kind = 'product' THEN
      SELECT stock, name INTO _stock, _name FROM public.inventory_items
      WHERE id = (it->>'id')::uuid AND salon_id = _salon;
      IF _name IS NULL THEN RAISE EXCEPTION 'المنتج غير موجود'; END IF;
      IF _stock < _qty THEN
        RAISE EXCEPTION 'المخزون غير كافٍ للمنتج: % (المتوفر %)', _name, _stock;
      END IF;
    END IF;
    _subtotal := _subtotal + _qty * COALESCE((it->>'unit_price')::numeric, 0);
  END LOOP;

  IF _discount_safe > _subtotal THEN _discount_safe := _subtotal; END IF;
  SELECT COALESCE(vat_pct, 0) INTO _vat_pct FROM public.salons WHERE id = _salon;
  _vat := ROUND((_subtotal - _discount_safe) * _vat_pct / 100.0, 2);
  _total := ROUND(_subtotal - _discount_safe + _vat, 2);

  SELECT COALESCE(MAX(seq), 0) + 1 INTO _seq FROM public.invoices WHERE salon_id = _salon;
  _number := 'INV-' || lpad(_seq::text, 6, '0');

  INSERT INTO public.invoices (salon_id, branch_id, seq, number, customer_id, subtotal, discount,
                               vat, total, paid, status, payment_method, created_by, shift_id, source)
  VALUES (_salon, _branch, _seq, _number, _customer, _subtotal, _discount_safe, _vat, _total, _total,
          'paid'::public.pay_status, _method, _uid, _shift, 'pos')
  RETURNING id INTO _invoice;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _kind := COALESCE(it->>'kind', 'product');
    _qty := COALESCE((it->>'qty')::numeric, 0);
    _price := COALESCE((it->>'unit_price')::numeric, 0);
    _ref := NULLIF(it->>'id', '')::uuid;
    _name := COALESCE(it->>'name', 'صنف');
    INSERT INTO public.invoice_items (salon_id, invoice_id, kind, ref_id, name, qty, unit_price, total)
    VALUES (_salon, _invoice, _kind, _ref, _name, _qty, _price, ROUND(_qty * _price, 2));

    IF _kind = 'product' THEN
      UPDATE public.inventory_items SET stock = stock - _qty, updated_at = now()
      WHERE id = _ref AND salon_id = _salon;
      INSERT INTO public.stock_movements (salon_id, item_id, qty, kind, reason, created_by)
      VALUES (_salon, _ref, -_qty, 'consume'::public.stock_move_type, 'بيع عبر نقطة البيع ' || _number, _uid);
    END IF;
  END LOOP;

  INSERT INTO public.invoice_payments (salon_id, invoice_id, amount, method, is_refund, created_by, shift_id)
  VALUES (_salon, _invoice, _total, _method, false, _uid, _shift);

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'pos_sale', 'invoice', _invoice,
          jsonb_build_object('number', _number, 'total', _total, 'method', _method,
                             'items', _items, 'shift_id', _shift, 'branch_id', _branch));

  RETURN jsonb_build_object('invoice_id', _invoice, 'number', _number, 'subtotal', _subtotal,
                            'discount', _discount_safe, 'vat', _vat, 'total', _total);
END; $$;

REVOKE ALL ON FUNCTION public.open_shift(uuid, uuid, numeric) FROM public, anon;
REVOKE ALL ON FUNCTION public.close_shift(uuid, numeric, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.pos_checkout(uuid, uuid, uuid, jsonb, text, numeric, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.open_shift(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_shift(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_checkout(uuid, uuid, uuid, jsonb, text, numeric, uuid) TO authenticated;