DROP VIEW IF EXISTS public.public_salons;
DROP VIEW IF EXISTS public.public_salon_settings;

CREATE OR REPLACE FUNCTION public.public_salon_lookup(_slug text DEFAULT NULL, _domains text[] DEFAULT NULL)
RETURNS TABLE(id uuid, name text, slug text, custom_domain text, domain_status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.slug, s.custom_domain, s.domain_status
  FROM public.salons s
  WHERE s.is_suspended = false
    AND (
      (_slug IS NOT NULL AND s.slug = lower(_slug))
      OR (_domains IS NOT NULL AND s.custom_domain = ANY(_domains))
      OR (_slug IS NULL AND _domains IS NULL)
    )
  ORDER BY s.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_salon_site(_salon uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT st.site
  FROM public.salon_settings st
  JOIN public.salons s ON s.id = st.salon_id AND s.is_suspended = false
  WHERE st.salon_id = _salon;
$$;

GRANT EXECUTE ON FUNCTION public.public_salon_lookup(text, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_salon_site(uuid) TO anon, authenticated;