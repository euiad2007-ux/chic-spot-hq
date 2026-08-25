REVOKE EXECUTE ON FUNCTION public.create_staff_invite(uuid, text, text, uuid, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_staff_invite(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_client_profile(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_salon(text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_staff_invite(uuid, text, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_staff_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_client_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_salon(text, text, text) TO authenticated;