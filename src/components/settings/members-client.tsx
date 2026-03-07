"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  changeMemberRole,
  removeMember,
  createInvitation,
  revokeInvitation,
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/settings/members-actions";
import { tenantConfig } from "../../../tenant-system.config";

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

type ConfirmState =
  | null
  | { type: "remove"; userId: string; email: string }
  | { type: "revoke"; invitationId: string; email: string }
  | { type: "approve"; requestId: string; email: string; userId: string | null }
  | { type: "reject"; requestId: string; email: string };

export function MembersClient({
  members: initialMembers,
  pendingInvites: initialInvites,
  pendingRequests: initialRequests,
  currentUserId,
}: {
  members: MemberRow[];
  pendingInvites: PendingInviteRow[];
  pendingRequests: PendingRequestRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [pendingRequests, setPendingRequests] = useState(initialRequests);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(tenantConfig.roles.defaultMember);

  const [roleEdits, setRoleEdits] = useState<Record<string, string>>({});
  const [approveRole, setApproveRole] = useState(tenantConfig.roles.defaultMember);

  const roles = tenantConfig.roles.all;

  async function handleChangeRole(userId: string, newRole: string) {
    setError(null);
    setLoading(`role-${userId}`);
    const result = await changeMemberRole(userId, newRole);
    setLoading(null);
    if (result.success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
      );
      setRoleEdits((e) => ({ ...e, [userId]: undefined }));
    } else {
      setError(result.error);
    }
  }

  async function handleRemoveMember(userId: string) {
    setError(null);
    setLoading(`remove-${userId}`);
    const result = await removeMember(userId);
    setLoading(null);
    setConfirm(null);
    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleCreateInvitation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("invite");
    const result = await createInvitation(inviteEmail.trim(), inviteRole);
    setLoading(null);
    if (result.success) {
      setInviteEmail("");
      setInviteRole(tenantConfig.roles.defaultMember);
      router.refresh();
      setPendingInvites((prev) => [
        ...prev,
        {
          id: result.data?.id ?? "",
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      setError(result.error);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setError(null);
    setLoading(`revoke-${invitationId}`);
    const result = await revokeInvitation(invitationId);
    setLoading(null);
    setConfirm(null);
    if (result.success) {
      setPendingInvites((prev) => prev.filter((i) => i.id !== invitationId));
    } else {
      setError(result.error);
    }
  }

  async function handleApproveRequest(requestId: string, userId: string | null) {
    if (!userId) {
      setError("Cannot approve: user not linked");
      return;
    }
    setError(null);
    setLoading(`approve-${requestId}`);
    const result = await approveAccessRequest(requestId, approveRole);
    setLoading(null);
    setConfirm(null);
    if (result.success) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleRejectRequest(requestId: string) {
    setError(null);
    setLoading(`reject-${requestId}`);
    const result = await rejectAccessRequest(requestId);
    setLoading(null);
    setConfirm(null);
    if (result.success) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      setError(result.error);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground">
          Manage workspace members, invitations, and access requests.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Workspace members and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={roleEdits[m.id] ?? m.role}
                      onChange={(e) =>
                        setRoleEdits((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      disabled={loading !== null}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {(roleEdits[m.id] ?? m.role) !== m.role && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        disabled={loading !== null}
                        onClick={() =>
                          handleChangeRole(m.id, roleEdits[m.id] ?? m.role)
                        }
                      >
                        {loading === `role-${m.id}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Update"
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Active</Badge>
                  </TableCell>
                  <TableCell>{formatDate(m.created_at)}</TableCell>
                  <TableCell>
                    {m.id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={loading !== null}
                        onClick={() => setConfirm({ type: "remove", userId: m.id, email: m.email })}
                      >
                        {loading === `remove-${m.id}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Remove"
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
          <CardDescription>Send an invitation by email with a role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvitation} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={loading !== null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={loading !== null}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading === "invite" || !inviteEmail.trim()}>
              {loading === "invite" ? <Loader2 className="size-4 animate-spin" /> : null}
              Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Invitations not yet accepted.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.email}</TableCell>
                    <TableCell>{i.role}</TableCell>
                    <TableCell>{formatDate(i.expires_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading !== null}
                        onClick={() =>
                          setConfirm({ type: "revoke", invitationId: i.id, email: i.email })
                        }
                      >
                        {loading === `revoke-${i.id}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Revoke"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending access requests</CardTitle>
          <CardDescription>Requests to join this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.user_email}</TableCell>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={loading !== null || !r.user_id}
                          onClick={() => {
                            setApproveRole(tenantConfig.roles.defaultMember);
                            setConfirm({
                              type: "approve",
                              requestId: r.id,
                              email: r.user_email,
                              userId: r.user_id,
                            });
                          }}
                        >
                          {loading === `approve-${r.id}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            "Approve"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading !== null}
                          onClick={() =>
                            setConfirm({ type: "reject", requestId: r.id, email: r.user_email })
                          }
                        >
                          {loading === `reject-${r.id}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            "Reject"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <Card className="mx-4 w-full max-w-sm">
            <CardHeader>
              <CardTitle>
                {confirm.type === "remove" && "Remove member"}
                {confirm.type === "revoke" && "Revoke invitation"}
                {confirm.type === "approve" && "Approve request"}
                {confirm.type === "reject" && "Reject request"}
              </CardTitle>
              <CardDescription>
                {confirm.type === "remove" &&
                  `Remove ${confirm.email} from the workspace? They will lose access.`}
                {confirm.type === "revoke" &&
                  `Revoke the invitation sent to ${confirm.email}?`}
                {confirm.type === "approve" &&
                  `Approve ${confirm.email}. Choose the role they will receive.`}
                {confirm.type === "reject" &&
                  `Reject the access request from ${confirm.email}?`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {confirm.type === "approve" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={approveRole}
                    onChange={(e) => setApproveRole(e.target.value)}
                    disabled={loading !== null}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              {confirm.type === "remove" && (
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveMember(confirm.userId)}
                  disabled={loading !== null}
                >
                  {loading === `remove-${confirm.userId}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Remove"
                  )}
                </Button>
              )}
              {confirm.type === "revoke" && (
                <Button
                  variant="destructive"
                  onClick={() => handleRevokeInvitation(confirm.invitationId)}
                  disabled={loading !== null}
                >
                  {loading === `revoke-${confirm.invitationId}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Revoke"
                  )}
                </Button>
              )}
              {confirm.type === "approve" && (
                <Button
                  onClick={() =>
                    handleApproveRequest(confirm.requestId, confirm.userId ?? null)
                  }
                  disabled={loading !== null || !confirm.userId}
                >
                  {loading === `approve-${confirm.requestId}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Approve"
                  )}
                </Button>
              )}
              {confirm.type === "reject" && (
                <Button
                  variant="destructive"
                  onClick={() => handleRejectRequest(confirm.requestId)}
                  disabled={loading !== null}
                >
                  {loading === `reject-${confirm.requestId}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Reject"
                  )}
                </Button>
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
