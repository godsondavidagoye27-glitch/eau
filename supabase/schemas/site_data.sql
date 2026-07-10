-- SUPABASE MIGRATION - site_data Table

-- Create a single-row site_data table for global CMS content.
CREATE TABLE IF NOT EXISTS public.site_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure the table always has the canonical row ID.
INSERT INTO public.site_data (id, content)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- Index the update timestamp for change tracking.
CREATE INDEX IF NOT EXISTS idx_site_data_updated_at ON public.site_data (updated_at);

-- Enable row-level security for site_data.
ALTER TABLE public.site_data ENABLE ROW LEVEL SECURITY;

-- Policy: public updates can read the site content.
CREATE POLICY "Public can read site data"
  ON public.site_data
  FOR SELECT
  USING (true);

-- Policy: only admin users may insert new site_data rows.
CREATE POLICY "Admins can insert site data"
  ON public.site_data
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');

-- Policy: only admin users may update the site content.
CREATE POLICY "Admins can update site data"
  ON public.site_data
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin')
  WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');

-- Policy: only admin users may delete site_data rows.
CREATE POLICY "Admins can delete site data"
  ON public.site_data
  FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');
