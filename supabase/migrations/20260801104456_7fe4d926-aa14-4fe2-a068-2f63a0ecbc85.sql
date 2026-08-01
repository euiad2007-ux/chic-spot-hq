CREATE OR REPLACE FUNCTION public.public_salon_team(_salon uuid)
RETURNS TABLE (id uuid, name text, role_label text, job_title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.role_label, s.job_title
  FROM public.staff s
  WHERE s.salon_id = _salon AND s.active;
$$;
REVOKE ALL ON FUNCTION public.public_salon_team(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_salon_team(uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_platform_owner(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_salon_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_salon(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_salon_customer(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.guard_customer_self_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_wallet_tx() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_loyalty_tx() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_stock_movement() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_coupon_use() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_invoice_paid() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_invoice_number() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_booking_overlap() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.grant_platform_owner(text) FROM anon, public;