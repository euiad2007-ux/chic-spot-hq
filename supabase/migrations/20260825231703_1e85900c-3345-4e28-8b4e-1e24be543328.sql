ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS reminder_error text;

ALTER TABLE public.staff_invites
  ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email_error text;

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invite_id uuid REFERENCES public.staff_invites(id) ON DELETE SET NULL,
  kind text NOT NULL,
  channel text NOT NULL,
  recipient text,
  title text,
  body text,
  status text NOT NULL DEFAULT 'pending',
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view notification events" ON public.notification_events;
CREATE POLICY "Members can view notification events"
ON public.notification_events
FOR SELECT
TO authenticated
USING (
  public.is_salon_member(auth.uid(), salon_id)
  AND public.can_access_branch(auth.uid(), salon_id, branch_id)
);

DROP POLICY IF EXISTS "Managers can create notification events" ON public.notification_events;
CREATE POLICY "Managers can create notification events"
ON public.notification_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_salon(auth.uid(), salon_id)
  AND public.can_access_branch(auth.uid(), salon_id, branch_id)
);

DROP POLICY IF EXISTS "Managers can update notification events" ON public.notification_events;
CREATE POLICY "Managers can update notification events"
ON public.notification_events
FOR UPDATE
TO authenticated
USING (
  public.can_manage_salon(auth.uid(), salon_id)
  AND public.can_access_branch(auth.uid(), salon_id, branch_id)
)
WITH CHECK (
  public.can_manage_salon(auth.uid(), salon_id)
  AND public.can_access_branch(auth.uid(), salon_id, branch_id)
);

DROP TRIGGER IF EXISTS update_notification_events_updated_at ON public.notification_events;
CREATE TRIGGER update_notification_events_updated_at
BEFORE UPDATE ON public.notification_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS notification_events_salon_branch_created_idx
  ON public.notification_events (salon_id, branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_events_booking_kind_idx
  ON public.notification_events (booking_id, kind, channel);

CREATE INDEX IF NOT EXISTS bookings_reminder_due_idx
  ON public.bookings (starts_at, reminder_sent_at, status, branch_id)
  WHERE reminder_sent_at IS NULL AND status IN ('new', 'confirmed');