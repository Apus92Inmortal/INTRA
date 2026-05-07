import { createClient } from "@/lib/supabase/server"
import { AppNavbar } from "@/components/app-navbar"
import { redirect } from "next/navigation"
import NewTripForm from "./NewTripForm"

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

      <main className="min-h-screen bg-[#EEF4F8] px-4 py-2.5 sm:px-6 sm:py-3 lg:h-[calc(100dvh-64px)] lg:min-h-0 lg:overflow-hidden [@media(min-width:1024px)_and_(max-height:900px)]:py-2 [@media(min-width:1024px)_and_(max-height:820px)]:h-auto [@media(min-width:1024px)_and_(max-height:820px)]:min-h-screen [@media(min-width:1024px)_and_(max-height:820px)]:overflow-y-auto [@media(min-width:1024px)_and_(max-height:820px)]:py-1.5 [@media(min-width:1024px)_and_(max-height:760px)]:py-1">
        <div className="mx-auto max-w-7xl lg:flex lg:h-full lg:min-h-0 lg:flex-col [@media(min-width:1024px)_and_(max-height:820px)]:h-auto [@media(min-width:1024px)_and_(max-height:820px)]:min-h-0">
          <section className="mb-2 [@media(min-width:1024px)_and_(max-height:900px)]:mb-1.5 [@media(min-width:1024px)_and_(max-height:820px)]:mb-1">
            <h1 className="text-[clamp(1.35rem,1.8vw,1.85rem)] font-bold tracking-tight text-[#0B2C4A] leading-none">
              Publica tu viaje
            </h1>
            <p className="mt-0.5 text-[12px] leading-4 text-slate-500 [@media(min-width:1024px)_and_(max-height:900px)]:text-[11px] [@media(min-width:1024px)_and_(max-height:900px)]:leading-3.5">
              Conecta con personas que necesitan enviar paquetes en tu ruta.
            </p>
          </section>

          <section className="lg:min-h-0 lg:flex-1">
            <NewTripForm cities={cities ?? []} />
          </section>
        </div>
      </main>
    </>
  )
}
