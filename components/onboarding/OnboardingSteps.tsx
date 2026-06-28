import type { OnboardingStep } from "@/lib/onboarding";

type OnboardingStepsProps = {
  steps: OnboardingStep[];
};

export function OnboardingSteps({ steps }: OnboardingStepsProps) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-3 rounded-[var(--intra-radius-sm)] border border-intra-border bg-intra-card p-4 shadow-[var(--intra-shadow-base)]"
        >
          <span className="intra-icon-shell-body rounded-full bg-intra-success-soft text-intra-green">
            <span className="intra-badge-text text-intra-green">{index + 1}</span>
          </span>
          <span className="min-w-0">
            <span className="block intra-body-strong">{step.title}</span>
            <span className="mt-1 block intra-body text-intra-text-subtle">{step.description}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
