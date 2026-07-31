CREATE TABLE public.app_state (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_state readable" ON public.app_state FOR SELECT USING (true);
CREATE POLICY "app_state insertable" ON public.app_state FOR INSERT WITH CHECK (true);
CREATE POLICY "app_state updatable" ON public.app_state FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_app_state_updated_at
BEFORE UPDATE ON public.app_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();