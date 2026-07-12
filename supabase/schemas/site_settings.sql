-- SUPABASE MIGRATION - site_settings Table

-- Key/value style settings for global site configuration
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_settings_updated_at ON public.site_settings (updated_at);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site settings"
  ON public.site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');

CREATE POLICY "Admins can update site settings"
  ON public.site_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin')
  WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');

CREATE POLICY "Admins can delete site settings"
  ON public.site_settings
  FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');
