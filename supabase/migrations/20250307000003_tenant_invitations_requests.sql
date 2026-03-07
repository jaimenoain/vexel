-- Invitations and access requests. Role values are TEXT — no CHECK on roles.
-- RLS policies are added in Task 05.

-- ---------------------------------------------------------------------------
-- tenant_invitations
-- ---------------------------------------------------------------------------
create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  role text not null,
  invited_by uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- One pending invitation per (tenant_id, email)
create unique index if not exists tenant_invitations_tenant_email_pending_idx
  on public.tenant_invitations (tenant_id, email)
  where status = 'pending';

create index if not exists tenant_invitations_email_status_idx
  on public.tenant_invitations (email, status);

create index if not exists tenant_invitations_tenant_id_status_idx
  on public.tenant_invitations (tenant_id, status);

create index if not exists tenant_invitations_expires_at_idx
  on public.tenant_invitations (expires_at);

comment on table public.tenant_invitations is 'Invitations to join a tenant; email lowercase and trimmed in app.';

-- ---------------------------------------------------------------------------
-- tenant_requests
-- ---------------------------------------------------------------------------
create table if not exists public.tenant_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  user_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users (id),
  created_at timestamptz default now()
);

-- One pending request per (tenant_id, user_email)
create unique index if not exists tenant_requests_tenant_email_pending_idx
  on public.tenant_requests (tenant_id, user_email)
  where status = 'pending';

create index if not exists tenant_requests_tenant_id_status_idx
  on public.tenant_requests (tenant_id, status);

comment on table public.tenant_requests is 'Access requests to join a tenant; reviewed_by set when status changes from pending.';
