-- 1) BOOKINGS: keep customer UPDATE but guard financial/status columns with a trigger
CREATE OR REPLACE FUNCTION public.guard_customer_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Salon staff/owners keep full control.
  IF public.is_salon_member(auth.uid(), NEW.salon_id) THEN
    RETURN NEW;
  END IF;

  -- Anything else here is the booking's own customer (RLS already checked that).
  -- Server-controlled fields must stay untouched.
  NEW.salon_id          := OLD.salon_id;
  NEW.branch_id         := OLD.branch_id;
  NEW.code              := OLD.code;
  NEW.global_no         := OLD.global_no;
  NEW.branch_no         := OLD.branch_no;
  NEW.daily_no          := OLD.daily_no;
  NEW.customer_id       := OLD.customer_id;
  NEW.price             := OLD.price;
  NEW.discount          := OLD.discount;
  NEW.coupon_code       := OLD.coupon_code;
  NEW.coupon_discount   := OLD.coupon_discount;
  NEW.wallet_used       := OLD.wallet_used;
  NEW.wallet_approved   := OLD.wallet_approved;
  NEW.payment_method    := OLD.payment_method;
  NEW.pay_status        := OLD.pay_status;
  NEW.hold_expires_at   := OLD.hold_expires_at;
  NEW.stock_deducted    := OLD.stock_deducted;
  NEW.created_by        := OLD.created_by;
  NEW.created_at        := OLD.created_at;

  -- A customer may only cancel; every other status change is rejected.
  IF NEW.status <> OLD.status AND NEW.status <> 'cancelled'::booking_status THEN
    RAISE EXCEPTION 'لا يمكن تغيير حالة الحجز';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_booking_update ON public.bookings;
CREATE TRIGGER guard_customer_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_booking_update();

-- 2) INVOICES / PAYMENTS: customers can read but never write directly.
DROP POLICY IF EXISTS "customer invoice insert" ON public.invoices;
DROP POLICY IF EXISTS "customer payment insert" ON public.invoice_payments;

-- 3) STAFF: stop exposing employee PII to customers; expose a safe directory view.
DROP POLICY IF EXISTS "customer staff read" ON public.staff;

CREATE OR REPLACE VIEW public.staff_directory
WITH (security_invoker = false)
AS
SELECT s.id, s.salon_id, s.branch_id, s.name, s.job_title, s.role_label, s.active
FROM public.staff s
WHERE s.active
  AND (
    public.is_salon_member(auth.uid(), s.salon_id)
    OR public.is_salon_customer(auth.uid(), s.salon_id)
  );

GRANT SELECT ON public.staff_directory TO authenticated;