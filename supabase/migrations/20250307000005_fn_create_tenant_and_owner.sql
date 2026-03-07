-- Atomic transaction: create tenant and add owner to public.users.
-- Handles existing auth user (e.g. from signup trigger) via ON CONFLICT.

create or replace function public.create_tenant_and_owner(
  p_tenant_name text,
  p_tenant_slug text,
  p_allowed_domains text[],
  p_user_id uuid,
  p_user_email text,
  p_owner_role text,
  p_first_name text default '',
  p_last_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  insert into public.tenants (name, slug, allowed_domains)
  values (p_tenant_name, p_tenant_slug, coalesce(p_allowed_domains, '{}'))
  returning id into v_tenant_id;

  insert into public.users (id, tenant_id, email, role, first_name, last_name)
  values (p_user_id, v_tenant_id, p_user_email, p_owner_role, p_first_name, p_last_name)
  on conflict (id) do update set
    tenant_id = excluded.tenant_id,
    role = excluded.role,
    updated_at = now();

  return jsonb_build_object('tenant_id', v_tenant_id);
exception when others then
  raise;
end;
$$;

revoke execute on function public.create_tenant_and_owner from public;

comment on function public.create_tenant_and_owner is 'Creates a tenant and assigns the given user as owner; idempotent for existing public.users row.';
