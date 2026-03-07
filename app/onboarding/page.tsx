import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { resolveOnboardingState } from "@/lib/onboarding/resolve-onboarding-state";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user?.email) {
    redirect("/login");
  }

  const state = await resolveOnboardingState({ email: user.email });

  return <OnboardingClient state={state} userEmail={user.email} />;
}
