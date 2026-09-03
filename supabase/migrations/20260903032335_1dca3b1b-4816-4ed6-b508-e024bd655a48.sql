CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  role_label text,
  device text,
  os text,
  browser text,
  language text,
  country text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users record own login"
  ON public.login_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "salon managers read logins"
  ON public.login_events FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_owner(auth.uid())
    OR (salon_id IS NOT NULL AND public.can_manage_salon(auth.uid(), salon_id))
  );

CREATE INDEX IF NOT EXISTS login_events_created_idx ON public.login_events (created_at DESC);
CREATE INDEX IF NOT EXISTS login_events_salon_idx ON public.login_events (salon_id);

CREATE OR REPLACE FUNCTION public.salon_analytics_overview(_salon uuid, _days integer DEFAULT 30)
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
  IF NOT (public.can_manage_salon(auth.uid(), _salon) OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_visits', (SELECT count(*) FROM site_visits WHERE salon_id = _salon AND created_at >= _from),
    'unique_visitors', (SELECT count(DISTINCT coalesce(session_key, id::text)) FROM site_visits WHERE salon_id = _salon AND created_at >= _from),
    'new_visitors', (
      SELECT count(*) FROM (
        SELECT session_key, min(created_at) AS first_seen
        FROM site_visits WHERE salon_id = _salon AND session_key IS NOT NULL
        GROUP BY session_key
      ) f WHERE f.first_seen >= _from
    ),
    'total_logins', (SELECT count(*) FROM login_events WHERE salon_id = _salon AND created_at >= _from),
    'login_users', (SELECT count(DISTINCT user_id) FROM login_events WHERE salon_id = _salon AND created_at >= _from),
    'devices', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(device,''), 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT device, count(*) AS c FROM site_visits WHERE salon_id = _salon AND created_at >= _from GROUP BY device) d
    ),
    'browsers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(browser,''), 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT browser, count(*) AS c FROM site_visits WHERE salon_id = _salon AND created_at >= _from GROUP BY browser) b
    ),
    'systems', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(os,''), 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT os, count(*) AS c FROM site_visits WHERE salon_id = _salon AND created_at >= _from GROUP BY os) o
    ),
    'regions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(region, ''), nullif(country, ''), 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT region, country, count(*) AS c FROM site_visits WHERE salon_id = _salon AND created_at >= _from GROUP BY region, country) r
    ),
    'pages', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', path, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT path, count(*) AS c FROM site_visits WHERE salon_id = _salon AND created_at >= _from GROUP BY path ORDER BY c DESC LIMIT 15) p
    ),
    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', c) ORDER BY day), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at)::date AS day, count(*) AS c FROM site_visits WHERE salon_id = _salon AND created_at >= _from GROUP BY 1) g
    ),
    'login_daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', c) ORDER BY day), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at)::date AS day, count(*) AS c FROM login_events WHERE salon_id = _salon AND created_at >= _from GROUP BY 1) lg
    ),
    'login_roles', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(role_label,''), 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT role_label, count(*) AS c FROM login_events WHERE salon_id = _salon AND created_at >= _from GROUP BY role_label) lr
    ),
    'login_regions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(region,''), nullif(country,''), 'غير معروف'), 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT region, country, count(*) AS c FROM login_events WHERE salon_id = _salon AND created_at >= _from GROUP BY region, country) lz
    ),
    'recent_logins', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'email', email, 'role', role_label, 'device', device, 'browser', browser,
        'region', coalesce(nullif(region,''), nullif(country,'')), 'at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM login_events WHERE salon_id = _salon AND created_at >= _from ORDER BY created_at DESC LIMIT 30) rl
    )
  ) INTO _out;

  RETURN _out;
END;
$$;