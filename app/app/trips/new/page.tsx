import { createClient } from "@/lib/supabase/server"
import NewTripForm from "./NewTripForm"

export default async function NewTripPage() {
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
      <h1 className="text-3xl font-bold">Publicar viaje</h1>
      <p className="mt-2 text-sm opacity-80">
        Publica un viaje para que puedas transportar envios y ganar dinero.
      </p>

      <div className="mt-6">
        <NewTripForm cities={cities ?? []} />
      </div>
    </main>
  )
}
