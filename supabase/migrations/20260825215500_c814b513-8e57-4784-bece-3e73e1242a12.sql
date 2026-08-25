DROP POLICY IF EXISTS "invoices_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "invoices_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "invoices_update_auth" ON storage.objects;
DROP POLICY IF EXISTS "invoices_delete_auth" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_access_invoice_object(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _salon uuid;
BEGIN
  BEGIN
    _salon := ((storage.foldername(_name))[1])::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  IF _salon IS NULL THEN
    RETURN false;
  END IF;
  RETURN public.can_manage_salon(auth.uid(), _salon);
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_invoice_object(text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_invoice_object(text) TO authenticated, service_role;

CREATE POLICY "invoices_select_members" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'invoices' AND public.can_access_invoice_object(name));

CREATE POLICY "invoices_insert_members" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices' AND public.can_access_invoice_object(name));

CREATE POLICY "invoices_update_members" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'invoices' AND public.can_access_invoice_object(name))
WITH CHECK (bucket_id = 'invoices' AND public.can_access_invoice_object(name));

CREATE POLICY "invoices_delete_members" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'invoices' AND public.can_access_invoice_object(name));