CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE SET NULL,
  path text NOT NULL DEFAULT '/',
  session_key text,
  device text,
  os text,
  browser text,
  language text,
  country text,
  region text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.site_visits TO anon;
GRANT INSERT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can record a visit"
  ON public.site_visits FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "platform owner reads visits"
  ON public.site_visits FOR SELECT TO authenticated
  USING (public.is_platform_owner(auth.uid()));

GRANT SELECT ON public.site_visits TO authenticated;

CREATE INDEX site_visits_created_idx ON public.site_visits (created_at DESC);
CREATE INDEX site_visits_salon_idx ON public.site_visits (salon_id);

CREATE OR REPLACE FUNCTION public.platform_visits_overview(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from timestamptz := now() - (GREATEST(COALESCE(_days, 30), 1) || ' days')::interval;
  _out jsonb;
BEGIN
  IF NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_visits', (SELECT count(*) FROM site_visits WHERE created_at >= _from),
    'unique_visitors', (SELECT count(DISTINCT coalesce(session_key, id::text)) FROM site_visits WHERE created_at >= _from),
    'new_visitors', (
      SELECT count(*) FROM (
        SELECT session_key, min(created_at) AS first_seen
        FROM site_visits WHERE session_key IS NOT NULL
        GROUP BY session_key
      ) f WHERE f.first_seen >= _from
    ),
    'devices', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(device, 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT device, count(*) AS c FROM site_visits WHERE created_at >= _from GROUP BY device) d
    ),
    'browsers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(browser, 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT browser, count(*) AS c FROM site_visits WHERE created_at >= _from GROUP BY browser) b
    ),
    'systems', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(os, 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT os, count(*) AS c FROM site_visits WHERE created_at >= _from GROUP BY os) o
    ),
    'regions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(region, ''), coalesce(nullif(country, ''), 'غير معروف')), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT region, country, count(*) AS c FROM site_visits WHERE created_at >= _from GROUP BY region, country) r
    ),
    'pages', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', path, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT path, count(*) AS c FROM site_visits WHERE created_at >= _from GROUP BY path ORDER BY c DESC LIMIT 15) p
    ),
    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', c) ORDER BY day), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at)::date AS day, count(*) AS c FROM site_visits WHERE created_at >= _from GROUP BY 1) g
    )
  ) INTO _out;

  RETURN _out;
END;
$$;