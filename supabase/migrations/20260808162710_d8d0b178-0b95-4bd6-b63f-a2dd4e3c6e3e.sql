ALTER TABLE public.services ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS services_branch_id_idx ON public.services(branch_id);