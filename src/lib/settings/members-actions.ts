"use server";

import { requireTenantSession } from "@/lib/auth/require-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantConfig } from "../../../tenant-system.config";

export type MembersActionResult =
  | { success: true; data?: { id?: string } }
  | { success: false; error: string };

function isAdmin(role: string): boolean {
  return tenantConfig.roles.admin.includes(role);
}

async function requireAdmin(): Promise<
  | { success: true; tenantId: string; userId: string }
  | { success: false; error: string }
> {
  const session = await requireTenantSession();
  if ("error" in session) {
    return { success: false, error: session.error === "UNAUTHENTICATED" ? "Not authenticated" : "No tenant" };
  }
  if (!isAdmin(session.role)) {
    return { success: false, error: "Forbidden" };
  }
  return { success: true, tenantId: session.tenantId, userId: session.user.id };
}

export async function changeMemberRole(
  userId: string,
  newRole: string
): Promise<MembersActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;
  if (!tenantConfig.roles.all.includes(newRole)) {
    return { success: false, error: "Invalid role" };
  }

  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from("users")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("tenant_id", auth.tenantId);

  if (updateErr) return { success: false, error: updateErr.message };

  const { error: jwtErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: auth.tenantId, role: newRole },
  });
  if (jwtErr) return { success: false, error: jwtErr.message };

  return { success: true };
}

export async function removeMember(userId: string): Promise<MembersActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  const admin = createAdminClient();
  const { error: deleteErr } = await admin
    .from("users")
    .delete()
    .eq("id", userId)
    .eq("tenant_id", auth.tenantId);

  if (deleteErr) return { success: false, error: deleteErr.message };

  const { error: jwtErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: null, role: null },
  });
  if (jwtErr) return { success: false, error: jwtErr.message };

  return { success: true };
}

export async function createInvitation(
  email: string,
  role: string
): Promise<MembersActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;
  if (!tenantConfig.roles.all.includes(role)) {
    return { success: false, error: "Invalid role" };
  }

  const emailLower = email.trim().toLowerCase();
  if (!emailLower) return { success: false, error: "Email is required" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("tenant_invitations")
    .select("id")
    .eq("tenant_id", auth.tenantId)
    .eq("status", "pending")
    .ilike("email", emailLower)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "A pending invitation for this email already exists" };
  }

  const { data: invite, error: insertErr } = await admin
    .from("tenant_invitations")
    .insert({
      tenant_id: auth.tenantId,
      email: emailLower,
      role,
      invited_by: auth.userId,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr) return { success: false, error: insertErr.message };
  return { success: true, data: { id: invite?.id } };
}

export async function revokeInvitation(invitationId: string): Promise<MembersActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("tenant_id", auth.tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function approveAccessRequest(
  requestId: string,
  role: string
): Promise<MembersActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;
  if (!tenantConfig.roles.all.includes(role)) {
    return { success: false, error: "Invalid role" };
  }

  const admin = createAdminClient();
  const { data: req, error: fetchErr } = await admin
    .from("tenant_requests")
    .select("id, tenant_id, user_id, user_email, status")
    .eq("id", requestId)
    .eq("tenant_id", auth.tenantId)
    .single();

  if (fetchErr || !req || req.status !== "pending") {
    return { success: false, error: "Request not found or no longer pending" };
  }

  const userId = req.user_id;
  if (!userId) {
    return { success: false, error: "Request has no linked user" };
  }

  const now = new Date().toISOString();
  const { error: upsertErr } = await admin.from("users").upsert(
    {
      id: userId,
      tenant_id: auth.tenantId,
      email: req.user_email,
      role,
      first_name: "",
      last_name: "",
      updated_at: now,
    },
    { onConflict: "id" }
  );

  if (upsertErr) return { success: false, error: upsertErr.message };

  const { error: updateReqErr } = await admin
    .from("tenant_requests")
    .update({ status: "approved", reviewed_by: auth.userId })
    .eq("id", requestId);

  if (updateReqErr) return { success: false, error: updateReqErr.message };

  const { error: jwtErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: auth.tenantId, role },
  });
  if (jwtErr) return { success: false, error: jwtErr.message };

  return { success: true };
}

export async function rejectAccessRequest(requestId: string): Promise<MembersActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_requests")
    .update({ status: "rejected", reviewed_by: auth.userId })
    .eq("id", requestId)
    .eq("tenant_id", auth.tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
