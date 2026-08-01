-- lock internal helpers away from anonymous callers
REVOKE EXECUTE ON FUNCTION public.is_platform_owner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_salon_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_salon(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_salon(text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_salon(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_salon_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_salon(uuid, uuid) TO authenticated;

-- legacy transition cache: signed-in users only, no anonymous writes
DROP POLICY IF EXISTS "app_state insertable" ON public.app_state;
DROP POLICY IF EXISTS "app_state updatable" ON public.app_state;
DROP POLICY IF EXISTS "app_state readable" ON public.app_state;
CREATE POLICY "app_state auth read" ON public.app_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_state auth insert" ON public.app_state FOR INSERT TO authenticated WITH CHECK (key = 'salon:' || auth.uid()::text);
CREATE POLICY "app_state auth update" ON public.app_state FOR UPDATE TO authenticated
  USING (key = 'salon:' || auth.uid()::text) WITH CHECK (key = 'salon:' || auth.uid()::text);
REVOKE ALL ON public.app_state FROM anon;