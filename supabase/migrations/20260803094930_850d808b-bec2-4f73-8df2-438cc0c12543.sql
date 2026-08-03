DROP POLICY IF EXISTS "customer loyalty spend" ON public.loyalty_transactions;

CREATE POLICY "customer loyalty own rows" ON public.loyalty_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
    AND (
      points < 0
      OR (invoice_id IS NOT NULL AND invoice_id IN (
            SELECT i.id FROM public.invoices i
            WHERE i.customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
          ))
    )
  );

CREATE OR REPLACE FUNCTION public.cap_loyalty_award()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _total numeric;
BEGIN
  IF NEW.points <= 0 THEN RETURN NEW; END IF;
  IF public.is_salon_member(auth.uid(), NEW.salon_id) THEN RETURN NEW; END IF;
  IF NEW.invoice_id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن إضافة نقاط بدون فاتورة';
  END IF;
  SELECT total INTO _total FROM public.invoices WHERE id = NEW.invoice_id;
  IF _total IS NULL OR NEW.points > _total THEN
    RAISE EXCEPTION 'قيمة النقاط تتجاوز الحد المسموح للفاتورة';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS cap_loyalty_award_trg ON public.loyalty_transactions;
CREATE TRIGGER cap_loyalty_award_trg
  BEFORE INSERT ON public.loyalty_transactions
  FOR EACH ROW EXECUTE FUNCTION public.cap_loyalty_award();