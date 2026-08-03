-- salons: anon may read only public identity columns
REVOKE SELECT ON public.salons FROM anon;
GRANT SELECT (id, name, slug, is_suspended, custom_domain, domain_status, created_at) ON public.salons TO anon;

-- salon_settings: anon may read only the public site branding document
REVOKE SELECT ON public.salon_settings FROM anon;
GRANT SELECT (salon_id, site) ON public.salon_settings TO anon;

-- branches: anon may read only non-sensitive public columns
REVOKE SELECT ON public.branches FROM anon;
GRANT SELECT (id, salon_id, name, address, active) ON public.branches TO anon;

-- service_staff: no public need for internal assignment mapping
REVOKE SELECT ON public.service_staff FROM anon;
DROP POLICY IF EXISTS "anon read" ON public.service_staff;