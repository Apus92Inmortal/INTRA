import { createClient } from "@/lib/supabase/server"
import { AppNavbar } from "@/components/app-navbar"
import { redirect } from "next/navigation"
import NewTripForm from "./NewTripForm"

function AviationHeroArtwork() {
  return (
    <div className="relative h-[120px] overflow-hidden rounded-[28px] border border-[#D7E5F1] bg-[linear-gradient(180deg,#F8FBFE_0%,#EEF5FB_100%)] px-5 py-4 shadow-[0_18px_44px_rgba(11,44,74,0.08)] sm:h-[132px] sm:px-6">
      <div className="absolute -left-8 bottom-0 h-16 w-16 rounded-full bg-[#DDEEFF] blur-2xl" />
      <div className="absolute right-8 top-3 h-10 w-20 rounded-full bg-white/85 blur-[1px]" />
      <div className="absolute right-24 top-6 h-8 w-16 rounded-full bg-white/75 blur-[1px]" />
      <div className="absolute left-20 top-4 h-7 w-14 rounded-full bg-white/75 blur-[1px]" />

      <div className="absolute bottom-4 right-4 hidden items-end gap-2 sm:flex">
        <div className="h-10 w-2.5 rounded-t-full bg-[#B5CBD8]" />
        <div className="h-16 w-5 rounded-t-[12px] bg-[#A7BDCB]" />
        <div className="mb-12 h-4 w-4 rounded-full border-[3px] border-[#2ECC71] bg-white" />
      </div>

      <div className="absolute right-6 top-1/2 -translate-y-1/2 sm:right-10">
        <svg viewBox="0 0 320 120" className="h-[72px] w-[180px] text-[#AFC6D5] sm:h-[88px] sm:w-[230px]" fill="none" aria-hidden="true">
          <path d="M22 65c56-11 112-20 168-24 42-4 77-2 108 5" stroke="currentColor" strokeDasharray="6 8" strokeWidth="2" opacity=".35" />
          <g transform="translate(104 16) rotate(-8 60 30)">
            <path d="M118 42 71 34 39 3 28 6l18 28-28 3L3 28l-3 7 18 12 7 25 9-2-1-22 48 14c14 4 28-4 37-20Z" fill="#ffffff" stroke="#C7DAE6" strokeWidth="2" />
          </g>
        </svg>
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

      <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_360px] lg:items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#0B2C4A] sm:text-[46px]">
                Publica tu viaje
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Conecta con personas que necesitan enviar paquetes en tu ruta.
              </p>
            </div>

            <AviationHeroArtwork />
          </section>

          <section className="mt-4">
            <NewTripForm cities={cities ?? []} />
          </section>
        </div>
      </main>
    </>
  )
}
