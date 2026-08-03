-- ============ helper: salon owner (stricter than can_manage_salon) ============
CREATE OR REPLACE FUNCTION public.is_salon_owner(_uid uuid, _salon uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_platform_owner(_uid)
      OR EXISTS (SELECT 1 FROM public.salons s WHERE s.id = _salon AND s.owner_id = _uid)
      OR EXISTS (
           SELECT 1 FROM public.salon_members m
           WHERE m.user_id = _uid AND m.salon_id = _salon AND m.role = 'salon_owner'
         );
$$;

REVOKE ALL ON FUNCTION public.is_salon_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_salon_owner(uuid, uuid) TO authenticated, service_role;

-- ============ 1) fiscal years / year-end close ============
CREATE TABLE public.fiscal_years (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  year integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  net_profit numeric NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_expenses numeric NOT NULL DEFAULT 0,
  closing_entry_id uuid,
  note text,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_years TO authenticated;
GRANT ALL ON public.fiscal_years TO service_role;
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_years_read" ON public.fiscal_years
  FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "fiscal_years_manage" ON public.fiscal_years
  FOR ALL TO authenticated
  USING (public.is_salon_owner(auth.uid(), salon_id))
  WITH CHECK (public.is_salon_owner(auth.uid(), salon_id));

CREATE TRIGGER fiscal_years_touch BEFORE UPDATE ON public.fiscal_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- block postings inside a closed year
CREATE OR REPLACE FUNCTION public.guard_closed_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _row record; _closed boolean;
BEGIN
  _row := COALESCE(NEW, OLD);
  SELECT true INTO _closed FROM public.fiscal_years fy
  WHERE fy.salon_id = _row.salon_id
    AND fy.status = 'closed'
    AND _row.entry_date BETWEEN fy.start_date AND fy.end_date
  LIMIT 1;

  IF _closed THEN
    -- the closing entry itself is written while the year row is still open
    RAISE EXCEPTION 'السنة المالية لتاريخ % مقفلة، أعد فتحها أولًا', _row.entry_date;
  END IF;
  RETURN _row;
END; $$;

CREATE TRIGGER journal_entries_guard_closed
  BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_period();

CREATE OR REPLACE FUNCTION public.close_fiscal_year(_salon uuid, _year integer, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _from date := make_date(_year, 1, 1);
  _to date := make_date(_year, 12, 31);
  _entry uuid;
  _rev numeric := 0; _exp numeric := 0; _profit numeric := 0;
  _fy uuid;
  l record;
BEGIN
  IF _uid IS NULL OR NOT public.is_salon_owner(_uid, _salon) THEN
    RAISE EXCEPTION 'الإقفال السنوي متاح لمالك الصالون فقط';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fiscal_years WHERE salon_id = _salon AND year = _year AND status = 'closed') THEN
    RAISE EXCEPTION 'السنة % مقفلة مسبقًا', _year;
  END IF;

  INSERT INTO public.journal_entries (salon_id, entry_date, period, source, memo, amount, created_by)
  VALUES (_salon, _to, to_char(_to,'YYYY-MM'), 'closing',
          COALESCE(NULLIF(trim(COALESCE(_note,'')),''), 'قيد إقفال السنة المالية ' || _year), 0, _uid)
  RETURNING id INTO _entry;

  -- reverse every revenue / expense balance of the year into retained earnings
  FOR l IN
    SELECT jl.account_code,
           MAX(jl.account_name) AS account_name,
           ca.kind,
           ROUND(SUM(jl.debit) - SUM(jl.credit), 2) AS net_debit
    FROM public.journal_lines jl
    JOIN public.journal_entries je ON je.id = jl.entry_id
    LEFT JOIN public.chart_accounts ca ON ca.salon_id = _salon AND ca.code = jl.account_code
    WHERE jl.salon_id = _salon
      AND je.entry_date BETWEEN _from AND _to
      AND je.source <> 'closing'
      AND COALESCE(ca.kind,'') IN ('revenue','expense')
    GROUP BY jl.account_code, ca.kind
  LOOP
    IF ABS(l.net_debit) < 0.01 THEN CONTINUE; END IF;
    IF l.kind = 'revenue' THEN _rev := _rev + (-l.net_debit); ELSE _exp := _exp + l.net_debit; END IF;
    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, l.account_code, COALESCE(l.account_name, l.account_code),
            CASE WHEN l.net_debit < 0 THEN -l.net_debit ELSE 0 END,
            CASE WHEN l.net_debit > 0 THEN l.net_debit ELSE 0 END);
  END LOOP;

  _profit := ROUND(_rev - _exp, 2);

  IF ABS(_profit) >= 0.01 THEN
    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, '3090', 'الأرباح المحتجزة',
            CASE WHEN _profit < 0 THEN -_profit ELSE 0 END,
            CASE WHEN _profit > 0 THEN _profit ELSE 0 END);
  END IF;

  UPDATE public.journal_entries
  SET amount = COALESCE((SELECT ROUND(SUM(debit),2) FROM public.journal_lines WHERE entry_id = _entry), 0)
  WHERE id = _entry;

  INSERT INTO public.fiscal_years (salon_id, year, start_date, end_date, status, net_profit,
                                   total_revenue, total_expenses, closing_entry_id, note, closed_at, closed_by)
  VALUES (_salon, _year, _from, _to, 'closed', _profit, ROUND(_rev,2), ROUND(_exp,2), _entry,
          NULLIF(trim(COALESCE(_note,'')),''), now(), _uid)
  ON CONFLICT (salon_id, year) DO UPDATE
    SET status = 'closed', net_profit = _profit, total_revenue = ROUND(_rev,2),
        total_expenses = ROUND(_exp,2), closing_entry_id = _entry,
        note = NULLIF(trim(COALESCE(_note,'')),''), closed_at = now(), closed_by = _uid
  RETURNING id INTO _fy;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'close_fiscal_year', 'fiscal_year', _fy,
          jsonb_build_object('year', _year, 'net_profit', _profit, 'revenue', ROUND(_rev,2), 'expenses', ROUND(_exp,2)));

  RETURN _fy;
END; $$;

REVOKE ALL ON FUNCTION public.close_fiscal_year(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_fiscal_year(uuid, integer, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reopen_fiscal_year(_salon uuid, _year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _entry uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_salon_owner(_uid, _salon) THEN
    RAISE EXCEPTION 'إعادة الفتح متاحة لمالك الصالون فقط';
  END IF;

  SELECT closing_entry_id INTO _entry FROM public.fiscal_years
  WHERE salon_id = _salon AND year = _year AND status = 'closed';
  IF _entry IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.fiscal_years WHERE salon_id = _salon AND year = _year AND status = 'closed'
  ) THEN
    RAISE EXCEPTION 'السنة % غير مقفلة', _year;
  END IF;

  UPDATE public.fiscal_years
  SET status = 'open', closing_entry_id = NULL, closed_at = NULL, closed_by = NULL
  WHERE salon_id = _salon AND year = _year;

  IF _entry IS NOT NULL THEN
    DELETE FROM public.journal_lines WHERE entry_id = _entry;
    DELETE FROM public.journal_entries WHERE id = _entry AND salon_id = _salon;
  END IF;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'reopen_fiscal_year', 'fiscal_year', NULL, jsonb_build_object('year', _year));
END; $$;

REVOKE ALL ON FUNCTION public.reopen_fiscal_year(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_fiscal_year(uuid, integer) TO authenticated, service_role;

-- ============ 2) credit notes ============
CREATE TABLE public.credit_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  seq integer NOT NULL DEFAULT 1,
  number text NOT NULL,
  reason text,
  subtotal numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','void')),
  journal_entry_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_notes_read" ON public.credit_notes
  FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "credit_notes_manage" ON public.credit_notes
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER credit_notes_touch BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX credit_notes_salon_idx ON public.credit_notes (salon_id, created_at DESC);

CREATE TABLE public.credit_note_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  credit_note_id uuid NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'service',
  ref_id uuid,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_note_items TO authenticated;
GRANT ALL ON public.credit_note_items TO service_role;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_note_items_read" ON public.credit_note_items
  FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "credit_note_items_manage" ON public.credit_note_items
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE OR REPLACE FUNCTION public.issue_credit_note(
  _salon uuid,
  _invoice uuid,
  _reason text,
  _lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv record;
  _rate numeric;
  _sub numeric := 0; _vat numeric := 0; _total numeric := 0;
  _already numeric := 0;
  _seq integer;
  _note uuid; _entry uuid;
  _cash_code text;
  l jsonb; _qty numeric; _price numeric;
BEGIN
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إصدار ملاحظة دائنة';
  END IF;
  IF _lines IS NULL OR jsonb_array_length(_lines) = 0 THEN
    RAISE EXCEPTION 'أضف بندًا واحدًا على الأقل';
  END IF;

  SELECT * INTO _inv FROM public.invoices WHERE id = _invoice AND salon_id = _salon;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'الفاتورة غير موجودة'; END IF;
  IF _inv.status = 'void' THEN RAISE EXCEPTION 'الفاتورة ملغاة، لا يمكن إصدار ملاحظة دائنة'; END IF;

  SELECT COALESCE(vat_rate, 15) INTO _rate FROM public.salons WHERE id = _salon;
  _rate := COALESCE(_rate, 15);

  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _qty := GREATEST(COALESCE((l->>'qty')::numeric, 0), 0);
    _price := GREATEST(COALESCE((l->>'unit_price')::numeric, 0), 0);
    IF _qty = 0 OR _price = 0 THEN CONTINUE; END IF;
    _sub := _sub + (_qty * _price);
  END LOOP;

  _sub := ROUND(_sub, 2);
  IF _sub <= 0 THEN RAISE EXCEPTION 'قيمة الملاحظة الدائنة يجب أن تكون أكبر من صفر'; END IF;

  _vat := ROUND(_sub * _rate / 100.0, 2);
  _total := ROUND(_sub + _vat, 2);

  SELECT COALESCE(SUM(total), 0) INTO _already
  FROM public.credit_notes WHERE invoice_id = _invoice AND status = 'issued';

  IF ROUND(_already + _total, 2) > ROUND(_inv.total, 2) + 0.01 THEN
    RAISE EXCEPTION 'إجمالي الملاحظات الدائنة (%) يتجاوز قيمة الفاتورة (%)',
      ROUND(_already + _total, 2), ROUND(_inv.total, 2);
  END IF;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO _seq FROM public.credit_notes WHERE salon_id = _salon;

  INSERT INTO public.credit_notes (salon_id, branch_id, invoice_id, invoice_number, customer_id,
                                   seq, number, reason, subtotal, vat, total, vat_rate, created_by)
  VALUES (_salon, _inv.branch_id, _invoice, _inv.number, _inv.customer_id,
          _seq, 'CN-' || lpad(_seq::text, 5, '0'), NULLIF(trim(COALESCE(_reason,'')),''),
          _sub, _vat, _total, _rate, _uid)
  RETURNING id INTO _note;

  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _qty := GREATEST(COALESCE((l->>'qty')::numeric, 0), 0);
    _price := GREATEST(COALESCE((l->>'unit_price')::numeric, 0), 0);
    IF _qty = 0 OR _price = 0 THEN CONTINUE; END IF;
    INSERT INTO public.credit_note_items (salon_id, credit_note_id, kind, ref_id, name, qty, unit_price, total)
    VALUES (_salon, _note, COALESCE(NULLIF(l->>'kind',''), 'service'),
            NULLIF(l->>'ref_id','')::uuid, COALESCE(NULLIF(l->>'name',''), 'بند مرتجع'),
            _qty, _price, ROUND(_qty * _price, 2));
  END LOOP;

  -- accounting: reverse revenue + output VAT against the settlement account
  _cash_code := CASE WHEN COALESCE(_inv.payment_method,'cash') = 'cash' THEN '1010' ELSE '1020' END;

  INSERT INTO public.journal_entries (salon_id, entry_date, period, source, source_id, memo, amount, created_by)
  VALUES (_salon, CURRENT_DATE, to_char(CURRENT_DATE,'YYYY-MM'), 'credit_note', _note,
          'ملاحظة دائنة CN-' || lpad(_seq::text, 5, '0') || ' على الفاتورة ' || COALESCE(_inv.number,''),
          _total, _uid)
  RETURNING id INTO _entry;

  INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
  VALUES (_salon, _entry, '4010', 'إيرادات الخدمات والمنتجات', _sub, 0);
  IF _vat > 0 THEN
    INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
    VALUES (_salon, _entry, '2310', 'ضريبة القيمة المضافة المستحقة', _vat, 0);
  END IF;
  INSERT INTO public.journal_lines (salon_id, entry_id, account_code, account_name, debit, credit)
  VALUES (_salon, _entry, _cash_code,
          CASE WHEN _cash_code = '1010' THEN 'الصندوق' ELSE 'البنك / مدفوعات إلكترونية' END,
          0, _total);

  UPDATE public.credit_notes SET journal_entry_id = _entry WHERE id = _note;

  UPDATE public.invoices
  SET refunded_amount = ROUND(COALESCE(refunded_amount, 0) + _total, 2)
  WHERE id = _invoice;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'issue_credit_note', 'credit_note', _note,
          jsonb_build_object('invoice', _inv.number, 'total', _total, 'vat', _vat, 'reason', _reason));

  RETURN _note;
END; $$;

REVOKE ALL ON FUNCTION public.issue_credit_note(uuid, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_credit_note(uuid, uuid, text, jsonb) TO authenticated, service_role;

-- ============ 3) ZATCA config + submissions ============
CREATE TABLE public.zatca_config (
  salon_id uuid NOT NULL PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  env text NOT NULL DEFAULT 'sandbox' CHECK (env IN ('sandbox','simulation','production')),
  vat_number text,
  seller_name text,
  common_name text,
  binary_token text,
  secret text,
  last_hash text,
  last_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zatca_config TO authenticated;
GRANT ALL ON public.zatca_config TO service_role;
ALTER TABLE public.zatca_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zatca_config_owner" ON public.zatca_config
  FOR ALL TO authenticated
  USING (public.is_salon_owner(auth.uid(), salon_id))
  WITH CHECK (public.is_salon_owner(auth.uid(), salon_id));

CREATE TRIGGER zatca_config_touch BEFORE UPDATE ON public.zatca_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.einvoice_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'invoice' CHECK (doc_type IN ('invoice','credit_note')),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  credit_note_id uuid REFERENCES public.credit_notes(id) ON DELETE SET NULL,
  doc_number text,
  doc_uuid text,
  invoice_hash text,
  previous_hash text,
  qr text,
  xml text,
  env text NOT NULL DEFAULT 'offline',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','generated','reported','cleared','rejected','failed')),
  response jsonb,
  error text,
  submitted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.einvoice_submissions TO authenticated;
GRANT ALL ON public.einvoice_submissions TO service_role;
ALTER TABLE public.einvoice_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "einvoice_submissions_read" ON public.einvoice_submissions
  FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "einvoice_submissions_manage" ON public.einvoice_submissions
  FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER einvoice_submissions_touch BEFORE UPDATE ON public.einvoice_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX einvoice_submissions_salon_idx ON public.einvoice_submissions (salon_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_einvoice_submission(
  _salon uuid,
  _doc_type text,
  _invoice uuid,
  _credit_note uuid,
  _doc_number text,
  _doc_uuid text,
  _hash text,
  _qr text,
  _xml text,
  _env text,
  _status text,
  _response jsonb DEFAULT NULL,
  _error text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _prev text; _id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.can_manage_salon(_uid, _salon) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إرسال الفواتير الإلكترونية';
  END IF;

  SELECT last_hash INTO _prev FROM public.zatca_config WHERE salon_id = _salon;

  INSERT INTO public.einvoice_submissions (salon_id, doc_type, invoice_id, credit_note_id, doc_number,
                                           doc_uuid, invoice_hash, previous_hash, qr, xml, env, status,
                                           response, error, submitted_at, created_by)
  VALUES (_salon, COALESCE(NULLIF(_doc_type,''), 'invoice'), _invoice, _credit_note, _doc_number,
          _doc_uuid, _hash, _prev, _qr, _xml, COALESCE(NULLIF(_env,''), 'offline'),
          COALESCE(NULLIF(_status,''), 'generated'), _response, NULLIF(_error,''), now(), _uid)
  RETURNING id INTO _id;

  IF COALESCE(_status,'') IN ('generated','reported','cleared') AND COALESCE(_hash,'') <> '' THEN
    INSERT INTO public.zatca_config (salon_id, last_hash, last_submitted_at)
    VALUES (_salon, _hash, now())
    ON CONFLICT (salon_id) DO UPDATE SET last_hash = _hash, last_submitted_at = now();
  END IF;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, after)
  VALUES (_salon, _uid, 'einvoice_submission', 'einvoice', _id,
          jsonb_build_object('doc', _doc_number, 'status', _status, 'env', _env));

  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.record_einvoice_submission(uuid, text, uuid, uuid, text, text, text, text, text, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_einvoice_submission(uuid, text, uuid, uuid, text, text, text, text, text, text, text, jsonb, text) TO authenticated, service_role;

-- keep the public (anon) surface closed on all new tables
REVOKE ALL ON public.fiscal_years FROM anon;
REVOKE ALL ON public.credit_notes FROM anon;
REVOKE ALL ON public.credit_note_items FROM anon;
REVOKE ALL ON public.zatca_config FROM anon;
REVOKE ALL ON public.einvoice_submissions FROM anon;