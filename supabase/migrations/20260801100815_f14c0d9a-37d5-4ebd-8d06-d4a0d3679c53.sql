-- =========================================================
-- Salon Flow SaaS core schema (multi-tenant)
-- =========================================================

CREATE TYPE public.app_role AS ENUM ('platform_owner','salon_owner','branch_manager','staff','client');
CREATE TYPE public.booking_status AS ENUM ('new','confirmed','checked_in','in_progress','completed','no_show','cancelled');
CREATE TYPE public.pay_status AS ENUM ('unpaid','partial','paid','refunded','void');
CREATE TYPE public.stock_move_type AS ENUM ('purchase','consume','adjust','waste','return');
CREATE TYPE public.ledger_kind AS ENUM ('topup','spend','refund','transfer_in','transfer_out','referral','adjust');

-- ---------- tenants ----------
CREATE TABLE public.salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  phone text,
  plan text NOT NULL DEFAULT 'trial',
  subscription_status text NOT NULL DEFAULT 'active',
  trial_ends_at timestamptz,
  vat_pct numeric(5,2) NOT NULL DEFAULT 15,
  vat_number text,
  currency text NOT NULL DEFAULT 'SAR',
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  address text,
  lat numeric(10,7),
  lng numeric(10,7),
  geofence_m integer NOT NULL DEFAULT 150,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.branches (salon_id);

-- ---------- identity ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.salon_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, salon_id, role)
);
CREATE INDEX ON public.salon_members (user_id);
CREATE INDEX ON public.salon_members (salon_id);

-- ---------- security helpers ----------
CREATE OR REPLACE FUNCTION public.is_platform_owner(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salon_members m
                 WHERE m.user_id = _uid AND m.role = 'platform_owner');
$$;

CREATE OR REPLACE FUNCTION public.is_salon_member(_uid uuid, _salon uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_owner(_uid)
      OR EXISTS (SELECT 1 FROM public.salon_members m
                 WHERE m.user_id = _uid AND m.salon_id = _salon);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_salon(_uid uuid, _salon uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_owner(_uid)
      OR EXISTS (SELECT 1 FROM public.salon_members m
                 WHERE m.user_id = _uid AND m.salon_id = _salon
                   AND m.role IN ('salon_owner','branch_manager'));
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- people ----------
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id uuid,
  name text NOT NULL,
  job_title text,
  role_label text,
  phone text,
  email text,
  gender text,
  national_id text,
  birth_date date,
  nationality text,
  address text,
  emergency_name text,
  emergency_phone text,
  contract_type text DEFAULT 'full_time',
  hire_date date,
  base_salary numeric(12,2) NOT NULL DEFAULT 0,
  allowances jsonb NOT NULL DEFAULT '[]'::jsonb,
  commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  annual_leave_days integer NOT NULL DEFAULT 21,
  points integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.staff (salon_id);
CREATE INDEX ON public.staff (user_id);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  gender text,
  birth_date date,
  address text,
  notes text,
  wallet_id text UNIQUE,
  wallet_balance numeric(12,2) NOT NULL DEFAULT 0,
  loyalty_points numeric(12,2) NOT NULL DEFAULT 0,
  referral_code text UNIQUE,
  referred_by text,
  visits integer NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, phone)
);
CREATE INDEX ON public.customers (salon_id);
CREATE INDEX ON public.customers (user_id);

-- ---------- catalog ----------
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  duration_min integer NOT NULL DEFAULT 30,
  prep_min integer NOT NULL DEFAULT 0,
  cleanup_min integer NOT NULL DEFAULT 0,
  daily_capacity integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.services (salon_id);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.suppliers (salon_id);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'قطعة',
  measure text NOT NULL DEFAULT 'count',
  size_per_unit numeric(12,3) NOT NULL DEFAULT 1,
  stock numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  cost_per_unit numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.inventory_items (salon_id);

CREATE TABLE public.service_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty numeric(12,3) NOT NULL DEFAULT 0,
  UNIQUE (service_id, item_id)
);
CREATE INDEX ON public.service_materials (salon_id);

CREATE TABLE public.service_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  UNIQUE (service_id, staff_id)
);
CREATE INDEX ON public.service_staff (salon_id);

-- ---------- bookings ----------
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  code text NOT NULL,
  global_no integer NOT NULL DEFAULT 0,
  branch_no integer NOT NULL DEFAULT 0,
  daily_no integer NOT NULL DEFAULT 0,
  booking_date date NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  duration_min integer NOT NULL DEFAULT 30,
  price numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code text,
  coupon_discount numeric(12,2) NOT NULL DEFAULT 0,
  wallet_used numeric(12,2) NOT NULL DEFAULT 0,
  wallet_approved boolean NOT NULL DEFAULT false,
  payment_method text,
  hold_expires_at timestamptz,
  status public.booking_status NOT NULL DEFAULT 'new',
  pay_status public.pay_status NOT NULL DEFAULT 'unpaid',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, code)
);
CREATE INDEX ON public.bookings (salon_id, booking_date);
CREATE INDEX ON public.bookings (staff_id, starts_at);
CREATE INDEX ON public.bookings (customer_id);

CREATE TABLE public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  duration_min integer NOT NULL DEFAULT 0,
  queue_no integer,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX ON public.booking_services (booking_id);
CREATE INDEX ON public.booking_services (salon_id);

-- staff double-booking guard
CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.staff_id IS NULL OR NEW.status IN ('cancelled','no_show') THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = NEW.staff_id
      AND b.id <> NEW.id
      AND b.status NOT IN ('cancelled','no_show')
      AND tstzrange(b.starts_at, b.starts_at + (b.duration_min || ' minutes')::interval, '[)')
        && tstzrange(NEW.starts_at, NEW.starts_at + (NEW.duration_min || ' minutes')::interval, '[)')
  ) THEN
    RAISE EXCEPTION 'الموظف مشغول في هذا الوقت بحجز آخر';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bookings_no_overlap BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();

-- ---------- invoices ----------
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  seq bigint NOT NULL,
  number text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  vat numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  status public.pay_status NOT NULL DEFAULT 'unpaid',
  refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
  void_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, seq),
  UNIQUE (salon_id, number)
);
CREATE INDEX ON public.invoices (salon_id, created_at DESC);

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  is_refund boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.invoice_payments (invoice_id);
CREATE INDEX ON public.invoice_payments (salon_id);

-- sequential invoice number per salon
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE next_seq bigint;
BEGIN
  IF NEW.seq IS NULL OR NEW.seq = 0 THEN
    SELECT COALESCE(MAX(seq),0) + 1 INTO next_seq FROM public.invoices WHERE salon_id = NEW.salon_id;
    NEW.seq := next_seq;
  END IF;
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := 'INV-' || lpad(NEW.seq::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER invoices_set_number BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

-- keep paid/status in sync with payments
CREATE OR REPLACE FUNCTION public.sync_invoice_paid()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE inv_id uuid; s numeric; r numeric; tot numeric;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(CASE WHEN is_refund THEN 0 ELSE amount END),0),
         COALESCE(SUM(CASE WHEN is_refund THEN amount ELSE 0 END),0)
    INTO s, r FROM public.invoice_payments WHERE invoice_id = inv_id;
  SELECT total INTO tot FROM public.invoices WHERE id = inv_id;
  UPDATE public.invoices SET
    paid = s - r,
    refunded_amount = r,
    status = CASE
      WHEN r > 0 AND (s - r) <= 0 THEN 'refunded'::public.pay_status
      WHEN (s - r) >= COALESCE(tot,0) AND COALESCE(tot,0) > 0 THEN 'paid'::public.pay_status
      WHEN (s - r) > 0 THEN 'partial'::public.pay_status
      ELSE 'unpaid'::public.pay_status END,
    updated_at = now()
  WHERE id = inv_id;
  RETURN NULL;
END; $$;
CREATE TRIGGER invoice_payments_sync AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_paid();

-- ---------- wallet & loyalty ledgers ----------
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  kind public.ledger_kind NOT NULL,
  reason text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  counterparty_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.wallet_transactions (customer_id, created_at DESC);
CREATE INDEX ON public.wallet_transactions (salon_id);

CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points numeric(12,2) NOT NULL,
  reason text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.loyalty_transactions (customer_id, created_at DESC);
CREATE INDEX ON public.loyalty_transactions (salon_id);

CREATE OR REPLACE FUNCTION public.apply_wallet_tx()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cid uuid; bal numeric;
BEGIN
  cid := COALESCE(NEW.customer_id, OLD.customer_id);
  SELECT COALESCE(SUM(amount),0) INTO bal FROM public.wallet_transactions WHERE customer_id = cid;
  IF bal < 0 THEN RAISE EXCEPTION 'رصيد المحفظة غير كافٍ'; END IF;
  UPDATE public.customers SET wallet_balance = bal, updated_at = now() WHERE id = cid;
  RETURN NULL;
END; $$;
CREATE TRIGGER wallet_tx_apply AFTER INSERT OR UPDATE OR DELETE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_wallet_tx();

CREATE OR REPLACE FUNCTION public.apply_loyalty_tx()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cid uuid; pts numeric;
BEGIN
  cid := COALESCE(NEW.customer_id, OLD.customer_id);
  SELECT COALESCE(SUM(points),0) INTO pts FROM public.loyalty_transactions WHERE customer_id = cid;
  IF pts < 0 THEN RAISE EXCEPTION 'نقاط الولاء غير كافية'; END IF;
  UPDATE public.customers SET loyalty_points = pts, updated_at = now() WHERE id = cid;
  RETURN NULL;
END; $$;
CREATE TRIGGER loyalty_tx_apply AFTER INSERT OR UPDATE OR DELETE ON public.loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_loyalty_tx();

-- ---------- stock ----------
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty numeric(12,3) NOT NULL,
  kind public.stock_move_type NOT NULL,
  unit_cost numeric(12,2),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.stock_movements (item_id, created_at DESC);
CREATE INDEX ON public.stock_movements (salon_id);

CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE iid uuid; total numeric;
BEGIN
  iid := COALESCE(NEW.item_id, OLD.item_id);
  SELECT COALESCE(SUM(qty),0) INTO total FROM public.stock_movements WHERE item_id = iid;
  UPDATE public.inventory_items SET stock = total, updated_at = now() WHERE id = iid;
  RETURN NULL;
END; $$;
CREATE TRIGGER stock_movements_apply AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- ---------- attendance & payroll ----------
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  in_lat numeric(10,7), in_lng numeric(10,7),
  out_lat numeric(10,7), out_lng numeric(10,7),
  minutes integer NOT NULL DEFAULT 0,
  late_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.attendance (staff_id, work_date DESC);
CREATE INDEX ON public.attendance (salon_id);

CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  days numeric(6,2) NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'annual',
  status text NOT NULL DEFAULT 'approved',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.leaves (salon_id);

CREATE TABLE public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period text NOT NULL,
  worked_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  base_amount numeric(12,2) NOT NULL DEFAULT 0,
  overtime_amount numeric(12,2) NOT NULL DEFAULT 0,
  allowances_amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  bonus numeric(12,2) NOT NULL DEFAULT 0,
  deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, period)
);
CREATE INDEX ON public.payslips (salon_id);

-- ---------- coupons ----------
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  code text NOT NULL,
  kind text NOT NULL DEFAULT 'percent',
  value numeric(12,2) NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, code)
);
CREATE INDEX ON public.coupons (salon_id);

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.coupon_redemptions (coupon_id);
CREATE INDEX ON public.coupon_redemptions (salon_id);

CREATE OR REPLACE FUNCTION public.apply_coupon_use()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cid uuid; used integer; mx integer;
BEGIN
  cid := COALESCE(NEW.coupon_id, OLD.coupon_id);
  SELECT COUNT(*) INTO used FROM public.coupon_redemptions WHERE coupon_id = cid;
  SELECT max_uses INTO mx FROM public.coupons WHERE id = cid;
  IF mx IS NOT NULL AND used > mx THEN RAISE EXCEPTION 'تم استنفاد عدد استخدامات الكوبون'; END IF;
  UPDATE public.coupons SET used_count = used, updated_at = now() WHERE id = cid;
  RETURN NULL;
END; $$;
CREATE TRIGGER coupon_redemptions_apply AFTER INSERT OR DELETE ON public.coupon_redemptions
FOR EACH ROW EXECUTE FUNCTION public.apply_coupon_use();

-- ---------- settings & audit ----------
CREATE TABLE public.salon_settings (
  salon_id uuid PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
  site jsonb NOT NULL DEFAULT '{}'::jsonb,
  booking jsonb NOT NULL DEFAULT '{}'::jsonb,
  rewards jsonb NOT NULL DEFAULT '{}'::jsonb,
  payroll jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.audit_log (salon_id, created_at DESC);

-- ---------- signup handling ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- create a salon + owner membership for the signed-in user
CREATE OR REPLACE FUNCTION public.create_salon(_name text, _slug text, _phone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  INSERT INTO public.salons (name, slug, phone, owner_id, trial_ends_at)
  VALUES (_name, lower(_slug), _phone, uid, now() + interval '30 days')
  RETURNING id INTO new_id;
  INSERT INTO public.branches (salon_id, name) VALUES (new_id, 'الفرع الرئيسي');
  INSERT INTO public.salon_members (user_id, salon_id, role) VALUES (uid, new_id, 'salon_owner');
  INSERT INTO public.salon_settings (salon_id) VALUES (new_id);
  RETURN new_id;
END; $$;

-- =========================================================
-- GRANTS
-- =========================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.salons, public.branches, public.profiles, public.salon_members,
  public.staff, public.customers, public.services, public.suppliers,
  public.inventory_items, public.service_materials, public.service_staff,
  public.bookings, public.booking_services, public.invoices, public.invoice_payments,
  public.wallet_transactions, public.loyalty_transactions, public.stock_movements,
  public.attendance, public.leaves, public.payslips,
  public.coupons, public.coupon_redemptions, public.salon_settings, public.audit_log
TO authenticated;

GRANT ALL ON
  public.salons, public.branches, public.profiles, public.salon_members,
  public.staff, public.customers, public.services, public.suppliers,
  public.inventory_items, public.service_materials, public.service_staff,
  public.bookings, public.booking_services, public.invoices, public.invoice_payments,
  public.wallet_transactions, public.loyalty_transactions, public.stock_movements,
  public.attendance, public.leaves, public.payslips,
  public.coupons, public.coupon_redemptions, public.salon_settings, public.audit_log
TO service_role;

-- public storefront reads
GRANT SELECT ON public.salons, public.branches, public.services, public.salon_settings TO anon;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- salons
CREATE POLICY "public salon read" ON public.salons FOR SELECT TO anon USING (true);
CREATE POLICY "member salon read" ON public.salons FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), id));
CREATE POLICY "owner salon update" ON public.salons FOR UPDATE TO authenticated
  USING (public.can_manage_salon(auth.uid(), id)) WITH CHECK (public.can_manage_salon(auth.uid(), id));

-- salon_members
CREATE POLICY "member sees own memberships" ON public.salon_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_salon(auth.uid(), salon_id));
CREATE POLICY "managers manage members" ON public.salon_members FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- branches / services / salon_settings: public read + manager write + member read
CREATE POLICY "public branches read" ON public.branches FOR SELECT TO anon USING (active);
CREATE POLICY "member branches read" ON public.branches FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "public services read" ON public.services FOR SELECT TO anon USING (active);
CREATE POLICY "member services read" ON public.services FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "manage services" ON public.services FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "public settings read" ON public.salon_settings FOR SELECT TO anon USING (true);
CREATE POLICY "member settings read" ON public.salon_settings FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "manage settings" ON public.salon_settings FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- staff: member read, self update limited, managers full
CREATE POLICY "member staff read" ON public.staff FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- customers: own record or managers/staff of the salon
CREATE POLICY "customer self read" ON public.customers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "customer self update" ON public.customers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- generic tenant tables (staff-level read, manager write)
CREATE POLICY "tenant read" ON public.suppliers FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "tenant manage" ON public.suppliers FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "tenant read" ON public.inventory_items FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "tenant manage" ON public.inventory_items FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "public read" ON public.service_materials FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "tenant manage" ON public.service_materials FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "anon read" ON public.service_staff FOR SELECT TO anon USING (true);
CREATE POLICY "tenant read" ON public.service_staff FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "tenant manage" ON public.service_staff FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "tenant read" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "tenant manage" ON public.stock_movements FOR ALL TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id)) WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

-- bookings: customer sees own, staff sees own, members see salon
CREATE POLICY "booking read" ON public.bookings FOR SELECT TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "booking insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (
  public.is_salon_member(auth.uid(), salon_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "booking update" ON public.bookings FOR UPDATE TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
) WITH CHECK (
  public.is_salon_member(auth.uid(), salon_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "booking delete" ON public.bookings FOR DELETE TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "booking services read" ON public.booking_services FOR SELECT TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR booking_id IN (SELECT b.id FROM public.bookings b
                    JOIN public.customers c ON c.id = b.customer_id
                    WHERE c.user_id = auth.uid())
);
CREATE POLICY "booking services write" ON public.booking_services FOR ALL TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR booking_id IN (SELECT b.id FROM public.bookings b
                    JOIN public.customers c ON c.id = b.customer_id
                    WHERE c.user_id = auth.uid())
) WITH CHECK (
  public.is_salon_member(auth.uid(), salon_id)
  OR booking_id IN (SELECT b.id FROM public.bookings b
                    JOIN public.customers c ON c.id = b.customer_id
                    WHERE c.user_id = auth.uid())
);

-- invoices
CREATE POLICY "invoice read" ON public.invoices FOR SELECT TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "invoice write" ON public.invoices FOR ALL TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id)) WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

CREATE POLICY "payment read" ON public.invoice_payments FOR SELECT TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR invoice_id IN (SELECT i.id FROM public.invoices i
                    JOIN public.customers c ON c.id = i.customer_id
                    WHERE c.user_id = auth.uid())
);
CREATE POLICY "payment write" ON public.invoice_payments FOR ALL TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id)) WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

-- ledgers: read own, write by members only
CREATE POLICY "wallet read" ON public.wallet_transactions FOR SELECT TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "wallet write" ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

CREATE POLICY "loyalty read" ON public.loyalty_transactions FOR SELECT TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "loyalty write" ON public.loyalty_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

-- attendance / leaves / payslips
CREATE POLICY "attendance read" ON public.attendance FOR SELECT TO authenticated USING (
  public.is_salon_member(auth.uid(), salon_id)
);
CREATE POLICY "attendance self write" ON public.attendance FOR ALL TO authenticated USING (
  public.can_manage_salon(auth.uid(), salon_id)
  OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
) WITH CHECK (
  public.can_manage_salon(auth.uid(), salon_id)
  OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
);

CREATE POLICY "leaves read" ON public.leaves FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "leaves manage" ON public.leaves FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "payslip read" ON public.payslips FOR SELECT TO authenticated USING (
  public.can_manage_salon(auth.uid(), salon_id)
  OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
);
CREATE POLICY "payslip manage" ON public.payslips FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

-- coupons
CREATE POLICY "coupon read" ON public.coupons FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "coupon manage" ON public.coupons FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id)) WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));
CREATE POLICY "redemption read" ON public.coupon_redemptions FOR SELECT TO authenticated USING (public.is_salon_member(auth.uid(), salon_id));
CREATE POLICY "redemption write" ON public.coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

-- audit log: read by managers, insert by members, never updated/deleted
CREATE POLICY "audit read" ON public.audit_log FOR SELECT TO authenticated USING (public.can_manage_salon(auth.uid(), salon_id));
CREATE POLICY "audit insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_salon_member(auth.uid(), salon_id) AND user_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER t1 BEFORE UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t2 BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t3 BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t4 BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t5 BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t6 BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t7 BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t8 BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t9 BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t10 BEFORE UPDATE ON public.payslips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t11 BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t12 BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();