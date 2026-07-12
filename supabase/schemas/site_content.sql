-- SUPABASE MIGRATION - site_content Table

-- Store modular content blocks used across the site (pages, sections)
CREATE TABLE IF NOT EXISTS public.site_content (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_content_updated_at ON public.site_content (updated_at);

-- Enable row-level security
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site content"
  ON public.site_content
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site content"
  ON public.site_content
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');

CREATE POLICY "Admins can update site content"
  ON public.site_content
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin')
  WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');

CREATE POLICY "Admins can delete site content"
  ON public.site_content
  FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'app_role' = 'admin');
