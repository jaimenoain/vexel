"use server";

/**
 * Onboarding actions. All actions are safe to retry. Preconditions are checked before writing.
 * Writes use supabaseAdmin; JWT is updated via admin.auth.admin.updateUserById().
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantConfig } from "../../../tenant-system.config";

export type ActionResult = { success: true } | { success: false; error: string };

async function getAuthUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Domain: no @, lowercase, basic format (label(s) with dots). */
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "tenant";
}

/**
 * Accept an invitation: verify, insert user + update invite, then set JWT app_metadata.
 */
export async function acceptInvitation(invitationId: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const emailLower = user.email.trim().toLowerCase();

  const { data: invite, error: fetchErr } = await admin
    .from("tenant_invitations")
    .select("id, tenant_id, email, role, status, expires_at")
    .eq("id", invitationId)
    .single();

  if (fetchErr || !invite) {
    return { success: false, error: "Invitation not found" };
  }
  if (invite.status !== "pending") {
    return { success: false, error: "Invitation is no longer pending" };
  }
  if (invite.expires_at <= now) {
    return { success: false, error: "Invitation has expired" };
  }
  if (invite.email.trim().toLowerCase() !== emailLower) {
    return { success: false, error: "Invitation does not match your email" };
  }

  const first = (user.user_metadata?.first_name as string) ?? "";
  const last = (user.user_metadata?.last_name as string) ?? "";

  const { error: insertErr } = await admin.from("users").upsert(
    {
      id: user.id,
      tenant_id: invite.tenant_id,
      email: user.email,
      role: invite.role,
      first_name: first,
      last_name: last,
      updated_at: now,
    },
    { onConflict: "id" }
  );

  if (insertErr) {
    return { success: false, error: insertErr.message };
  }

  const { error: updateInviteErr } = await admin
    .from("tenant_invitations")
    .update({ status: "accepted" })
    .eq("id", invitationId);

  if (updateInviteErr) {
    return { success: false, error: updateInviteErr.message };
  }

  const { error: jwtErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      tenant_id: invite.tenant_id,
      role: invite.role,
    },
  });

  if (jwtErr) {
    return { success: false, error: jwtErr.message };
  }

  return { success: true };
}

/**
 * Request access to a tenant. Checks tenant exists and no duplicate pending request.
 */
export async function requestAccess(tenantId: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const emailLower = user.email.trim().toLowerCase();

  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .single();

  if (tenantErr || !tenant) {
    return { success: false, error: "Tenant not found" };
  }

  const { data: existing } = await admin
    .from("tenant_requests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .ilike("user_email", emailLower)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "You already have a pending request for this workspace" };
  }

  const { error: insertErr } = await admin.from("tenant_requests").insert({
    tenant_id: tenantId,
    user_id: user.id,
    user_email: user.email,
    status: "pending",
  });

  if (insertErr) {
    return { success: false, error: insertErr.message };
  }

  return { success: true };
}

/**
 * Create a new tenant and set the caller as owner. Uses DB function for atomic transaction.
 */
export async function createTenant(
  name: string,
  domain?: string
): Promise<{ success: true; tenantId: string } | { success: false; error: string }> {
  const user = await getAuthUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const trimmedName = name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  let allowedDomains: string[] = [];
  if (domain != null && domain !== "") {
    const d = domain.trim().toLowerCase();
    if (d.includes("@")) {
      return { success: false, error: "Domain must not contain @" };
    }
    if (!DOMAIN_REGEX.test(d)) {
      return { success: false, error: "Invalid domain format" };
    }
    allowedDomains = [d];
  }

  const admin = createAdminClient();
  let slug = slugify(trimmedName);
  const ownerRole = tenantConfig.roles.owner;

  for (let attempt = 0; attempt < 5; attempt++) {
    const slugToTry = attempt === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: existing } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slugToTry)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      slug = slugToTry;
      break;
    }
    if (attempt === 4) {
      return { success: false, error: "Could not generate a unique slug; please try again" };
    }
  }

  const first = (user.user_metadata?.first_name as string) ?? "";
  const last = (user.user_metadata?.last_name as string) ?? "";

  const { data: rpcData, error: rpcErr } = await admin.rpc("create_tenant_and_owner", {
    p_tenant_name: trimmedName,
    p_tenant_slug: slug,
    p_allowed_domains: allowedDomains,
    p_user_id: user.id,
    p_user_email: user.email,
    p_owner_role: ownerRole,
    p_first_name: first,
    p_last_name: last,
  });

  if (rpcErr) {
    return { success: false, error: rpcErr.message };
  }

  const tenantId = (rpcData as { tenant_id?: string })?.tenant_id;
  if (!tenantId) {
    return { success: false, error: "Failed to create tenant" };
  }

  const { error: jwtErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      tenant_id: tenantId,
      role: ownerRole,
    },
  });

  if (jwtErr) {
    return { success: false, error: jwtErr.message };
  }

  return { success: true, tenantId };
}
