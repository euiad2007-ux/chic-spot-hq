DROP POLICY IF EXISTS "public branches read" ON public.branches;
REVOKE ALL ON public.branches FROM anon;