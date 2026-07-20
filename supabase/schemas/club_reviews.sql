-- Migration: create club_reviews table
-- Adds a table for storing Silent Disco club reviews

create table if not exists public.club_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  rating int not null check (rating >= 1 and rating <= 5),
  review_text text,
  created_at timestamptz default now()
);

-- Index for faster reads
create index if not exists idx_club_reviews_created_at on public.club_reviews (created_at desc);

-- Row-level security: enable and basic policies
alter table public.club_reviews enable row level security;

-- Allow authenticated users to insert their own reviews
create policy "authenticated_insert_own" on public.club_reviews
  for insert
  with check (auth.role() = 'authenticated');

-- Allow public selects (readable by website)
create policy "public_select" on public.club_reviews
  for select
  using (true);
