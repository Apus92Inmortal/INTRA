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
        <main className="intra-page-shell px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-[24px] border border-intra-danger-border bg-intra-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-intra-blue">
              Error cargando ciudades
            </h1>
            <p className="mt-2 text-sm text-intra-text-subtle">{error.message}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNavbar />

      <main className="intra-page-shell px-4 py-3 sm:px-6 sm:py-4 lg:py-5">
        <div className="mx-auto max-w-7xl">
          <section className="mb-3">
            <h1 className="text-[clamp(1.45rem,1.8vw,1.95rem)] font-bold leading-none tracking-tight text-intra-blue">
              Crear envío
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-intra-text-subtle sm:text-sm">
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
