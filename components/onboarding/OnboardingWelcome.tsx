import { ArrowRight, Compass } from "lucide-react";

type OnboardingWelcomeProps = {
  loading?: boolean;
  onStart: () => void;
  onExploreLater: () => void;
};

export function OnboardingWelcome({
  loading = false,
  onStart,
  onExploreLater,
}: OnboardingWelcomeProps) {
  return (
    <section className="rounded-[var(--intra-radius-md)] border border-intra-border bg-intra-card p-5 shadow-[var(--intra-shadow-base)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="intra-icon-shell-emphasis rounded-[var(--intra-radius-xs)] bg-intra-success-soft text-intra-green">
          <Compass className="intra-icon-emphasis" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="intra-title">Bienvenido a INTRA</h1>
          <p className="mt-2 max-w-2xl intra-body text-intra-text-subtle">
            Envía paquetes entre ciudades o aprovecha tus viajes para llevar envíos compatibles.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="intra-btn intra-btn-primary min-h-11 w-full justify-center sm:w-auto"
          onClick={onStart}
          disabled={loading}
        >
          <span className="intra-stable-swap">
            <span className={loading ? "intra-stable-swap-ghost" : ""}>Empezar</span>
            {loading ? <span>Guardando</span> : null}
          </span>
          <ArrowRight className="intra-icon-body" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="intra-btn intra-btn-secondary min-h-11 w-full justify-center sm:w-auto"
          onClick={onExploreLater}
          disabled={loading}
        >
          Explorar después
        </button>
      </div>
    </section>
  );
}
