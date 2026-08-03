-- 1) Chart of accounts ------------------------------------------------------
CREATE TABLE public.chart_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('asset','liability','equity','revenue','expense')),
  parent_code text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_accounts TO authenticated;
GRANT ALL ON public.chart_accounts TO service_role;
ALTER TABLE public.chart_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chart_accounts_read" ON public.chart_accounts
  FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "chart_accounts_manage" ON public.chart_accounts
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER chart_accounts_touch BEFORE UPDATE ON public.chart_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX chart_accounts_salon_idx ON public.chart_accounts (salon_id, code);

-- 2) Fixed assets -----------------------------------------------------------
CREATE TABLE public.fixed_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  acquired_on date NOT NULL DEFAULT CURRENT_DATE,
  cost numeric NOT NULL DEFAULT 0 CHECK (cost >= 0),
  salvage_value numeric NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  useful_life_months integer NOT NULL DEFAULT 60 CHECK (useful_life_months > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disposed')),
  disposed_on date,
  disposal_amount numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_assets TO authenticated;
GRANT ALL ON public.fixed_assets TO service_role;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_assets_read" ON public.fixed_assets
  FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "fixed_assets_manage" ON public.fixed_assets
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER fixed_assets_touch BEFORE UPDATE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Default account tree ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_chart_accounts(_salon uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n integer;
BEGIN
  INSERT INTO public.chart_accounts (salon_id, code, name, kind, parent_code, is_system)
  VALUES
    (_salon,'1000','الأصول','asset',NULL,true),
    (_salon,'1010','الصندوق','asset','1000',true),
    (_salon,'1020','البنك / مدفوعات إلكترونية','asset','1000',true),
    (_salon,'1210','العملاء (مدينون)','asset','1000',true),
    (_salon,'1140','مخزون المواد والمنتجات','asset','1000',true),
    (_salon,'1360','ضريبة القيمة المضافة القابلة للخصم','asset','1000',true),
    (_salon,'1510','الأصول الثابتة','asset','1000',true),
    (_salon,'1519','مجمع إهلاك الأصول الثابتة','asset','1000',true),
    (_salon,'2000','الالتزامات','liability',NULL,true),
    (_salon,'2110','الموردون (دائنون)','liability','2000',true),
    (_salon,'2210','رواتب مستحقة','liability','2000',true),
    (_salon,'2310','ضريبة القيمة المضافة المستحقة','liability','2000',true),
    (_salon,'3000','حقوق الملكية','equity',NULL,true),
    (_salon,'3010','رأس المال','equity','3000',true),
    (_salon,'3090','الأرباح المحتجزة','equity','3000',true),
    (_salon,'4000','الإيرادات','revenue',NULL,true),
    (_salon,'4010','إيرادات الخدمات والمنتجات','revenue','4000',true),
    (_salon,'4090','خصومات المبيعات','expense','5000',true),
    (_salon,'4900','فروق جرد دائنة','revenue','4000',true),
    (_salon,'5000','المصروفات','expense',NULL,true),
    (_salon,'5010','مصروفات تشغيلية','expense','5000',true),
    (_salon,'5020','تكلفة المواد المستخدمة','expense','5000',true),
    (_salon,'5110','رواتب وأجور','expense','5000',true),
    (_salon,'5210','مصروف الإهلاك','expense','5000',true),
    (_salon,'5900','خسائر ونقص المخزون','expense','5000',true)
  ON CONFLICT (salon_id, code) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $$;

REVOKE ALL ON FUNCTION public.seed_chart_accounts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_chart_accounts(uuid) TO authenticated, service_role;

-- backfill every existing salon
DO $$
DECLARE s record;
BEGIN
  FOR s IN SELECT id FROM public.salons LOOP
    PERFORM public.seed_chart_accounts(s.id);
  END LOOP;
END $$;

-- new salons get the tree automatically
CREATE OR REPLACE FUNCTION public.create_salon(_name text, _slug text, _phone text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE new_id uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  INSERT INTO public.salons (name, slug, phone, owner_id, trial_ends_at)
  VALUES (_name, lower(_slug), _phone, uid, now() + interval '30 days')
  RETURNING id INTO new_id;
  INSERT INTO public.branches (salon_id, name) VALUES (new_id, 'الفرع الرئيسي');
  INSERT INTO public.salon_members (user_id, salon_id, role) VALUES (uid, new_id, 'salon_owner');
  INSERT INTO public.salon_settings (salon_id) VALUES (new_id);
  PERFORM public.seed_chart_accounts(new_id);
  RETURN new_id;
END; $$;

-- 4) Manual journal entries -------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_journal_entry(_salon uuid, _date date, _memo text, _lines jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  l jsonb;
  _debit numeric := 0; _credit numeric := 0;
  _entry uuid; _code text; _name text; _d numeric; _c numeric;
BEGIN
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إضافة قيد';
  END IF;
  IF _date IS NULL THEN RAISE EXCEPTION 'تاريخ القيد مطلوب'; END IF;
  IF _lines IS NULL OR jsonb_array_length(_lines) < 2 THEN
    RAISE EXCEPTION 'القيد يحتاج سطرين على الأقل';
  END IF;

  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _code := trim(COALESCE(l->>'account_code',''));
    _d := GREATEST(COALESCE((l->>'debit')::numeric, 0), 0);
    _c := GREATEST(COALESCE((l->>'credit')::numeric, 0), 0);
    IF _code = '' THEN RAISE EXCEPTION 'رمز الحساب مطلوب في كل سطر'; END IF;
    IF _d = 0 AND _c = 0 THEN RAISE EXCEPTION 'كل سطر يجب أن يحتوي مبلغ مدين أو دائن'; END IF;
    IF _d > 0 AND _c > 0 THEN RAISE EXCEPTION 'لا يمكن أن يكون السطر مدينًا ودائنًا معًا'; END IF;
    SELECT name INTO _name FROM public.chart_accounts
    WHERE salon_id = _salon AND code = _code AND is_active;
    IF _name IS NULL THEN RAISE EXCEPTION 'الحساب % غير موجود في دليل الحسابات', _code; END IF;
    _debit := _debit + _d; _credit := _credit + _c;
  END LOOP;

  IF ROUND(_debit, 2) <> ROUND(_credit, 2) THEN
    RAISE EXCEPTION 'القيد غير متوازن: مدين % مقابل دائن %', ROUND(_debit,2), ROUND(_credit,2);
  END IF;

  INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
  VALUES (_salon, _date, to_char(_date,'YYYY-MM'), 'manual', NULL,
          NULLIF(trim(COALESCE(_memo,'')),''), ROUND(_debit,2), _uid)
  RETURNING id INTO _entry;

  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _code := trim(l->>'account_code');
    SELECT name INTO _name FROM public.chart_accounts WHERE salon_id = _salon AND code = _code;
    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, _code, _name,
            ROUND(GREATEST(COALESCE((l->>'debit')::numeric,0),0), 2),
            ROUND(GREATEST(COALESCE((l->>'credit')::numeric,0),0), 2));
  END LOOP;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'manual_journal', 'journal', _entry,
          jsonb_build_object('date', _date, 'amount', ROUND(_debit,2), 'memo', _memo));

  RETURN _entry;
END; $$;

REVOKE ALL ON FUNCTION public.create_journal_entry(uuid, date, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_journal_entry(uuid, date, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_journal_entry(_entry uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE e public.journal_entries;
BEGIN
  SELECT * INTO e FROM public.journal_entries WHERE id = _entry;
  IF e.id IS NULL THEN RAISE EXCEPTION 'القيد غير موجود'; END IF;
  IF auth.uid() IS NULL OR NOT public.can_manage_salon(auth.uid(), e.salon_id) THEN
    RAISE EXCEPTION 'لا تملك صلاحية حذف القيد';
  END IF;
  IF e.source <> 'manual' THEN
    RAISE EXCEPTION 'القيود المرحّلة تلقائيًا تُحذف بإعادة ترحيل الفترة';
  END IF;
  DELETE FROM public.journal_entries WHERE id = _entry;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.delete_journal_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_journal_entry(uuid) TO authenticated, service_role;

-- 5) Monthly depreciation posting ------------------------------------------
CREATE OR REPLACE FUNCTION public.post_depreciation(_salon uuid, _period text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _month_end date;
  a record; _entry uuid; _monthly numeric; _posted numeric; _remaining numeric;
  _n integer := 0; _total numeric := 0;
BEGIN
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية ترحيل الإهلاك';
  END IF;
  IF _period !~ '^\d{4}-\d{2}$' THEN RAISE EXCEPTION 'صيغة الفترة يجب أن تكون YYYY-MM'; END IF;
  _month_end := (to_date(_period || '-01','YYYY-MM-DD') + interval '1 month - 1 day')::date;

  FOR a IN
    SELECT * FROM public.fixed_assets
    WHERE salon_id = _salon AND status = 'active'
      AND acquired_on <= _month_end
      AND cost > salvage_value
  LOOP
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE salon_id = _salon AND source = 'depreciation'
                 AND source_id = a.id AND period = _period) THEN
      CONTINUE;
    END IF;

    _monthly := ROUND((a.cost - a.salvage_value) / a.useful_life_months, 2);
    SELECT COALESCE(SUM(amount), 0) INTO _posted FROM public.journal_entries
    WHERE salon_id = _salon AND source = 'depreciation' AND source_id = a.id;
    _remaining := ROUND((a.cost - a.salvage_value) - _posted, 2);
    IF _remaining <= 0 THEN CONTINUE; END IF;
    IF _monthly > _remaining THEN _monthly := _remaining; END IF;
    IF _monthly <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
    VALUES (_salon, _month_end, _period, 'depreciation', a.id,
            'إهلاك شهري: ' || a.name, _monthly, _uid)
    RETURNING id INTO _entry;

    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, '5210', 'مصروف الإهلاك', _monthly, 0),
           (_salon, _entry, '1519', 'مجمع إهلاك الأصول الثابتة', 0, _monthly);

    _n := _n + 1; _total := _total + _monthly;
  END LOOP;

  RETURN jsonb_build_object('period', _period, 'assets', _n, 'amount', ROUND(_total,2));
END; $$;

REVOKE ALL ON FUNCTION public.post_depreciation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_depreciation(uuid, text) TO authenticated, service_role;

-- 6) Extend automatic posting with payroll and purchases -------------------
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
  _inv record; _exp record; _st record; _ps record; _pu record;
  _entry uuid;
  _vat_rate numeric; _input_vat numeric; _net numeric;
  _inclusive boolean;
  _n_inv integer := 0; _n_exp integer := 0; _n_st integer := 0;
  _n_pay integer := 0; _n_pur integer := 0;
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

  FOR _inv IN
    SELECT id, number, created_at, subtotal, discount, vat, total, payment_method
    FROM public.invoices
    WHERE salon_id = _salon AND created_at::date BETWEEN _from AND _to
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

  FOR _st IN
    SELECT id, counted_on, diff_value
    FROM public.inventory_stocktakes
    WHERE salon_id = _salon AND status = 'applied'
      AND counted_on BETWEEN _from AND _to AND COALESCE(diff_value, 0) <> 0
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

  -- payroll: paid payslips of the period
  FOR _ps IN
    SELECT p.id, p.period, p.paid_amount, s.name AS staff_name, p.updated_at
    FROM public.payslips p
    JOIN public.staff s ON s.id = p.staff_id
    WHERE p.salon_id = _salon
      AND COALESCE(p.paid_amount, 0) > 0
      AND p.updated_at::date BETWEEN _from AND _to
  LOOP
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE salon_id = _salon AND source = 'payslip' AND source_id = _ps.id) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
    VALUES (_salon, _ps.updated_at::date, to_char(_ps.updated_at, 'YYYY-MM'), 'payslip', _ps.id,
            'راتب ' || _ps.staff_name || ' — ' || _ps.period, _ps.paid_amount, _uid)
    RETURNING id INTO _entry;

    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, '5110', 'رواتب وأجور', _ps.paid_amount, 0),
           (_salon, _entry, '1010', 'الصندوق', 0, _ps.paid_amount);

    _n_pay := _n_pay + 1;
  END LOOP;

  -- purchases: stock purchases with a known unit cost
  FOR _pu IN
    SELECT m.id, m.created_at, m.qty, m.unit_cost, i.name AS item_name
    FROM public.stock_movements m
    JOIN public.inventory_items i ON i.id = m.item_id
    WHERE m.salon_id = _salon AND m.kind = 'purchase'
      AND m.created_at::date BETWEEN _from AND _to
      AND COALESCE(m.unit_cost, 0) > 0 AND m.qty > 0
  LOOP
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE salon_id = _salon AND source = 'purchase' AND source_id = _pu.id) THEN
      CONTINUE;
    END IF;

    _net := ROUND(_pu.qty * _pu.unit_cost, 2);

    INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
    VALUES (_salon, _pu.created_at::date, to_char(_pu.created_at, 'YYYY-MM'), 'purchase', _pu.id,
            'شراء مخزون: ' || _pu.item_name, _net, _uid)
    RETURNING id INTO _entry;

    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, '1140', 'مخزون المواد والمنتجات', _net, 0),
           (_salon, _entry, '2110', 'الموردون (دائنون)', 0, _net);

    _n_pur := _n_pur + 1;
  END LOOP;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'post_accounting', 'journal', NULL,
          jsonb_build_object('period', _period, 'from', _from, 'to', _to,
                             'invoices', _n_inv, 'expenses', _n_exp, 'stocktakes', _n_st,
                             'payslips', _n_pay, 'purchases', _n_pur));

  RETURN jsonb_build_object('period', _period, 'invoices', _n_inv, 'expenses', _n_exp,
                            'stocktakes', _n_st, 'payslips', _n_pay, 'purchases', _n_pur);
END; $$;

REVOKE ALL ON FUNCTION public.post_accounting_period(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_accounting_period(uuid, date, date) TO authenticated, service_role;