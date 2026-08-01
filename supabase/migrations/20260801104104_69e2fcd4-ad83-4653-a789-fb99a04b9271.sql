ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS min_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS via text;