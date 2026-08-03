-- Public storefront reads go through narrow views instead of full-table anon policies
DROP POLICY IF EXISTS "public salon read" ON public.salons;
DROP POLICY IF EXISTS "public settings read" ON public.salon_settings;
REVOKE ALL ON public.salons FROM anon;
REVOKE ALL ON public.salon_settings FROM anon;

CREATE OR REPLACE VIEW public.public_salons AS
  SELECT id, name, slug, custom_domain, domain_status, is_suspended, created_at
  FROM public.salons
  WHERE is_suspended = false;
GRANT SELECT ON public.public_salons TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_salon_settings AS
  SELECT s.salon_id, s.site
  FROM public.salon_settings s
  JOIN public.salons sa ON sa.id = s.salon_id AND sa.is_suspended = false;
GRANT SELECT ON public.public_salon_settings TO anon, authenticated;

-- Customers may only spend loyalty points, never award themselves points
DROP POLICY IF EXISTS "customer loyalty insert" ON public.loyalty_transactions;
CREATE POLICY "customer loyalty spend" ON public.loyalty_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    points < 0
    AND customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
  );

-- Customers may only debit their own wallet, never credit it or touch another wallet
DROP POLICY IF EXISTS "customer wallet insert" ON public.wallet_transactions;
CREATE POLICY "customer wallet spend" ON public.wallet_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    amount < 0
    AND customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
  );