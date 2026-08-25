ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS manager_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS maps_url text,
  ADD COLUMN IF NOT EXISTS hours text;

CREATE OR REPLACE FUNCTION public.public_salon_branches(_salon uuid)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  whatsapp text,
  email text,
  address text,
  lat numeric,
  lng numeric,
  maps_url text,
  hours text,
  manager_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.phone, b.whatsapp, b.email, b.address, b.lat, b.lng,
         b.maps_url, b.hours, s.name AS manager_name
  FROM public.branches b
  LEFT JOIN public.staff s ON s.id = b.manager_staff_id
  WHERE b.salon_id = _salon AND b.active
  ORDER BY b.created_at
$$;

GRANT EXECUTE ON FUNCTION public.public_salon_branches(uuid) TO anon, authenticated, service_role;