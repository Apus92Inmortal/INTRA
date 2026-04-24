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
        <main className="min-h-screen bg-[#EEF2F7] px-4 py-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#0B2C4A]">
              Error cargando ciudades
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {error.message}
            </p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          
          {/* Encabezado */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-[#0B2C4A]">
              Crear envío
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              Publica un envío para conectar con viajeros en la misma ruta.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-8">
            <NewShipmentForm cities={cities ?? []} />
          </div>
        </div>
      </main>
    </>
  )
}
