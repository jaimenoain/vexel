-- Tenant core schema: tenants table and users table updates
-- RLS policies are added in Task 05.

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  allowed_domains text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- GIN index for domain lookups
create index if not exists tenants_allowed_domains_gin_idx
  on public.tenants using gin (allowed_domains);

comment on table public.tenants is 'Workspaces/organizations; slug is lowercase URL-safe; allowed_domains are lowercase without @.';
comment on column public.tenants.allowed_domains is 'Lowercase email domains allowed for company matching (e.g. acme.com).';

-- ---------------------------------------------------------------------------
-- users — add missing columns and indexes; do not drop/rename existing columns
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

-- Remove hardcoded role CHECK so roles are stored as TEXT per tenant config
alter table public.users
  drop constraint if exists users_role_check;

-- Index for tenant scoping
create index if not exists users_tenant_id_idx on public.users (tenant_id);

-- email index already exists as users_email_idx; ensure it exists
create index if not exists users_email_idx on public.users (email);

comment on table public.users is 'App user profiles per tenant; id matches auth.users.';
