import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { createClient } from "@/lib/supabase/server";
import { isOnboardingIntent } from "@/lib/onboarding";
import {
  completeOnboardingAction,
  saveOnboardingIntentAction,
} from "./actions";

type ProfileOnboardingRow = {
  onboarding_completed: boolean | null;
  onboarding_intent: string | null;
};

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/onboarding");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_intent")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as ProfileOnboardingRow | null;

  if (!profile) {
    await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id" });
  }

  if (profile?.onboarding_completed) {
    redirect("/app");
  }

  const initialIntent = isOnboardingIntent(profile?.onboarding_intent)
    ? profile.onboarding_intent
    : null;

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-5 sm:px-6 lg:py-6">
        <div className="mx-auto max-w-4xl">
          <OnboardingFlow
            initialIntent={initialIntent}
            onSaveIntent={saveOnboardingIntentAction}
            onComplete={completeOnboardingAction}
          />
        </div>
      </main>
    </>
  );
}
