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
          <section className="mb-2 [@media(min-width:1024px)_and_(max-height:900px)]:mb-1.5 [@media(min-width:1024px)_and_(max-height:820px)]:mb-1">
            <h1 className="text-[clamp(1.45rem,1.8vw,1.95rem)] font-bold tracking-tight text-intra-blue leading-none">
              Publica tu viaje
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-intra-text-subtle sm:text-sm">
              Conecta con personas que necesitan enviar paquetes en tu ruta.
            </p>
          </section>

          <section>
            <NewTripForm cities={cities ?? []} />
          </section>
        </div>
      </main>
    </>
  )
}
