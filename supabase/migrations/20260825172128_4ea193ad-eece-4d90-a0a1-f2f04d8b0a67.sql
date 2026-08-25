CREATE TABLE public.salon_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  display_name text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salon_reviews TO authenticated;
GRANT ALL ON public.salon_reviews TO service_role;

ALTER TABLE public.salon_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read salon reviews" ON public.salon_reviews
  FOR SELECT TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id));

CREATE POLICY "customers read own reviews" ON public.salon_reviews
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = salon_reviews.customer_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "managers moderate reviews" ON public.salon_reviews
  FOR UPDATE TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "managers delete reviews" ON public.salon_reviews
  FOR DELETE TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER salon_reviews_updated_at
  BEFORE UPDATE ON public.salon_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX salon_reviews_salon_idx ON public.salon_reviews (salon_id, published, created_at DESC);

-- Customers submit through this function only: it proves a completed booking.
CREATE OR REPLACE FUNCTION public.submit_salon_review(
  _booking uuid,
  _rating integer,
  _comment text DEFAULT NULL,
  _display_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_id uuid;
BEGIN
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'التقييم يجب أن يكون بين 1 و5';
  END IF;

  SELECT bk.id, bk.salon_id, bk.branch_id, bk.customer_id, bk.status
    INTO b
    FROM public.bookings bk
    JOIN public.customers c ON c.id = bk.customer_id
   WHERE bk.id = _booking
     AND c.user_id = auth.uid();

  IF b.id IS NULL THEN
    RAISE EXCEPTION 'الحجز غير موجود أو لا يخصك';
  END IF;

  IF b.status <> 'completed' THEN
    RAISE EXCEPTION 'يمكن التقييم بعد اكتمال الحجز فقط';
  END IF;

  INSERT INTO public.salon_reviews (salon_id, branch_id, customer_id, booking_id, rating, comment, display_name)
  VALUES (b.salon_id, b.branch_id, b.customer_id, b.id, _rating, nullif(btrim(coalesce(_comment,'')), ''), nullif(btrim(coalesce(_display_name,'')), ''))
  ON CONFLICT (booking_id) DO UPDATE
     SET rating = excluded.rating,
         comment = excluded.comment,
         display_name = excluded.display_name,
         updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_salon_review(uuid, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_salon_reviews(_salon uuid, _limit integer DEFAULT 12)
RETURNS TABLE (id uuid, rating integer, comment text, display_name text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.rating, r.comment, r.display_name, r.created_at
    FROM public.salon_reviews r
    JOIN public.salons s ON s.id = r.salon_id AND NOT s.is_suspended
   WHERE r.salon_id = _salon AND r.published
   ORDER BY r.rating DESC, r.created_at DESC
   LIMIT greatest(1, least(coalesce(_limit, 12), 50));
$$;

GRANT EXECUTE ON FUNCTION public.public_salon_reviews(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_salon_rating(_salon uuid)
RETURNS TABLE (avg_rating numeric, review_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(avg(r.rating)::numeric, 2), count(*)::int
    FROM public.salon_reviews r
   WHERE r.salon_id = _salon AND r.published;
$$;

GRANT EXECUTE ON FUNCTION public.public_salon_rating(uuid) TO anon, authenticated;