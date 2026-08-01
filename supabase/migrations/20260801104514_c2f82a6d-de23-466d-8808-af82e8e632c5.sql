REVOKE EXECUTE ON FUNCTION public.create_salon(text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_platform_owner() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_client_profile() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_salon(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_platform_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_client_profile() TO authenticated;