ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS cashier_staff_id text,
  ADD COLUMN IF NOT EXISTS cashier_name text,
  ADD COLUMN IF NOT EXISTS opening_card numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS counted_card numeric;