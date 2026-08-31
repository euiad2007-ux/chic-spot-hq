ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.cash_shifts ADD COLUMN IF NOT EXISTS cash_diff numeric NOT NULL DEFAULT 0;
ALTER TABLE public.cash_shifts ADD COLUMN IF NOT EXISTS card_diff numeric NOT NULL DEFAULT 0;