ALTER TABLE public.platform_notifications
  DROP CONSTRAINT IF EXISTS platform_notifications_kind_check;

ALTER TABLE public.platform_notifications
  ADD CONSTRAINT platform_notifications_kind_check
  CHECK (kind IN ('subscription_expiring', 'subscription_expired', 'new_customer'));