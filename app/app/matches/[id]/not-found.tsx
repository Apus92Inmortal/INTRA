import Link from "next/link";
import { MessageCircleOff } from "lucide-react";

export default function MatchNotFound() {
  return (
    <main className="intra-page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-intra-border bg-intra-card p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-intra-info-soft text-intra-info">
            <MessageCircleOff className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
          </div>

          <h1 className="mt-4 intra-h1 text-intra-blue">
            Match no encontrado
          </h1>

          <p className="mt-2 intra-body text-intra-text-muted">
            Este match ya no está disponible o no tienes acceso.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app/matches"
              className="intra-btn intra-btn-primary h-12 px-5 intra-caption-strong"
            >
              Volver a Matches
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
