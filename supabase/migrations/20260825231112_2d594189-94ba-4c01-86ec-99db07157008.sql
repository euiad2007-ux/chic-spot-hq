CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_id IS NULL OR NEW.status IN ('cancelled','no_show') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.salon_id = NEW.salon_id
      AND COALESCE(b.branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND b.staff_id = NEW.staff_id
      AND b.id <> NEW.id
      AND b.status NOT IN ('cancelled','no_show')
      AND tstzrange(b.starts_at, b.starts_at + (b.duration_min || ' minutes')::interval, '[)')
        && tstzrange(NEW.starts_at, NEW.starts_at + (NEW.duration_min || ' minutes')::interval, '[)')
  ) THEN
    RAISE EXCEPTION 'الموظف مشغول في هذا الوقت داخل نفس الفرع';
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "bookings branch scope" ON public.bookings;
CREATE POLICY "bookings branch scope" ON public.bookings
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_access_branch(auth.uid(), salon_id, branch_id))
  WITH CHECK (public.can_access_branch(auth.uid(), salon_id, branch_id));

CREATE INDEX IF NOT EXISTS bookings_branch_staff_time_idx
  ON public.bookings (salon_id, branch_id, staff_id, starts_at)
  WHERE status NOT IN ('cancelled','no_show');

CREATE INDEX IF NOT EXISTS bookings_branch_status_time_idx
  ON public.bookings (salon_id, branch_id, status, starts_at);