"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <main className="intra-page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-intra-danger-border bg-intra-card p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-intra-danger-soft text-intra-danger">
            <CircleAlert className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
          </div>

          <h1 className="mt-4 intra-h1 text-intra-blue">
            No pudimos cargar esta pantalla
          </h1>

          <p className="mt-2 intra-body text-intra-text-subtle">
            Intenta nuevamente o vuelve al dashboard.
          </p>

          {error.message ? (
            <div className="mt-4 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 intra-body text-intra-danger">
              {error.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="intra-btn intra-btn-primary h-12 px-5 intra-caption-strong"
            >
              Intentar de nuevo
            </button>

            <Link
              href="/app"
              className="intra-btn intra-btn-secondary h-12 px-5 intra-caption-strong"
            >
              Volver al dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
