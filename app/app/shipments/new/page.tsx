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
            <h1 className="intra-h1">
              Error cargando ciudades
            </h1>
            <p className="mt-2 intra-body text-intra-text-subtle">{error.message}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNavbar />

      <main className="intra-page-shell px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="mx-auto max-w-5xl">
          <section className="mb-4">
            <p className="intra-badge-text uppercase text-intra-text-success">NUEVO ENVÍO</p>
            <h1 className="mt-1 intra-h1">
              Crear envío
            </h1>
            <p className="mt-2 max-w-3xl intra-body text-intra-text-subtle">
              Completa los datos y continúa al checkout seguro.
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
