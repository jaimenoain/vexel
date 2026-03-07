/**
 * Onboarding state resolver. Uses service-role client — user has no tenant yet, so RLS would block.
 * Only call from Server Components or Route Handlers; never expose to the client.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { tenantConfig } from "../../../tenant-system.config";
import type {
  OnboardingState,
  InvitationRow,
  AccessRequestRow,
  TenantRow,
} from "../../../types/supabase";

export type UserWithEmail = { email: string };

/**
 * Resolves which onboarding path applies for the user. Steps run in order;
 * first match wins.
 */
export async function resolveOnboardingState(
  user: UserWithEmail
): Promise<OnboardingState> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const emailLower = user.email.trim().toLowerCase();

  // Step 1: Pending, non-expired invite for this email (case-insensitive)
  const { data: invites } = await admin
    .from("tenant_invitations")
    .select("*, tenants(*)")
    .eq("status", "pending")
    .gt("expires_at", now)
    .ilike("email", emailLower)
    .limit(1);

  const invitation = invites?.[0];
  if (invitation) {
    const row: InvitationRow = {
      id: invitation.id,
      tenant_id: invitation.tenant_id,
      email: invitation.email,
      role: invitation.role,
      invited_by: invitation.invited_by,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
    };
    const tn = (invitation as { tenants?: { name?: string } | { name?: string }[] }).tenants;
    const tenantName = tn ? (Array.isArray(tn) ? tn[0]?.name : tn?.name) : undefined;
    return { kind: "has_invite", invitation: row, tenantName };
  }

  // Step 2: Pending request for this email (case-insensitive)
  const { data: requests } = await admin
    .from("tenant_requests")
    .select("*, tenants(*)")
    .eq("status", "pending")
    .ilike("user_email", emailLower)
    .limit(1);

  const request = requests?.[0];
  if (request) {
    const row: AccessRequestRow = {
      id: request.id,
      tenant_id: request.tenant_id,
      user_id: request.user_id,
      user_email: request.user_email,
      status: request.status,
      reviewed_by: request.reviewed_by,
      created_at: request.created_at,
    };
    const tn = (request as { tenants?: { name?: string } | { name?: string }[] }).tenants;
    const tenantName = tn ? (Array.isArray(tn) ? tn[0]?.name : tn?.name) : undefined;
    return { kind: "pending_request", request: row, tenantName };
  }

  // Step 3: Domain from email (after @), lowercase; skip if blacklisted
  const domain = emailLower.split("@")[1] ?? "";
  if (
    domain &&
    !tenantConfig.email.blacklistedDomains.includes(domain)
  ) {
    const { data: tenants } = await admin
      .from("tenants")
      .select("*")
      .contains("allowed_domains", [domain])
      .limit(1);

    const tenant = tenants?.[0];
    if (tenant) {
      const row: TenantRow = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        allowed_domains: tenant.allowed_domains ?? [],
        created_at: tenant.created_at,
      };
      return { kind: "domain_match", tenant: row };
    }
  }

  // Step 4
  return { kind: "create_tenant" };
}
