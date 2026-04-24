"use client";

import Link from "next/link";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <main className="min-h-screen bg-[#EEF2F7] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              />
            </svg>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-[#0B2C4A]">
            No pudimos cargar esta vista
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Ocurrió un problema al consultar la información. Puedes reintentar ahora.
          </p>

          {error.message ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Reintentar
            </button>

            <Link
              href="/app"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Volver al dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
