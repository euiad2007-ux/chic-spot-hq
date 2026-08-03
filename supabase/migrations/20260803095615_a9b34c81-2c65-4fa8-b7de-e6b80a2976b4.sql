REVOKE EXECUTE ON FUNCTION public.post_accounting_period(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unpost_accounting_period(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_stocktake(uuid) FROM anon;