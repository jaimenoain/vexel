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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import {
  acceptInvitation,
  requestAccess,
  createTenant,
} from "@/lib/onboarding/actions";
import type { OnboardingState } from "../../../types/supabase";
import { tenantConfig } from "../../../tenant-system.config";

const POST_ONBOARDING_ROUTE = tenantConfig.routing.postOnboardingRoute;

function isEmailDomainBlacklisted(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return tenantConfig.email.blacklistedDomains.includes(domain);
}

export function OnboardingClient({
  state,
  userEmail,
}: {
  state: OnboardingState;
  userEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDomain, setCreateDomain] = useState("");

  const hideDomainField = isEmailDomainBlacklisted(userEmail);

  async function handleSuccess() {
    const supabase = createClient();
    await supabase.auth.refreshSession();
    router.push(POST_ONBOARDING_ROUTE);
  }

  async function onAcceptInvitation(invitationId: string) {
    setError(null);
    setLoading("accept");
    const result = await acceptInvitation(invitationId);
    setLoading(null);
    if (result.success) {
      await handleSuccess();
    } else {
      setError(result.error);
    }
  }

  async function onRequestAccess(tenantId: string) {
    setError(null);
    setRequestSent(false);
    setLoading("request");
    const result = await requestAccess(tenantId);
    setLoading(null);
    if (result.success) {
      setError(null);
      setRequestSent(true);
    } else {
      setError(result.error);
    }
  }

  async function onCreateTenant() {
    setError(null);
    setLoading("create");
    const result = await createTenant(
      createName.trim(),
      createDomain.trim() || undefined
    );
    setLoading(null);
    if (result.success) {
      await handleSuccess();
    } else {
      setError(result.error);
    }
  }

  if (state.kind === "has_invite") {
    const tenantName = state.tenantName ?? "this workspace";
    const expiresAt = state.invitation.expires_at
      ? new Date(state.invitation.expires_at).toLocaleDateString(undefined, {
          dateStyle: "medium",
        })
      : null;

    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join <strong>{tenantName}</strong> as{" "}
            <strong>{state.invitation.role}</strong>.
            {expiresAt && (
              <span className="block mt-2 text-muted-foreground">
                Invitation expires {expiresAt}.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => onAcceptInvitation(state.invitation.id)}
            disabled={loading !== null}
          >
            {loading === "accept" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Accept Invitation
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state.kind === "pending_request") {
    const tenantName = state.tenantName ?? "this workspace";

    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Request pending</CardTitle>
          <CardDescription>
            Your request to join <strong>{tenantName}</strong> is pending.
            You&apos;ll get access once an admin approves it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state.kind === "domain_match" && !showCreateForm) {
    const tenantName = state.tenant.name;

    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join workspace</CardTitle>
          <CardDescription>
            Your email matches <strong>{tenantName}</strong>. Request access or
            create a new workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {requestSent && (
            <p className="text-sm text-muted-foreground">
              Request sent. You&apos;ll get access once an admin approves it.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onRequestAccess(state.tenant.id)}
              disabled={loading !== null || requestSent}
            >
              {loading === "request" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {requestSent ? "Request sent" : "Request Access"}
            </Button>
            <Button
              variant="link"
              className="px-0"
              onClick={() => setShowCreateForm(true)}
            >
              Create a new workspace instead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create workspace</CardTitle>
        <CardDescription>
          {showCreateForm
            ? "Create a new workspace for your team."
            : "Get started by creating your workspace."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <Input
            id="workspace-name"
            placeholder="Acme Inc"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            disabled={loading !== null}
          />
        </div>
        {!hideDomainField && (
          <div className="space-y-2">
            <Label htmlFor="company-domain">Company Domain (optional)</Label>
            <Input
              id="company-domain"
              placeholder="acme.com"
              value={createDomain}
              onChange={(e) => setCreateDomain(e.target.value)}
              disabled={loading !== null}
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex gap-2">
          {showCreateForm && (
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(false)}
              disabled={loading !== null}
            >
              Back
            </Button>
          )}
          <Button
            onClick={onCreateTenant}
            disabled={loading !== null || !createName.trim()}
          >
            {loading === "create" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Create Workspace
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
