-- Subscription plans catalogue
CREATE TABLE public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  max_branches integer NOT NULL DEFAULT 1,
  max_staff integer NOT NULL DEFAULT 5,
  max_services integer NOT NULL DEFAULT 30,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_plans TO authenticated;
GRANT ALL ON public.platform_plans TO service_role;

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active plans are public" ON public.platform_plans
  FOR SELECT USING (is_active OR public.is_platform_owner(auth.uid()));

CREATE POLICY "platform owner manages plans" ON public.platform_plans
  FOR ALL TO authenticated
  USING (public.is_platform_owner(auth.uid()))
  WITH CHECK (public.is_platform_owner(auth.uid()));

CREATE TRIGGER platform_plans_updated_at
  BEFORE UPDATE ON public.platform_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_plans (code, name, price_monthly, max_branches, max_staff, max_services, features, sort_order) VALUES
  ('basic', 'الباقة الأساسية', 149, 1, 5, 30, ARRAY['فرع واحد','حجوزات وفواتير','تقارير أساسية'], 1),
  ('pro', 'الباقة الاحترافية', 349, 3, 20, 120, ARRAY['حتى 3 فروع','مخزون ورواتب','حضور بالموقع الجغرافي','كوبونات ونقاط ولاء'], 2),
  ('enterprise', 'باقة المؤسسات', 799, 20, 200, 1000, ARRAY['فروع غير محدودة عمليًا','جميع المزايا','دعم مخصص','تقارير متقدمة'], 3);

-- Subscription bookkeeping on the tenant
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Platform owner full control over tenants
CREATE POLICY "platform owner manages salons" ON public.salons
  FOR ALL TO authenticated
  USING (public.is_platform_owner(auth.uid()))
  WITH CHECK (public.is_platform_owner(auth.uid()));

-- Bootstrap: the very first platform owner (works only while none exists)
CREATE OR REPLACE FUNCTION public.claim_platform_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.salon_members WHERE role = 'platform_owner') THEN
    RETURN false;
  END IF;
  INSERT INTO public.salon_members (user_id, salon_id, branch_id, role)
  VALUES (_uid, NULL, NULL, 'platform_owner');
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_platform_owner() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_platform_owner() TO authenticated;

-- Existing platform owner promotes another user by email
CREATE OR REPLACE FUNCTION public.grant_platform_owner(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _target uuid;
BEGIN
  IF NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO _target FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _target IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  INSERT INTO public.salon_members (user_id, salon_id, branch_id, role)
  VALUES (_target, NULL, NULL, 'platform_owner')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_platform_owner(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.grant_platform_owner(text) TO authenticated;