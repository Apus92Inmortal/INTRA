import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import NewShipmentForm from "./NewShipmentForm"

export default async function NewShipmentPage() {
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

      <main className="min-h-screen bg-[#EEF4F8] px-4 py-3 sm:px-6 sm:py-4 lg:py-5">
        <div className="mx-auto max-w-7xl">
          <section className="mb-3">
            <h1 className="text-[clamp(1.45rem,1.8vw,1.95rem)] font-bold leading-none tracking-tight text-[#0B2C4A]">
              Crear envío
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-slate-500 sm:text-sm">
              Publica un envío para conectar con viajeros en la misma ruta.
            </p>
          </section>

          <section>
            <NewShipmentForm cities={cities ?? []} />
          </section>
        </div>
      </main>
    </>
  )
}
