ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'SA';

CREATE TABLE IF NOT EXISTS public.salon_verification (
  salon_id uuid PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
  doc_kind text NOT NULL DEFAULT 'commercial',
  doc_number text,
  doc_issued_on date,
  doc_expires_on date,
  legal_name text,
  national_id text,
  bank_name text,
  iban text,
  account_holder text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.salon_verification TO authenticated;
GRANT ALL ON public.salon_verification TO service_role;

ALTER TABLE public.salon_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon managers read own verification"
ON public.salon_verification FOR SELECT TO authenticated
USING (public.can_manage_salon(auth.uid(), salon_id) OR public.is_platform_owner(auth.uid()));

CREATE POLICY "Salon managers create own verification"
ON public.salon_verification FOR INSERT TO authenticated
WITH CHECK (public.can_manage_salon(auth.uid(), salon_id) OR public.is_platform_owner(auth.uid()));

CREATE POLICY "Salon managers update own verification"
ON public.salon_verification FOR UPDATE TO authenticated
USING (public.can_manage_salon(auth.uid(), salon_id) OR public.is_platform_owner(auth.uid()))
WITH CHECK (public.can_manage_salon(auth.uid(), salon_id) OR public.is_platform_owner(auth.uid()));

CREATE TRIGGER update_salon_verification_updated_at
BEFORE UPDATE ON public.salon_verification
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Salon docs read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'salon-docs'
  AND (
    public.is_platform_owner(auth.uid())
    OR public.can_manage_salon(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
  )
);

CREATE POLICY "Salon docs insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'salon-docs'
  AND public.can_manage_salon(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
);

CREATE POLICY "Salon docs delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'salon-docs'
  AND public.can_manage_salon(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
);