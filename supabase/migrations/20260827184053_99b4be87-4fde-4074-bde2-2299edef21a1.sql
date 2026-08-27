CREATE OR REPLACE FUNCTION public.enforce_salon_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_salon uuid;
  plan_code text;
  v_suspended boolean;
  v_status text;
  v_ends_at timestamptz;
  plan_limit integer;
  current_count integer;
BEGIN
  target_salon := NEW.salon_id;
  IF target_salon IS NULL THEN RETURN NEW; END IF;

  SELECT s.plan, s.is_suspended, s.subscription_status, s.subscription_ends_at
    INTO plan_code, v_suspended, v_status, v_ends_at
  FROM public.salons s WHERE s.id = target_salon;

  IF v_suspended THEN
    RAISE EXCEPTION 'المتجر موقوف مؤقتًا';
  END IF;
  IF v_ends_at IS NOT NULL AND v_ends_at < now() THEN
    RAISE EXCEPTION 'انتهى اشتراك المتجر';
  END IF;
  IF v_status IS NOT NULL AND v_status NOT IN ('active', 'trial') THEN
    RAISE EXCEPTION 'اشتراك المتجر غير نشط';
  END IF;

  -- No plan attached yet: allow the merchant to work normally.
  IF plan_code IS NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'branches' THEN
    SELECT p.max_branches INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code;
    SELECT count(*) INTO current_count FROM public.branches x WHERE x.salon_id = target_salon;
  ELSIF TG_TABLE_NAME = 'staff' THEN
    SELECT p.max_staff INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code;
    SELECT count(*) INTO current_count FROM public.staff x WHERE x.salon_id = target_salon;
  ELSIF TG_TABLE_NAME = 'services' THEN
    SELECT p.max_services INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code;
    SELECT count(*) INTO current_count FROM public.services x WHERE x.salon_id = target_salon;
  ELSIF TG_TABLE_NAME = 'customers' THEN
    SELECT p.max_customers INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code;
    SELECT count(*) INTO current_count FROM public.customers x WHERE x.salon_id = target_salon;
  ELSE
    RETURN NEW;
  END IF;

  -- Unknown plan row or unlimited quota: allow.
  IF plan_limit IS NULL OR plan_limit <= 0 THEN RETURN NEW; END IF;

  IF current_count >= plan_limit THEN
    RAISE EXCEPTION 'تم الوصول إلى الحد الأقصى المسموح به في الباقة';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_salon_plan_limit() FROM public, anon, authenticated;

-- Invoice limit: ignore the "hidden from pricing page" flag too.
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

  SELECT p.max_invoices INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code;
  IF plan_limit IS NULL OR plan_limit <= 0 THEN RETURN NEW; END IF;

  SELECT count(*) INTO current_count
  FROM public.invoices i
  WHERE i.salon_id = NEW.salon_id AND i.created_at >= date_trunc('month', now());

  IF current_count >= plan_limit THEN
    RAISE EXCEPTION 'تم الوصول إلى الحد الشهري لعدد الفواتير في الباقة';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_invoice_plan_limit() FROM public, anon, authenticated;