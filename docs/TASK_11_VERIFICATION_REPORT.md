# Task 11 — Final Review & Verification Report

## Schema

| Item | Result | Note |
|------|--------|------|
| tenants table has all required columns including allowed_domains TEXT[] | **PASS** | `id`, `name`, `slug`, `allowed_domains text[] not null default '{}'`, `created_at` in `20250307000002_tenant_core_schema.sql`. |
| users table has tenant_id NOT NULL with correct FK to tenants | **FAIL** | Migration adds `tenant_id uuid references public.tenants (id) on delete cascade` **without NOT NULL** so existing rows and signup trigger are not broken. Intended for backfill; NOT NULL can be added in a follow-up migration after backfill. |
| tenant_invitations has expires_at and partial unique index on pending invites | **PASS** | `expires_at timestamptz not null default (now() + interval '7 days')`; unique index `tenant_invitations_tenant_email_pending_idx` on `(tenant_id, email) where status = 'pending'`. |
| tenant_requests has partial unique index on pending requests | **PASS** | Unique index `tenant_requests_tenant_email_pending_idx` on `(tenant_id, user_email) where status = 'pending'`. |
| RLS enabled on all four tables | **PASS** | `alter table public.tenants|users|tenant_invitations|tenant_requests enable row level security` in `20250307000004_rls_policies.sql`. |
| All RLS policies read from app_metadata, not user_metadata | **PASS** | Policies use `(auth.jwt() ->> 'tenant_id')::uuid` and `(auth.jwt() ->> 'role')`; one policy uses `(auth.jwt() ->> 'email')` (JWT claim). No `user_metadata` in RLS. |

## Auth & Middleware

| Item | Result | Note |
|------|--------|------|
| Middleware redirects limbo users (no tenant_id) to /onboarding | **PASS** | `tenantId == null \|\| tenantId === ""` and pathname !== onboardingRoute → redirect to `tenantConfig.routing.onboardingRoute` in `src/lib/supabase/middleware.ts`. |
| Middleware does NOT redirect /onboarding itself (no redirect loop) | **PASS** | `/onboarding` is in `ALLOWED_PATHS`; when limbo user is on onboarding, pathname === onboardingRoute so `return response` (no redirect). |
| requireTenantSession uses getUser() not getSession() | **PASS** | `supabase.auth.getUser()` only in `src/lib/auth/require-tenant.ts`. |
| No API route or Server Action skips the tenant check | **PASS** | No `app/**/route.ts` in this scope. Onboarding actions intentionally allow limbo (no tenant). Members actions use `requireAdmin()` which calls `requireTenantSession()`. Settings members page uses `requireTenantSession()` and redirects non-admins. |

## Onboarding

| Item | Result | Note |
|------|--------|------|
| resolveOnboardingState checks in order: invite → pending request → domain match → create | **PASS** | Step 1 invite, Step 2 pending request, Step 3 domain match, Step 4 `create_tenant` in `src/lib/onboarding/resolve-onboarding-state.ts`. |
| Domain matching is case-insensitive on both sides | **PASS** | User email lowercased (`emailLower`); domain from `emailLower.split("@")[1]`; `.contains("allowed_domains", [domain])`; schema comment says allowed_domains are lowercase. |
| Blacklisted domains are filtered before domain matching runs | **PASS** | `if (domain && !tenantConfig.email.blacklistedDomains.includes(domain))` guards the tenant query. |
| createTenant generates a unique slug | **PASS** | `slugify(name)` then up to 5 attempts with random suffix (`slug-${Math.random().toString(36).slice(2, 8)}`) if slug exists. |
| All three actions update JWT app_metadata after DB writes succeed | **PASS** | acceptInvitation and createTenant call `admin.auth.admin.updateUserById(..., { app_metadata: { tenant_id, role } })` after DB writes. requestAccess does not update JWT (user not in tenant yet); only accept/create do. |

## Session & JWT

| Item | Result | Note |
|------|--------|------|
| Client calls supabase.auth.refreshSession() before redirecting after any onboarding action | **PASS** | `handleSuccess()` in onboarding-client calls `await supabase.auth.refreshSession()` then `router.push(POST_ONBOARDING_ROUTE)`; used after acceptInvitation and createTenant success. |
| tenant_id and role are set in app_metadata, not user_metadata | **PASS** | All `updateUserById` calls use `app_metadata: { tenant_id, role }`. |
| Removing a member nullifies their app_metadata | **PASS** | `removeMember` in members-actions calls `updateUserById(userId, { app_metadata: { tenant_id: null, role: null } })`. |

## Security

| Item | Result | Note |
|------|--------|------|
| supabaseAdmin is never imported in a client component | **PASS** | `createAdminClient` / `@/lib/supabase/admin` only in `src/lib/settings/members-actions.ts`, `src/lib/onboarding/resolve-onboarding-state.ts`, `src/lib/onboarding/actions.ts` (all server-only). No `.tsx` client file imports admin. |
| No SQL string interpolation anywhere (parameterised queries only) | **PASS** | All DB access uses Supabase client (`.from()`, `.select()`, `.eq()`, `.insert()`, `.rpc()`, etc.). No raw SQL with string interpolation. |
| Invite acceptance verifies the calling user's email matches the invite server-side | **PASS** | `acceptInvitation` compares `invite.email.trim().toLowerCase() !== emailLower` (user email from `getUser()`) and returns error if no match. |

---

## Numbered list: decisions, issues, manual review

1. **users.tenant_id is nullable** — Migration adds `tenant_id` without NOT NULL so existing `public.users` rows and the signup trigger (which does not set tenant_id) continue to work. Add a follow-up migration that backfills tenant_id for any legacy users (e.g. to a default tenant), then `ALTER TABLE public.users ALTER COLUMN tenant_id SET NOT NULL`, if you want to enforce NOT NULL at the DB level.

2. **requestAccess does not update JWT** — By design; the user is not in the tenant until an admin approves. Only acceptInvitation and createTenant update app_metadata.

3. **RLS and JWT** — Policies use `auth.jwt() ->> 'tenant_id'` and `auth.jwt() ->> 'role'`. Ensure your auth flow (e.g. Supabase Auth hooks or post-login logic) writes `tenant_id` and `role` into `app_metadata` so they appear in the JWT; otherwise RLS will not see them.

4. **tenant_invitations_select** — Invited users see their invite via `(auth.jwt() ->> 'email') = email`. That relies on the JWT containing the email claim (Supabase does this by default). No change needed unless you alter how the JWT is built.

5. **Manual check** — Run the full flow in a real environment: signup → onboarding (invite / request / domain match / create) → dashboard → members page (invite, change role, remove, approve/reject requests) and confirm redirects, RLS, and JWT updates behave as expected.

---

If the only outstanding item you accept is nullable `tenant_id` for now, then:

**All tasks complete. System is ready for integration testing.**
