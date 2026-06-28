import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { OnboardingIntent } from "@/lib/onboarding";

type OnboardingIntentCardProps = {
  intent: OnboardingIntent;
  title: string;
  description: string;
  ctaLabel: string;
  icon: ReactNode;
  disabled?: boolean;
  onSelect: (intent: OnboardingIntent) => void;
};

export function OnboardingIntentCard({
  intent,
  title,
  description,
  ctaLabel,
  icon,
  disabled = false,
  onSelect,
}: OnboardingIntentCardProps) {
  return (
    <button
      type="button"
      className="group flex min-h-36 w-full flex-col justify-between rounded-[var(--intra-radius-sm)] border border-intra-border bg-intra-card p-4 text-left shadow-[var(--intra-shadow-base)] transition hover:-translate-y-0.5 hover:border-intra-green disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      onClick={() => onSelect(intent)}
      disabled={disabled}
    >
      <span className="flex items-start gap-3">
        <span className="intra-icon-shell-emphasis rounded-[var(--intra-radius-xs)] bg-intra-success-soft text-intra-green">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block intra-subtitle">{title}</span>
          <span className="mt-1 block intra-body text-intra-text-subtle">{description}</span>
        </span>
      </span>

      <span className="mt-4 inline-flex min-h-11 items-center gap-2 intra-body-strong text-intra-green">
        {ctaLabel}
        <ArrowRight className="intra-icon-body transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </button>
  );
}
