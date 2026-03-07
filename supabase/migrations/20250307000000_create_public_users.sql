-- Create public.users table (synced from Supabase Auth on signup)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer', 'guest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for lookups by email
create index if not exists users_email_idx on public.users (email);

-- Enable RLS
alter table public.users enable row level security;

-- Users can read their own row
create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

-- Users can insert their own row (used on signup)
create policy "Users can insert own row"
  on public.users for insert
  with check (auth.uid() = id);

-- Users can update their own row
create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Optional: allow admin/editor to read all (for assign tasks / ownership as per DOMAIN_MODEL)
-- Uncomment and adjust if you add admin/editor checks later:
-- create policy "Admin and editor can read all users"
--   on public.users for select
--   using (
--     exists (
--       select 1 from public.users u2
--       where u2.id = auth.uid() and u2.role in ('admin', 'editor')
--     )
--   );

comment on table public.users is 'App user profiles; id matches auth.users. Synced on signup.';
