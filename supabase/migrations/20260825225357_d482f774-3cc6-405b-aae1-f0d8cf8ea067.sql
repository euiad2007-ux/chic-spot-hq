-- 1) Plan additions
ALTER TABLE public.platform_plans
  ADD COLUMN IF NOT EXISTS max_invoices integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_website boolean NOT NULL DEFAULT true;

-- monthly invoice cap (0 = unlimited)
CREATE OR REPLACE FUNCTION public.enforce_invoice_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_code text;
  plan_limit integer;
  current_count integer;
BEGIN
  SELECT s.plan INTO plan_code FROM public.salons s WHERE s.id = NEW.salon_id;
  IF plan_code IS NULL THEN RETURN NEW; END IF;

  SELECT p.max_invoices INTO plan_limit
  FROM public.platform_plans p WHERE p.code = plan_code AND p.is_active;

  IF plan_limit IS NULL OR plan_limit <= 0 THEN RETURN NEW; END IF;

  SELECT count(*) INTO current_count
  FROM public.invoices i
  WHERE i.salon_id = NEW.salon_id
    AND i.created_at >= date_trunc('month', now());

  IF current_count >= plan_limit THEN
    RAISE EXCEPTION 'تم الوصول إلى الحد الشهري لعدد الفواتير في الباقة';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_plan_limit ON public.invoices;
CREATE TRIGGER enforce_invoice_plan_limit
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_plan_limit();

-- 2) Subscription billing
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  plan_code text,
  period text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  due_date date,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_invoices TO authenticated;
GRANT ALL ON public.subscription_invoices TO service_role;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners manage subscription invoices"
ON public.subscription_invoices FOR ALL TO authenticated
USING (public.is_platform_owner(auth.uid()))
WITH CHECK (public.is_platform_owner(auth.uid()));

CREATE POLICY "Salon managers read own subscription invoices"
ON public.subscription_invoices FOR SELECT TO authenticated
USING (public.can_manage_salon(auth.uid(), salon_id));

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.subscription_invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'transfer',
  reference text,
  note text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners manage subscription payments"
ON public.subscription_payments FOR ALL TO authenticated
USING (public.is_platform_owner(auth.uid()))
WITH CHECK (public.is_platform_owner(auth.uid()));

CREATE POLICY "Salon managers read own subscription payments"
ON public.subscription_payments FOR SELECT TO authenticated
USING (public.can_manage_salon(auth.uid(), salon_id));

CREATE OR REPLACE FUNCTION public.sync_subscription_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  total_paid numeric;
  inv_total numeric;
BEGIN
  IF target IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(sum(amount), 0) INTO total_paid
  FROM public.subscription_payments WHERE invoice_id = target;

  SELECT total INTO inv_total FROM public.subscription_invoices WHERE id = target;

  UPDATE public.subscription_invoices
  SET paid = total_paid,
      status = CASE
        WHEN total_paid <= 0 THEN 'unpaid'
        WHEN total_paid >= COALESCE(inv_total, 0) THEN 'paid'
        ELSE 'partial' END,
      updated_at = now()
  WHERE id = target;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_subscription_invoice_paid ON public.subscription_payments;
CREATE TRIGGER sync_subscription_invoice_paid
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_invoice_paid();

CREATE TRIGGER update_subscription_invoices_updated_at
BEFORE UPDATE ON public.subscription_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  last_reply_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners manage tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (public.is_platform_owner(auth.uid()))
WITH CHECK (public.is_platform_owner(auth.uid()));

CREATE POLICY "Salon managers read own tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "Salon managers create own tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (public.can_manage_salon(auth.uid(), salon_id) AND created_by = auth.uid());

CREATE POLICY "Salon managers update own tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.can_manage_salon(auth.uid(), salon_id))
WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  from_platform boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners read messages"
ON public.support_messages FOR SELECT TO authenticated
USING (public.is_platform_owner(auth.uid()));

CREATE POLICY "Platform owners write messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (public.is_platform_owner(auth.uid()));

CREATE POLICY "Salon managers read own messages"
ON public.support_messages FOR SELECT TO authenticated
USING (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "Salon managers write own messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_salon(auth.uid(), salon_id)
  AND author_id = auth.uid()
  AND from_platform = false
);

-- 4) Platform overview of every salon
CREATE OR REPLACE FUNCTION public.platform_salons_overview()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  phone text,
  plan text,
  plan_name text,
  plan_price numeric,
  subscription_status text,
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  is_suspended boolean,
  admin_notes text,
  custom_domain text,
  domain_status text,
  created_at timestamptz,
  owner_email text,
  owner_name text,
  branches_count integer,
  staff_count integer,
  customers_count integer,
  services_count integer,
  bookings_count integer,
  invoices_count integer,
  invoices_month integer,
  gross_sales numeric,
  sub_billed numeric,
  sub_paid numeric,
  sub_due numeric,
  open_tickets integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.name, s.slug, s.phone, s.plan,
    p.name, p.price_monthly,
    s.subscription_status, s.trial_ends_at, s.subscription_ends_at,
    s.is_suspended, s.admin_notes, s.custom_domain, s.domain_status, s.created_at,
    u.email::text, pr.full_name,
    (SELECT count(*)::int FROM public.branches b WHERE b.salon_id = s.id),
    (SELECT count(*)::int FROM public.staff st WHERE st.salon_id = s.id),
    (SELECT count(*)::int FROM public.customers c WHERE c.salon_id = s.id),
    (SELECT count(*)::int FROM public.services sv WHERE sv.salon_id = s.id),
    (SELECT count(*)::int FROM public.bookings bk WHERE bk.salon_id = s.id),
    (SELECT count(*)::int FROM public.invoices iv WHERE iv.salon_id = s.id),
    (SELECT count(*)::int FROM public.invoices iv WHERE iv.salon_id = s.id AND iv.created_at >= date_trunc('month', now())),
    COALESCE((SELECT sum(iv.paid) FROM public.invoices iv WHERE iv.salon_id = s.id), 0),
    COALESCE((SELECT sum(si.total) FROM public.subscription_invoices si WHERE si.salon_id = s.id), 0),
    COALESCE((SELECT sum(si.paid) FROM public.subscription_invoices si WHERE si.salon_id = s.id), 0),
    COALESCE((SELECT sum(si.total - si.paid) FROM public.subscription_invoices si WHERE si.salon_id = s.id AND si.status <> 'void'), 0),
    (SELECT count(*)::int FROM public.support_tickets t WHERE t.salon_id = s.id AND t.status <> 'closed')
  FROM public.salons s
  LEFT JOIN public.platform_plans p ON p.code = s.plan
  LEFT JOIN auth.users u ON u.id = s.owner_id
  LEFT JOIN public.profiles pr ON pr.id = s.owner_id
  WHERE public.is_platform_owner(auth.uid())
  ORDER BY s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.platform_salons_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.platform_salons_overview() TO authenticated;
