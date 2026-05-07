import { createClient } from "@/lib/supabase/server"
import { AppNavbar } from "@/components/app-navbar"
import { redirect } from "next/navigation"
import NewTripForm from "./NewTripForm"

function AviationHeroArtwork() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#D7E5F1] bg-[linear-gradient(180deg,#F6FBFF_0%,#EDF7FF_100%)] p-6 shadow-[0_24px_60px_rgba(11,44,74,0.10)]">
      <div className="absolute -right-10 top-4 h-32 w-32 rounded-full bg-[#DFF4E8] blur-2xl" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[#DDEEFF] blur-2xl" />

      <div className="relative space-y-4">
        <div className="inline-flex rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#1E8C4E] shadow-sm">
          Aviación comercial
        </div>

        <div className="relative h-44 rounded-[28px] border border-white/80 bg-white/70 p-5 shadow-inner">
          <div className="absolute left-5 top-10 h-10 w-16 rounded-full bg-white/90 shadow-sm" />
          <div className="absolute left-14 top-6 h-12 w-20 rounded-full bg-white/90 shadow-sm" />
          <div className="absolute right-6 top-8 h-9 w-14 rounded-full bg-white/90 shadow-sm" />
          <div className="absolute right-14 top-16 h-12 w-20 rounded-full bg-white/90 shadow-sm" />

          <div className="absolute bottom-5 left-5 flex items-end gap-2">
            <div className="h-12 w-3 rounded-t-full bg-[#A8C4D7]" />
            <div className="h-20 w-6 rounded-t-[14px] bg-[#0B2C4A]" />
            <div className="mb-16 h-5 w-5 rounded-full border-4 border-[#2ECC71] bg-white" />
          </div>

          <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#CFE3EF] bg-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#1E8C4E]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.5 13.4 13l-2.1-8.4-2.3.6 1.2 8L3 10.5l-1.6 1.7 6.8 3.1 2.1 6.8 1.9-.5-.7-5.7 8.7 2.3z" />
            </svg>
          </div>

          <div className="absolute inset-x-10 bottom-12 border-t border-dashed border-[#9BC8DD]" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <p className="font-semibold text-[#0B2C4A]">Ruta aérea clara</p>
            <p className="mt-1">Presenta mejor tu viaje y da más confianza.</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <p className="font-semibold text-[#0B2C4A]">Resumen en vivo</p>
            <p className="mt-1">Visualiza exactamente lo que verá la comunidad.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function NewTripPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, department, iata_code")
    .order("name", { ascending: true })

  if (error) {
    return (
      <>
        <AppNavbar />
        <main className="min-h-screen bg-[#EEF4F8] px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#0B2C4A]">
              Error cargando ciudades
            </h1>
            <p className="mt-2 text-sm text-gray-600">{error.message}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#EEF4F8] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-center">
            <div className="rounded-[32px] border border-[#D7E5F1] bg-white p-6 shadow-[0_24px_60px_rgba(11,44,74,0.08)] sm:p-8 lg:p-10">
              <div className="inline-flex rounded-full bg-[#EAFBF1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#1E8C4E]">
                Viajes por avión comercial
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#0B2C4A] sm:text-5xl">
                Publica tu viaje
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                Conecta con personas que necesitan enviar paquetes en tu ruta.
              </p>
            </div>

            <AviationHeroArtwork />
          </section>

          <section className="mt-8">
            <NewTripForm cities={cities ?? []} />
          </section>
        </div>
      </main>
    </>
  )
}
