-- ============ inventory settings document ============
ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS inventory jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============ journal entries ============
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  period text NOT NULL,
  source text NOT NULL,
  source_id uuid,
  memo text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_source_uniq
  ON public.journal_entries (salon_id, source, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS journal_entries_salon_period_idx
  ON public.journal_entries (salon_id, period);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_manage" ON public.journal_entries
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER journal_entries_touch
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ journal lines ============
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_lines_entry_idx ON public.journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS journal_lines_salon_idx ON public.journal_lines (salon_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_lines_manage" ON public.journal_lines
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- ============ automatic posting ============
CREATE OR REPLACE FUNCTION public.post_accounting_period(_salon uuid, _from date, _to date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _period text := to_char(_from, 'YYYY-MM');
  _cash_acct text; _cash_name text;
  _inv record; _exp record; _st record;
  _entry uuid;
  _taxable numeric; _vat_rate numeric; _input_vat numeric; _net numeric;
  _inclusive boolean;
  _n_inv integer := 0; _n_exp integer := 0; _n_st integer := 0;
BEGIN
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية الترحيل المحاسبي';
  END IF;
  IF _from IS NULL OR _to IS NULL OR _to < _from THEN
    RAISE EXCEPTION 'الفترة غير صحيحة';
  END IF;

  SELECT COALESCE(vat_rate, 15), COALESCE(expenses_include_vat, true)
    INTO _vat_rate, _inclusive
  FROM public.salons WHERE id = _salon;

  -- Sales invoices
  FOR _inv IN
    SELECT id, number, created_at, subtotal, discount, vat, total, payment_method
    FROM public.invoices
    WHERE salon_id = _salon
      AND created_at::date BETWEEN _from AND _to
  LOOP
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE salon_id = _salon AND source = 'invoice' AND source_id = _inv.id) THEN
      CONTINUE;
    END IF;

    IF COALESCE(_inv.payment_method, 'cash') = 'cash' THEN
      _cash_acct := '1010'; _cash_name := 'الصندوق';
    ELSE
      _cash_acct := '1020'; _cash_name := 'البنك / مدفوعات إلكترونية';
    END IF;

    INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
    VALUES (_salon, _inv.created_at::date, to_char(_inv.created_at, 'YYYY-MM'), 'invoice', _inv.id,
            'فاتورة مبيعات ' || COALESCE(_inv.number, ''), COALESCE(_inv.total, 0), _uid)
    RETURNING id INTO _entry;

    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, _cash_acct, _cash_name, COALESCE(_inv.total, 0), 0);

    IF COALESCE(_inv.discount, 0) > 0 THEN
      INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
      VALUES (_salon, _entry, '4090', 'خصومات المبيعات', _inv.discount, 0);
    END IF;

    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, '4010', 'إيرادات الخدمات والمنتجات', 0, COALESCE(_inv.subtotal, 0));

    IF COALESCE(_inv.vat, 0) <> 0 THEN
      INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
      VALUES (_salon, _entry, '2310', 'ضريبة القيمة المضافة المستحقة', 0, _inv.vat);
    END IF;

    _n_inv := _n_inv + 1;
  END LOOP;

  -- Expenses
  FOR _exp IN
    SELECT id, category, amount, vat_amount, method, spent_on, vendor
    FROM public.expenses
    WHERE salon_id = _salon AND spent_on BETWEEN _from AND _to
  LOOP
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE salon_id = _salon AND source = 'expense' AND source_id = _exp.id) THEN
      CONTINUE;
    END IF;

    _input_vat := COALESCE(_exp.vat_amount, 0);
    IF _input_vat <= 0 AND _inclusive AND _vat_rate > 0 THEN
      _input_vat := ROUND(_exp.amount - (_exp.amount / (1 + _vat_rate / 100.0)), 2);
    END IF;
    _net := ROUND(COALESCE(_exp.amount, 0) - _input_vat, 2);

    IF COALESCE(_exp.method, 'cash') = 'cash' THEN
      _cash_acct := '1010'; _cash_name := 'الصندوق';
    ELSE
      _cash_acct := '1020'; _cash_name := 'البنك / مدفوعات إلكترونية';
    END IF;

    INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
    VALUES (_salon, _exp.spent_on, to_char(_exp.spent_on, 'YYYY-MM'), 'expense', _exp.id,
            'مصروف: ' || COALESCE(_exp.category, '') || COALESCE(' - ' || _exp.vendor, ''),
            COALESCE(_exp.amount, 0), _uid)
    RETURNING id INTO _entry;

    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, '5010', 'مصروفات تشغيلية', _net, 0);

    IF _input_vat > 0 THEN
      INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
      VALUES (_salon, _entry, '1360', 'ضريبة القيمة المضافة القابلة للخصم', _input_vat, 0);
    END IF;

    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, _cash_acct, _cash_name, 0, COALESCE(_exp.amount, 0));

    _n_exp := _n_exp + 1;
  END LOOP;

  -- Applied stocktakes (inventory gain / loss)
  FOR _st IN
    SELECT id, counted_on, diff_value
    FROM public.inventory_stocktakes
    WHERE salon_id = _salon AND status = 'applied'
      AND counted_on BETWEEN _from AND _to
      AND COALESCE(diff_value, 0) <> 0
  LOOP
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE salon_id = _salon AND source = 'stocktake' AND source_id = _st.id) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
    VALUES (_salon, _st.counted_on, to_char(_st.counted_on, 'YYYY-MM'), 'stocktake', _st.id,
            'تسوية جرد المستودع', ABS(_st.diff_value), _uid)
    RETURNING id INTO _entry;

    IF _st.diff_value > 0 THEN
      INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
      VALUES (_salon, _entry, '1140', 'مخزون المواد والمنتجات', _st.diff_value, 0),
             (_salon, _entry, '4900', 'فروق جرد دائنة', 0, _st.diff_value);
    ELSE
      INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
      VALUES (_salon, _entry, '5900', 'خسائر ونقص المخزون', ABS(_st.diff_value), 0),
             (_salon, _entry, '1140', 'مخزون المواد والمنتجات', 0, ABS(_st.diff_value));
    END IF;

    _n_st := _n_st + 1;
  END LOOP;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'post_accounting', 'journal', NULL,
          jsonb_build_object('period', _period, 'from', _from, 'to', _to,
                             'invoices', _n_inv, 'expenses', _n_exp, 'stocktakes', _n_st));

  RETURN jsonb_build_object('period', _period, 'invoices', _n_inv, 'expenses', _n_exp, 'stocktakes', _n_st);
END;
$$;

CREATE OR REPLACE FUNCTION public.unpost_accounting_period(_salon uuid, _period text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_salon(auth.uid(), _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إلغاء الترحيل';
  END IF;
  DELETE FROM public.journal_entries WHERE salon_id = _salon AND period = _period;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

-- ============ stocktake now writes stock movements ============
CREATE OR REPLACE FUNCTION public.apply_stocktake(p_stocktake_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_salon uuid;
  v_status text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT salon_id, status INTO v_salon, v_status
  FROM public.inventory_stocktakes WHERE id = p_stocktake_id FOR UPDATE;

  IF v_salon IS NULL THEN RAISE EXCEPTION 'stocktake not found'; END IF;
  IF NOT public.can_manage_salon(v_uid, v_salon) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF v_status = 'applied' THEN RAISE EXCEPTION 'stocktake already applied'; END IF;

  INSERT INTO public.stock_movements (salon_id, item_id, qty, kind, unit_cost, reason, created_by)
  SELECT v_salon, l.item_id,
         GREATEST(0, l.counted_qty) - i.stock,
         'adjust'::public.stock_move_type,
         l.cost_per_unit,
         'تسوية جرد المستودع',
         v_uid
  FROM public.inventory_stocktake_lines l
  JOIN public.inventory_items i ON i.id = l.item_id AND i.salon_id = v_salon
  WHERE l.stocktake_id = p_stocktake_id
    AND GREATEST(0, l.counted_qty) <> i.stock;

  UPDATE public.inventory_items i
  SET stock = GREATEST(0, l.counted_qty), updated_at = now()
  FROM public.inventory_stocktake_lines l
  WHERE l.stocktake_id = p_stocktake_id
    AND l.item_id = i.id
    AND i.salon_id = v_salon;

  UPDATE public.inventory_stocktakes
  SET status = 'applied', applied_at = now()
  WHERE id = p_stocktake_id;
END;
$$;