ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_tour_state text,
  ADD COLUMN IF NOT EXISTS onboarding_tour_done_at timestamptz;