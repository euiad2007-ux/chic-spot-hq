ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS notification_events_customer_idx
  ON public.notification_events (customer_id, created_at DESC);

DROP POLICY IF EXISTS "Clients can view own notifications" ON public.notification_events;
CREATE POLICY "Clients can view own notifications"
ON public.notification_events FOR SELECT TO authenticated
USING (
  customer_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = notification_events.customer_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can mark own notifications read" ON public.notification_events;
CREATE POLICY "Clients can mark own notifications read"
ON public.notification_events FOR UPDATE TO authenticated
USING (
  customer_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = notification_events.customer_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = notification_events.customer_id AND c.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.notify_client_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT name INTO v_name FROM public.salons WHERE id = NEW.salon_id;
  INSERT INTO public.notification_events
    (salon_id, branch_id, booking_id, customer_id, kind, channel, status, title, body, sent_at, meta)
  VALUES (
    NEW.salon_id, NEW.branch_id, NEW.id, NEW.customer_id,
    'booking_created', 'inapp', 'sent',
    'تم تسجيل حجزك',
    'حجزك في ' || COALESCE(v_name, 'المتجر') || ' بتاريخ ' ||
      to_char(NEW.starts_at, 'YYYY-MM-DD HH24:MI') || ' — الإجمالي ' ||
      to_char(COALESCE(NEW.price, 0), 'FM999999990.00') || ' ر.س',
    now(),
    jsonb_build_object('booking_code', NEW.code, 'price', NEW.price)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_booking ON public.bookings;
CREATE TRIGGER trg_notify_client_booking
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_client_booking_created();

CREATE OR REPLACE FUNCTION public.notify_client_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer uuid;
  v_branch uuid;
  v_number text;
BEGIN
  SELECT customer_id, branch_id, number INTO v_customer, v_branch, v_number
  FROM public.invoices WHERE id = NEW.invoice_id;
  IF v_customer IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notification_events
    (salon_id, branch_id, customer_id, kind, channel, status, title, body, sent_at, meta)
  VALUES (
    NEW.salon_id, v_branch, v_customer,
    CASE WHEN NEW.is_refund THEN 'payment_refunded' ELSE 'payment_received' END,
    'inapp', 'sent',
    CASE WHEN NEW.is_refund THEN 'تم استرداد مبلغ' ELSE 'تم استلام دفعتك' END,
    'المبلغ ' || to_char(COALESCE(NEW.amount, 0), 'FM999999990.00') || ' ر.س على الفاتورة ' ||
      COALESCE(v_number, '—'),
    now(),
    jsonb_build_object('invoice_id', NEW.invoice_id, 'method', NEW.method, 'amount', NEW.amount)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_payment ON public.invoice_payments;
CREATE TRIGGER trg_notify_client_payment
AFTER INSERT ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.notify_client_payment();