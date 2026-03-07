import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type RequireTenantSuccess = {
  user: User;
  tenantId: string;
  role: string;
};

export type RequireTenantError =
  | { error: "UNAUTHENTICATED"; status: 401 }
  | { error: "NO_TENANT"; status: 403 };

export type RequireTenantResult = RequireTenantSuccess | RequireTenantError;

/**
 * Ensures the request has an authenticated user with a tenant (workspace).
 * Use in API routes, Server Actions, or getServerSideProps.
 *
 * - Uses `getUser()` (not getSession()).
 * - Reads `tenant_id` and `role` from `user.app_metadata` only.
 *
 * @returns On success: `{ user, tenantId, role }`. On failure: `{ error, status }` for 401/403.
 *
 * @example
 * // App Router (API route or Server Action) — uses cookies() from next/headers
 * const result = await requireTenantSession();
 * if (result.error) {
 *   return NextResponse.json({ message: result.error }, { status: result.status });
 * }
 * const { user, tenantId, role } = result;
 *
 * @example
 * // Pages Router (getServerSideProps) — pass a Supabase server client built with req/res
 * const supabase = createServerClientWithReqRes(req, res);
 * const result = await requireTenantSession(supabase);
 * if (result.error) {
 *   return { redirect: { destination: result.status === 401 ? '/login' : '/onboarding', permanent: false } };
 * }
 */
export async function requireTenantSession(
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<RequireTenantResult> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return { error: "UNAUTHENTICATED", status: 401 };
  }

  const tenantId = data.user.app_metadata?.tenant_id as string | undefined;
  if (tenantId == null || tenantId === "") {
    return { error: "NO_TENANT", status: 403 };
  }

  const role = (data.user.app_metadata?.role as string) ?? "";

  return {
    user: data.user,
    tenantId,
    role,
  };
}
