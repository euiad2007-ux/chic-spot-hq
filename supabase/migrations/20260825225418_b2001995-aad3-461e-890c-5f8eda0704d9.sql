REVOKE ALL ON FUNCTION public.enforce_invoice_plan_limit() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_subscription_invoice_paid() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.platform_salons_overview() FROM anon;
