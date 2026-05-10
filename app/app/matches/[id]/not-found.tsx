import Link from "next/link";

export default function MatchNotFound() {
  return (
    <main className="intra-page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-intra-border bg-intra-card p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-intra-success-soft px-3 py-1 text-xs font-semibold text-intra-green">
            Match no disponible
          </span>

          <h1 className="mt-4 text-2xl font-bold text-intra-blue">
            No encontramos este match
          </h1>

          <p className="mt-2 text-sm text-intra-text-muted">
            Puede que no exista, ya no te pertenezca o no tengas permisos para verlo.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app/matches"
              className="intra-btn h-12 bg-intra-blue px-5 text-sm text-intra-card hover:opacity-95"
            >
              Volver a matches
            </Link>

            <Link
              href="/app"
              className="intra-btn intra-btn-secondary h-12 px-5 text-sm text-intra-text-muted"
            >
              Ir al dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
