CREATE OR REPLACE FUNCTION public.can_access_branch(_uid uuid, _salon uuid, _branch uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_owner(_uid)
    OR EXISTS (
      SELECT 1 FROM public.salon_members m
      WHERE m.user_id = _uid
        AND m.salon_id = _salon
        AND (
          m.role IN ('salon_owner', 'platform_owner')
          OR m.branch_id IS NULL
          OR _branch IS NULL
          OR m.branch_id = _branch
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = _uid AND c.salon_id = _salon
    )
$$;

DROP POLICY IF EXISTS "services branch scope" ON public.services;
CREATE POLICY "services branch scope" ON public.services
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_access_branch(auth.uid(), salon_id, branch_id))
  WITH CHECK (public.can_access_branch(auth.uid(), salon_id, branch_id));

DROP POLICY IF EXISTS "invoices branch scope" ON public.invoices;
CREATE POLICY "invoices branch scope" ON public.invoices
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_access_branch(auth.uid(), salon_id, branch_id))
  WITH CHECK (public.can_access_branch(auth.uid(), salon_id, branch_id));

DROP POLICY IF EXISTS "invoice items branch scope" ON public.invoice_items;
CREATE POLICY "invoice items branch scope" ON public.invoice_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND public.can_access_branch(auth.uid(), i.salon_id, i.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND public.can_access_branch(auth.uid(), i.salon_id, i.branch_id)
  ));

DROP POLICY IF EXISTS "invoice payments branch scope" ON public.invoice_payments;
CREATE POLICY "invoice payments branch scope" ON public.invoice_payments
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND public.can_access_branch(auth.uid(), i.salon_id, i.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND public.can_access_branch(auth.uid(), i.salon_id, i.branch_id)
  ));