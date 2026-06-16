import Link from "next/link";
import { SearchX } from "lucide-react";

export default function AppNotFound() {
  return (
    <main className="intra-page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-intra-border bg-intra-card p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-intra-info-soft text-intra-info">
            <SearchX className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
          </div>

          <h1 className="mt-4 intra-h1 text-intra-blue">
            Pantalla no encontrada
          </h1>

          <p className="mt-2 intra-body text-intra-text-subtle">
            La ruta no existe o ya no está disponible.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="intra-btn intra-btn-primary h-12 px-5 intra-caption-strong"
            >
              Volver al dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
