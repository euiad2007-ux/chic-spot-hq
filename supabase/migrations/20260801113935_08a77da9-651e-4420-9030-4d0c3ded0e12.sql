ALTER TABLE public.platform_plans
  ADD COLUMN IF NOT EXISTS enabled_modules text[] NOT NULL DEFAULT ARRAY['bookings','calendar','services','inventory','staff','payroll','attendance','customers','coupons','invoices','booking_settings','site_settings']::text[];

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS domain_status text NOT NULL DEFAULT 'not_configured';

ALTER TABLE public.salons
  ADD CONSTRAINT salons_domain_status_valid
  CHECK (domain_status IN ('not_configured', 'pending', 'verified', 'failed'));

UPDATE public.salons
SET domain_status = CASE WHEN custom_domain IS NULL THEN 'not_configured' ELSE 'pending' END
WHERE domain_status = 'not_configured';