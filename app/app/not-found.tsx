import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="intra-page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-intra-border bg-intra-card p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-intra-success-soft px-3 py-1 text-xs font-semibold text-intra-text-success">
            404
          </span>

          <h1 className="mt-4 text-2xl font-bold text-intra-blue">
            Esta vista no está disponible
          </h1>

          <p className="mt-2 text-sm text-intra-text-subtle">
            El contenido que buscas no existe, ya no está disponible o no tienes acceso.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="intra-btn intra-btn-primary h-12 px-5 text-sm"
            >
              Ir al dashboard
            </Link>

            <Link
              href="/app/matches"
              className="intra-btn intra-btn-secondary h-12 px-5 text-sm"
            >
              Ver mis matches
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
