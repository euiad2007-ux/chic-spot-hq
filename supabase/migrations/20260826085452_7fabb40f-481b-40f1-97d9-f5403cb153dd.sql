-- 1) Trial plan with all modules
INSERT INTO public.platform_plans (code, name, price_monthly, max_branches, max_staff, max_services, max_customers, max_invoices, has_website, enabled_modules, is_active, sort_order)
VALUES (
  'trial',
  'الخطة التجريبية',
  0,
  3,
  10,
  120,
  1000,
  500,
  true,
  ARRAY['coupons','attendance','cash','reports','customers','users','services','branches','invoices','inventory','accounting','expenses','booking_settings','staff','bookings','activity_log','ledger','site_settings','branch_audit','calendar','pos','invoice_settings','assets','payroll'],
  false, -- hidden from public pricing page
  0
)
ON CONFLICT (code) DO UPDATE SET
  enabled_modules = EXCLUDED.enabled_modules,
  has_website = true,
  is_active = false;

-- 2) Auto-assign trial plan to every new salon
CREATE OR REPLACE FUNCTION public.create_salon(_name text, _slug text, _phone text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_id uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF EXISTS (SELECT 1 FROM public.salons WHERE owner_id = uid)
     OR EXISTS (SELECT 1 FROM public.salon_members WHERE user_id = uid AND role = 'salon_owner') THEN
    RAISE EXCEPTION 'لديك مشغل بالفعل — لا يمكن إنشاء مشغل جديد بنفس الحساب';
  END IF;
  INSERT INTO public.salons (name, slug, phone, owner_id, plan, subscription_status, trial_ends_at)
  VALUES (_name, lower(_slug), _phone, uid, 'trial', 'trial', now() + interval '30 days')
  RETURNING id INTO new_id;
  INSERT INTO public.branches (salon_id, name) VALUES (new_id, 'الفرع الرئيسي');
  INSERT INTO public.salon_members (user_id, salon_id, role) VALUES (uid, new_id, 'salon_owner');
  INSERT INTO public.salon_settings (salon_id) VALUES (new_id);
  PERFORM public.seed_chart_accounts(new_id);
  RETURN new_id;
END; $function$;

-- 3) Notify platform owner when a new customer registers in any salon
CREATE OR REPLACE FUNCTION public.notify_platform_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_salon_name text;
BEGIN
  SELECT name INTO v_salon_name FROM public.salons WHERE id = NEW.salon_id;
  INSERT INTO public.platform_notifications (salon_id, kind, title, body, meta)
  VALUES (
    NEW.salon_id,
    'new_customer',
    'عميل جديد: ' || NEW.name,
    'انضم العميل «' || NEW.name || '» إلى متجر «' || coalesce(v_salon_name, '—') || '»',
    jsonb_build_object('customer_id', NEW.id, 'customer_name', NEW.name, 'phone', NEW.phone, 'salon_name', v_salon_name)
  );
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_notify_new_customer ON public.customers;
CREATE TRIGGER trg_notify_new_customer
AFTER INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.notify_platform_new_customer();