GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_salon_member(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_salon(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_salon_customer(uuid, uuid) TO anon, authenticated, service_role;