DROP VIEW IF EXISTS public.staff_directory;

CREATE OR REPLACE FUNCTION public.salon_staff_directory(_salon uuid)
RETURNS TABLE (
  id uuid,
  salon_id uuid,
  branch_id uuid,
  name text,
  job_title text,
  role_label text,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.salon_id, s.branch_id, s.name, s.job_title, s.role_label, s.active
  FROM public.staff s
  WHERE s.salon_id = _salon
    AND s.active
    AND (
      public.is_salon_member(auth.uid(), _salon)
      OR public.is_salon_customer(auth.uid(), _salon)
    );
$$;

REVOKE ALL ON FUNCTION public.salon_staff_directory(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salon_staff_directory(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.salon_staff_directory(uuid) TO authenticated;