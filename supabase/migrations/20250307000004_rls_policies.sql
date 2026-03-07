-- RLS policies for tenant-system tables.
-- JWT: (auth.jwt() ->> 'tenant_id')::uuid and (auth.jwt() ->> 'role') from app_metadata.

-- ---------------------------------------------------------------------------
-- public.tenants
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;

drop policy if exists "tenants_select_same_tenant" on public.tenants;
create policy "tenants_select_same_tenant"
  on public.tenants for select
  using ((auth.jwt() ->> 'tenant_id')::uuid = id);

-- INSERT / DELETE: no policy = deny (service role only)

drop policy if exists "tenants_update_admin_only" on public.tenants;
create policy "tenants_update_admin_only"
  on public.tenants for update
  using (
    (auth.jwt() ->> 'tenant_id')::uuid = id
    and (auth.jwt() ->> 'role') in ('owner', 'admin')
  )
  with check (
    (auth.jwt() ->> 'tenant_id')::uuid = id
    and (auth.jwt() ->> 'role') in ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- public.users (replace existing policies)
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "Users can read own row" on public.users;
drop policy if exists "Users can insert own row" on public.users;
drop policy if exists "Users can update own row" on public.users;

drop policy if exists "users_select_same_tenant" on public.users;
create policy "users_select_same_tenant"
  on public.users for select
  using ((auth.jwt() ->> 'tenant_id')::uuid = tenant_id);

-- INSERT: no policy = deny (service role only)

drop policy if exists "users_update_own_or_admin" on public.users;
create policy "users_update_own_or_admin"
  on public.users for update
  using (
    auth.uid() = id
    or (
      (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
      and (auth.jwt() ->> 'role') in ('owner', 'admin')
    )
  )
  with check (
    auth.uid() = id
    or (
      (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
      and (auth.jwt() ->> 'role') in ('owner', 'admin')
    )
  );

drop policy if exists "users_delete_admin_only" on public.users;
create policy "users_delete_admin_only"
  on public.users for delete
  using (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    and (auth.jwt() ->> 'role') in ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- public.tenant_invitations
-- ---------------------------------------------------------------------------
alter table public.tenant_invitations enable row level security;

drop policy if exists "tenant_invitations_select" on public.tenant_invitations;
create policy "tenant_invitations_select"
  on public.tenant_invitations for select
  using (
    -- Admin roles see all for their tenant
    (
      (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
      and (auth.jwt() ->> 'role') in ('owner', 'admin')
    )
    or
    -- Invited user sees own invite by email match
    (auth.jwt() ->> 'email') = email
  );

-- INSERT / UPDATE / DELETE: no policy = deny (service role only)

-- ---------------------------------------------------------------------------
-- public.tenant_requests
-- ---------------------------------------------------------------------------
alter table public.tenant_requests enable row level security;

drop policy if exists "tenant_requests_select_admin" on public.tenant_requests;
create policy "tenant_requests_select_admin"
  on public.tenant_requests for select
  using (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    and (auth.jwt() ->> 'role') in ('owner', 'admin')
  );

-- INSERT / UPDATE / DELETE: no policy = deny (service role only)
