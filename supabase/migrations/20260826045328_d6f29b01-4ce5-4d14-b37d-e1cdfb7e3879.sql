CREATE TABLE public.platform_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  due_at timestamptz,
  read_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_notifications_kind_check CHECK (kind IN ('subscription_expiring', 'subscription_expired'))
);

GRANT SELECT, UPDATE ON public.platform_notifications TO authenticated;
GRANT ALL ON public.platform_notifications TO service_role;

ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners view notifications"
ON public.platform_notifications
FOR SELECT
TO authenticated
USING (public.is_platform_owner(auth.uid()));

CREATE POLICY "Platform owners update notifications"
ON public.platform_notifications
FOR UPDATE
TO authenticated
USING (public.is_platform_owner(auth.uid()))
WITH CHECK (public.is_platform_owner(auth.uid()));

CREATE UNIQUE INDEX platform_notifications_subscription_stage_uidx
ON public.platform_notifications (salon_id, kind, (meta->>'stage'))
WHERE kind IN ('subscription_expiring', 'subscription_expired');

CREATE INDEX platform_notifications_owner_feed_idx
ON public.platform_notifications (read_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.refresh_subscription_expiry_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  INSERT INTO public.platform_notifications (salon_id, kind, title, body, due_at, meta)
  SELECT
    s.id,
    CASE WHEN s.subscription_ends_at < now() THEN 'subscription_expired' ELSE 'subscription_expiring' END,
    CASE WHEN s.subscription_ends_at < now()
      THEN 'انتهى اشتراك متجر ' || s.name
      ELSE 'اشتراك متجر ' || s.name || ' يقترب من الانتهاء'
    END,
    CASE WHEN s.subscription_ends_at < now()
      THEN 'انتهى الاشتراك بتاريخ ' || to_char(s.subscription_ends_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD')
      ELSE 'متبقي ' || greatest(0, ceil(extract(epoch FROM (s.subscription_ends_at - now())) / 86400.0)::integer) || ' يوم على انتهاء الاشتراك.'
    END,
    s.subscription_ends_at,
    jsonb_build_object(
      'stage', CASE
        WHEN s.subscription_ends_at < now() THEN 'expired'
        WHEN s.subscription_ends_at <= now() + interval '1 day' THEN '1'
        WHEN s.subscription_ends_at <= now() + interval '3 days' THEN '3'
        WHEN s.subscription_ends_at <= now() + interval '7 days' THEN '7'
        WHEN s.subscription_ends_at <= now() + interval '14 days' THEN '14'
        ELSE '30'
      END,
      'salon_name', s.name,
      'plan', s.plan
    )
  FROM public.salons s
  WHERE s.subscription_ends_at IS NOT NULL
    AND s.subscription_ends_at <= now() + interval '30 days'
    AND s.subscription_status <> 'canceled'
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_subscription_expiry_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_subscription_expiry_notifications() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-subscription-expiry-notifications') THEN
    PERFORM cron.schedule(
      'daily-subscription-expiry-notifications',
      '15 5 * * *',
      'SELECT public.refresh_subscription_expiry_notifications()'
    );
  END IF;
END;
$$;

CREATE POLICY "Platform owners view all audit entries"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.is_platform_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_platform_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_before jsonb;
  row_after jsonb;
  target_salon uuid;
  target_id uuid;
BEGIN
  row_before := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  row_after := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;

  IF TG_TABLE_NAME = 'salons' THEN
    target_salon := COALESCE((row_after->>'id')::uuid, (row_before->>'id')::uuid);
  ELSE
    target_salon := COALESCE((row_after->>'salon_id')::uuid, (row_before->>'salon_id')::uuid);
  END IF;

  IF COALESCE(row_after->>'id', row_before->>'id') ~* '^[0-9a-f-]{36}$' THEN
    target_id := COALESCE((row_after->>'id')::uuid, (row_before->>'id')::uuid);
  END IF;

  INSERT INTO public.audit_log (salon_id, user_id, action, entity, entity_id, before, after)
  VALUES (target_salon, auth.uid(), lower(TG_OP), TG_TABLE_NAME, target_id, row_before, row_after);

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.log_platform_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_platform_change() TO service_role;

CREATE TRIGGER audit_platform_salons
AFTER INSERT OR UPDATE OR DELETE ON public.salons
FOR EACH ROW EXECUTE FUNCTION public.log_platform_change();

CREATE TRIGGER audit_platform_plans
AFTER INSERT OR UPDATE OR DELETE ON public.platform_plans
FOR EACH ROW EXECUTE FUNCTION public.log_platform_change();

CREATE TRIGGER audit_platform_subscription_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_platform_change();

CREATE TRIGGER audit_platform_subscription_payments
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.log_platform_change();

CREATE TRIGGER audit_platform_settings
AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.log_platform_change();