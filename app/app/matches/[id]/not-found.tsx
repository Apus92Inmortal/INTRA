import Link from "next/link";
import { MessageCircleOff } from "lucide-react";

export default function MatchNotFound() {
  return (
    <main className="intra-page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center rounded-3xl border border-intra-border bg-intra-card p-6 text-center shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-intra-info-soft text-intra-info">
            <MessageCircleOff className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
          </div>

          <h1 className="mt-4 intra-h1 text-intra-blue">
            Match no encontrado
          </h1>

          <p className="mt-2 intra-body text-intra-text-muted">
            Este match ya no está disponible o no tienes acceso.
          </p>

          <div className="mt-6 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/app/matches"
              className="intra-btn intra-btn-primary h-12 w-full px-5 text-center intra-caption-strong sm:w-auto"
            >
              Volver a Matches
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
