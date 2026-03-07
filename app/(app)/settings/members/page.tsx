import { redirect } from "next/navigation";
import { requireTenantSession } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { tenantConfig } from "../../../../tenant-system.config";
import { MembersClient } from "@/components/settings/members-client";

export type MemberRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

export type PendingRequestRow = {
  id: string;
  user_email: string;
  user_id: string | null;
  created_at: string;
};

export default async function SettingsMembersPage() {
  const session = await requireTenantSession();
  if ("error" in session) {
    redirect(session.status === 401 ? "/login" : "/onboarding");
  }
  if (!tenantConfig.roles.admin.includes(session.role)) {
    redirect(tenantConfig.routing.postOnboardingRoute);
  }

  const supabase = await createClient();
  const [membersRes, invitesRes, requestsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, role, created_at")
      .eq("tenant_id", session.tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_invitations")
      .select("id, email, role, expires_at, created_at")
      .eq("tenant_id", session.tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_requests")
      .select("id, user_email, user_id, created_at")
      .eq("tenant_id", session.tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const members: MemberRow[] = (membersRes.data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    created_at: r.created_at,
  }));
  const pendingInvites: PendingInviteRow[] = (invitesRes.data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    expires_at: r.expires_at,
    created_at: r.created_at,
  }));
  const pendingRequests: PendingRequestRow[] = (requestsRes.data ?? []).map((r) => ({
    id: r.id,
    user_email: r.user_email,
    user_id: r.user_id,
    created_at: r.created_at,
  }));

  return (
    <MembersClient
      members={members}
      pendingInvites={pendingInvites}
      pendingRequests={pendingRequests}
      currentUserId={session.user.id}
    />
  );
}
