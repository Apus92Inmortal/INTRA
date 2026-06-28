"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, LayoutDashboard, PackageCheck, Plane } from "lucide-react";
import {
  getOnboardingCtaLabel,
  getOnboardingSteps,
  isOnboardingIntent,
  type OnboardingIntent,
} from "@/lib/onboarding";
import { OnboardingIntentCard } from "./OnboardingIntentCard";
import { OnboardingSteps } from "./OnboardingSteps";
import { OnboardingWelcome } from "./OnboardingWelcome";

type OnboardingActionResult = {
  ok: boolean;
  href?: string;
  error?: string;
};

type OnboardingFlowProps = {
  initialIntent?: OnboardingIntent | null;
  onSaveIntent: (intent: OnboardingIntent) => Promise<OnboardingActionResult>;
  onComplete: (intent: OnboardingIntent) => Promise<OnboardingActionResult>;
};

type OnboardingScreen = "welcome" | "intent" | "guide";

const intentCards = [
  {
    intent: "send",
    title: "Enviar un paquete",
    description: "Publica tu envío y encuentra viajeros compatibles.",
    ctaLabel: "Crear envío",
    icon: <PackageCheck className="intra-icon-emphasis" aria-hidden="true" />,
  },
  {
    intent: "travel",
    title: "Viajar y llevar envíos",
    description: "Publica tu ruta y recibe solicitudes compatibles.",
    ctaLabel: "Publicar viaje",
    icon: <Plane className="intra-icon-emphasis" aria-hidden="true" />,
  },
  {
    intent: "explore",
    title: "Solo quiero explorar",
    description: "Conoce la app antes de publicar.",
    ctaLabel: "Ir al dashboard",
    icon: <LayoutDashboard className="intra-icon-emphasis" aria-hidden="true" />,
  },
] satisfies Array<{
  intent: OnboardingIntent;
  title: string;
  description: string;
  ctaLabel: string;
  icon: ReactNode;
}>;

export function OnboardingFlow({
  initialIntent = null,
  onSaveIntent,
  onComplete,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<OnboardingScreen>(initialIntent ? "guide" : "welcome");
  const [intent, setIntent] = useState<OnboardingIntent | null>(initialIntent);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const chooseIntent = (nextIntent: OnboardingIntent) => {
    setMessage(null);
    setIntent(nextIntent);

    startTransition(async () => {
      const result = await onSaveIntent(nextIntent);
      if (!result.ok) {
        setMessage(result.error ?? "No pudimos guardar tu elección.");
        return;
      }
      setScreen("guide");
    });
  };

  const complete = (nextIntent: OnboardingIntent) => {
    setMessage(null);

    startTransition(async () => {
      const result = await onComplete(nextIntent);
      if (!result.ok || !result.href) {
        setMessage(result.error ?? "No pudimos terminar el onboarding.");
        return;
      }
      router.push(result.href);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-[var(--intra-radius-xs)] border border-intra-danger-border bg-intra-danger-soft px-4 py-3 intra-body text-intra-danger">
          {message}
        </div>
      ) : null}

      {screen === "welcome" ? (
        <OnboardingWelcome
          loading={isPending}
          onStart={() => setScreen("intent")}
          onExploreLater={() => complete("explore")}
        />
      ) : null}

      {screen === "intent" ? (
        <section className="space-y-4">
          <div>
            <h1 className="intra-title">¿Qué quieres hacer primero?</h1>
            <p className="mt-2 max-w-2xl intra-body text-intra-text-subtle">
              Elige una intención inicial. Puedes cambiar de ruta cuando quieras.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {intentCards.map((card) => (
              <OnboardingIntentCard
                key={card.intent}
                {...card}
                disabled={isPending}
                onSelect={chooseIntent}
              />
            ))}
          </div>
        </section>
      ) : null}

      {screen === "guide" && isOnboardingIntent(intent) ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="intra-title">Primeros pasos</h1>
              <p className="mt-2 max-w-2xl intra-body text-intra-text-subtle">
                Sigue esta guía corta y termina en una acción real.
              </p>
            </div>
            <button
              type="button"
              className="intra-btn intra-btn-secondary min-h-11 w-full justify-center sm:w-auto"
              onClick={() => setScreen("intent")}
              disabled={isPending}
            >
              <ArrowLeft className="intra-icon-body" aria-hidden="true" />
              Cambiar elección
            </button>
          </div>

          <OnboardingSteps steps={getOnboardingSteps(intent)} />

          <div className="rounded-[var(--intra-radius-sm)] border border-intra-success-border bg-intra-success-soft p-4">
            <div className="flex items-start gap-3">
              <span className="intra-icon-shell-body rounded-full bg-intra-card text-intra-green">
                <CheckCircle2 className="intra-icon-body" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="intra-body-strong">Listo para continuar</p>
                <p className="mt-1 intra-body text-intra-text-subtle">
                  Marcaremos el onboarding como completado antes de llevarte al siguiente paso.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="intra-btn intra-btn-primary mt-4 min-h-11 w-full justify-center sm:w-auto"
              onClick={() => complete(intent)}
              disabled={isPending}
            >
              <span className="intra-stable-swap">
                <span className={isPending ? "intra-stable-swap-ghost" : ""}>
                  {getOnboardingCtaLabel(intent)}
                </span>
                {isPending ? <span>Guardando</span> : null}
              </span>
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
