-- 1) منع تصعيد الصلاحيات على salon_members
CREATE OR REPLACE FUNCTION public.guard_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  -- عمليات النظام (بدون مستخدم) مثل create_salon تمر كما هي
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF public.is_platform_owner(_uid) THEN RETURN NEW; END IF;

  IF NEW.role = 'platform_owner' THEN
    RAISE EXCEPTION 'لا يمكن إسناد دور مالك المنصة';
  END IF;

  IF NEW.role = 'salon_owner'
     AND NOT public.is_salon_owner(_uid, NEW.salon_id) THEN
    RAISE EXCEPTION 'إسناد دور مالك المشغل متاح لمالك المشغل فقط';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_member_role_ins ON public.salon_members;
CREATE TRIGGER guard_member_role_ins
BEFORE INSERT ON public.salon_members
FOR EACH ROW EXECUTE FUNCTION public.guard_member_role();

DROP TRIGGER IF EXISTS guard_member_role_upd ON public.salon_members;
CREATE TRIGGER guard_member_role_upd
BEFORE UPDATE ON public.salon_members
FOR EACH ROW EXECUTE FUNCTION public.guard_member_role();

-- 2) إزالة القراءة العامة الشاملة لجدول الخدمات
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'services'
      AND ('anon' = ANY(roles) OR roles = '{public}')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.services', p.policyname);
  END LOOP;
END $$;

REVOKE SELECT ON public.services FROM anon;

-- 3) قراءة عامة محدودة الحقول لمشغل واحد
CREATE OR REPLACE FUNCTION public.public_salon_services(_salon uuid)
RETURNS TABLE(id uuid, name text, category text, price numeric, duration_min integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.category, s.price, s.duration_min
  FROM public.services s
  JOIN public.salons sa ON sa.id = s.salon_id AND sa.is_suspended = false
  WHERE s.salon_id = _salon AND s.active
  ORDER BY s.category NULLS LAST, s.name;
$$;

GRANT EXECUTE ON FUNCTION public.public_salon_services(uuid) TO anon, authenticated;