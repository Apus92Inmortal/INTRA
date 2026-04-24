import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="min-h-screen bg-[#EEF2F7] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-[#EFFBF4] px-3 py-1 text-xs font-semibold text-[#2ECC71]">
            404
          </span>

          <h1 className="mt-4 text-2xl font-bold text-[#0B2C4A]">
            Esta vista no está disponible
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            El contenido que buscas no existe, ya no está disponible o no tienes acceso.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Ir al dashboard
            </Link>

            <Link
              href="/app/matches"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Ver mis matches
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
