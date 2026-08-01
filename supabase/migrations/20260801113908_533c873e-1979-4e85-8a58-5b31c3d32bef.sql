ALTER TABLE public.platform_plans
  ADD COLUMN IF NOT EXISTS max_customers integer NOT NULL DEFAULT 100;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS custom_domain text;

CREATE UNIQUE INDEX IF NOT EXISTS salons_custom_domain_unique
  ON public.salons (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;

ALTER TABLE public.platform_plans
  ADD CONSTRAINT platform_plans_limits_nonnegative
  CHECK (max_branches >= 0 AND max_staff >= 0 AND max_services >= 0 AND max_customers >= 0);

ALTER TABLE public.salons
  ADD CONSTRAINT salons_custom_domain_format
  CHECK (
    custom_domain IS NULL OR custom_domain ~ '^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  );

CREATE OR REPLACE FUNCTION public.enforce_salon_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_salon uuid;
  plan_code text;
  plan_limit integer;
  current_count integer;
  is_suspended boolean;
  subscription_status text;
  subscription_ends_at timestamptz;
BEGIN
  target_salon := NEW.salon_id;

  IF public.is_platform_owner(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT s.plan, s.is_suspended, s.subscription_status, s.subscription_ends_at
    INTO plan_code, is_suspended, subscription_status, subscription_ends_at
  FROM public.salons s
  WHERE s.id = target_salon;

  IF plan_code IS NULL THEN
    RAISE EXCEPTION 'لا توجد باقة مرتبطة بالمتجر';
  END IF;
  IF is_suspended THEN
    RAISE EXCEPTION 'المتجر موقوف مؤقتًا';
  END IF;
  IF subscription_status NOT IN ('active', 'trial') THEN
    RAISE EXCEPTION 'اشتراك المتجر غير نشط';
  END IF;
  IF subscription_ends_at IS NOT NULL AND subscription_ends_at < now() THEN
    RAISE EXCEPTION 'انتهى اشتراك المتجر';
  END IF;

  IF TG_TABLE_NAME = 'branches' THEN
    SELECT p.max_branches INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code AND p.is_active;
    SELECT count(*) INTO current_count FROM public.branches x WHERE x.salon_id = target_salon;
  ELSIF TG_TABLE_NAME = 'staff' THEN
    SELECT p.max_staff INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code AND p.is_active;
    SELECT count(*) INTO current_count FROM public.staff x WHERE x.salon_id = target_salon;
  ELSIF TG_TABLE_NAME = 'services' THEN
    SELECT p.max_services INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code AND p.is_active;
    SELECT count(*) INTO current_count FROM public.services x WHERE x.salon_id = target_salon;
  ELSIF TG_TABLE_NAME = 'customers' THEN
    SELECT p.max_customers INTO plan_limit FROM public.platform_plans p WHERE p.code = plan_code AND p.is_active;
    SELECT count(*) INTO current_count FROM public.customers x WHERE x.salon_id = target_salon;
  ELSE
    RETURN NEW;
  END IF;

  IF plan_limit IS NULL THEN
    RAISE EXCEPTION 'الباقة غير موجودة أو غير مفعلة';
  END IF;
  IF current_count >= plan_limit THEN
    RAISE EXCEPTION 'تم الوصول إلى الحد الأقصى المسموح به في الباقة';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_branch_plan_limit ON public.branches;
CREATE TRIGGER enforce_branch_plan_limit
BEFORE INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_limit();

DROP TRIGGER IF EXISTS enforce_staff_plan_limit ON public.staff;
CREATE TRIGGER enforce_staff_plan_limit
BEFORE INSERT ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_limit();

DROP TRIGGER IF EXISTS enforce_service_plan_limit ON public.services;
CREATE TRIGGER enforce_service_plan_limit
BEFORE INSERT ON public.services
FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_limit();

DROP TRIGGER IF EXISTS enforce_customer_plan_limit ON public.customers;
CREATE TRIGGER enforce_customer_plan_limit
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_limit();