import { CheckCircle2 } from "lucide-react";
import type { OnboardingIntent } from "@/lib/onboarding";
import { getOnboardingIntentLabel, isOnboardingIntent } from "@/lib/onboarding";

type FirstStepsCardProps = {
  intent?: string | null;
};

const checklist = [
  "Completa tu perfil.",
  "Crea tu primer envío o publica tu primer viaje.",
  "Revisa tus matches.",
  "Coordina por chat dentro de INTRA.",
];

export function FirstStepsCard({ intent }: FirstStepsCardProps) {
  const normalizedIntent: OnboardingIntent = isOnboardingIntent(intent) ? intent : "send";
  const actionLabel = getOnboardingIntentLabel(normalizedIntent);

  return (
    <section className="rounded-[var(--intra-radius-sm)] border border-intra-border bg-intra-card p-4 shadow-[var(--intra-shadow-base)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="intra-subtitle">Empieza con INTRA</h2>
          <p className="mt-1 max-w-2xl intra-body text-intra-text-subtle">
            Publica tu primer envío o viaje para encontrar coincidencias compatibles.
          </p>
        </div>
        <span className="intra-pill w-fit shrink-0 bg-intra-success-soft text-intra-green">
          {actionLabel}
        </span>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {checklist.map((item) => (
          <li key={item} className="flex min-w-0 items-start gap-2">
            <CheckCircle2 className="mt-0.5 intra-icon-body shrink-0 text-intra-green" aria-hidden="true" />
            <span className="intra-body text-intra-text-subtle">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
