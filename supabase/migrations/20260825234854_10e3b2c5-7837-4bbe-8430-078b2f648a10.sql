CREATE TABLE public.platform_settings (
  id text PRIMARY KEY DEFAULT 'main',
  brand_name text NOT NULL DEFAULT 'Salon Flow',
  bank_name text,
  bank_account_name text,
  iban text,
  account_number text,
  phone text,
  whatsapp text,
  email text,
  support_hours text,
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  home jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_single CHECK (id = 'main')
);

GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform settings are public"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "platform owner manages settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_platform_owner(auth.uid()))
  WITH CHECK (public.is_platform_owner(auth.uid()));

GRANT INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (id, brand_name, socials, home)
VALUES ('main', 'Salon Flow', '{}'::jsonb, '{}'::jsonb);