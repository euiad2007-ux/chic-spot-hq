UPDATE public.platform_plans
SET enabled_modules = ARRAY(
  SELECT DISTINCT m FROM unnest(
    coalesce(enabled_modules, ARRAY[]::text[]) ||
    ARRAY['ledger','branches','invoice_settings','activity_log','branch_audit','site_settings']::text[]
  ) AS m
),
updated_at = now();