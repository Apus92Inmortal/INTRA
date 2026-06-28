"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getOnboardingCtaHref,
  isOnboardingIntent,
  type OnboardingIntent,
} from "@/lib/onboarding";

type OnboardingActionResult = {
  ok: boolean;
  href?: string;
  error?: string;
};

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, userId: user?.id ?? null };
}

export async function saveOnboardingIntentAction(
  intent: OnboardingIntent
): Promise<OnboardingActionResult> {
  if (!isOnboardingIntent(intent)) {
    return { ok: false, error: "Elige una opción válida para continuar." };
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "Inicia sesión para continuar con el onboarding." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_intent: intent })
    .eq("id", userId);

  if (error) {
    return { ok: false, error: "No pudimos guardar tu elección. Intenta nuevamente." };
  }

  return { ok: true };
}

export async function completeOnboardingAction(
  intent: OnboardingIntent
): Promise<OnboardingActionResult> {
  if (!isOnboardingIntent(intent)) {
    return { ok: false, error: "Elige una opción válida para continuar." };
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "Inicia sesión para terminar el onboarding." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      onboarding_intent: intent,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, error: "No pudimos terminar el onboarding. Intenta nuevamente." };
  }

  return { ok: true, href: getOnboardingCtaHref(intent) };
}
