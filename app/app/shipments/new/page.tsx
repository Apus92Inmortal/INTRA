import { createClient } from "@/lib/supabase/server"
import NewShipmentForm from "./NewShipmentForm"

export default async function NewShipmentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div className="p-10">No autorizado</div>

  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, department, iata_code")
    .order("name", { ascending: true })

  if (error) {
    return <div className="p-10">Error cargando ciudades: {error.message}</div>
  }

  return (
    <main className="p-10 max-w-2xl">
      <h1 className="text-3xl font-bold">Crear envio</h1>
      <p className="mt-2 text-sm opacity-80">
        Crea un envio para que un viajero lo pueda transportar.
      </p>

      <div className="mt-6">
        <NewShipmentForm cities={cities ?? []} />
      </div>
    </main>
  )
}
