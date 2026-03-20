import { AppNavbar } from "@/components/app-navbar";
import { createClient } from "@/lib/supabase/server"
import MatchButton from "./MatchButton"

export default async function MarketPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div className="p-10">No autorizado</div>

  // 1) Mis envios
  const { data: myShipments } = await supabase
    .from("shipments")
    .select(
      `
      id,
      kind,
      description,
      status,
      created_at,
      origin:origin_city_id ( id, name, department, iata_code ),
      destination:destination_city_id ( id, name, department, iata_code )
    `
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })

  // 2) Mis viajes
  const { data: myTrips } = await supabase
    .from("trips")
    .select(
      `
      id,
      departure_date,
      status,
      created_at,
      origin:origin_city_id ( id, name, department, iata_code ),
      destination:destination_city_id ( id, name, department, iata_code )
    `
    )
    .eq("traveler_id", user.id)
    .order("created_at", { ascending: false })

  const openMyShipments = (myShipments ?? []).filter((s: any) => s.status === "open")
  const openMyTrips = (myTrips ?? []).filter((t: any) => t.status === "open")

  // 3) Envios compatibles con MIS viajes abiertos (VIAJERO solicita)
  let compatibleShipments: any[] = []
  if (openMyTrips.length > 0) {
    const routes = openMyTrips.map((t: any) => ({
      o: t.origin?.id,
      d: t.destination?.id,
    }))

    const or = routes
      .filter((r) => r.o && r.d)
      .map((r) => `and(origin_city_id.eq.${r.o},destination_city_id.eq.${r.d})`)
      .join(",")

    if (or) {
      const { data } = await supabase
        .from("shipments")
        .select(
          `
          id,
          kind,
          description,
          status,
          created_at,
          owner_id,
          origin:origin_city_id ( id, name, department, iata_code ),
          destination:destination_city_id ( id, name, department, iata_code )
        `
        )
        .eq("status", "open")
        .neq("owner_id", user.id)
        .or(or)
        .order("created_at", { ascending: false })

      compatibleShipments = data ?? []
    }
  }

  // 4) Viajes compatibles con MIS envios abiertos (INFO, sin boton)
  // (en modelo Uber el cliente NO solicita; el viajero lo hace)
  let compatibleTrips: any[] = []
  if (openMyShipments.length > 0) {
    const routes = openMyShipments.map((s: any) => ({
      o: s.origin?.id,
      d: s.destination?.id,
    }))

    const or = routes
      .filter((r) => r.o && r.d)
      .map((r) => `and(origin_city_id.eq.${r.o},destination_city_id.eq.${r.d})`)
      .join(",")

    if (or) {
      const { data } = await supabase
        .from("trips")
        .select(
          `
          id,
          departure_date,
          status,
          created_at,
          traveler_id,
          origin:origin_city_id ( id, name, department, iata_code ),
          destination:destination_city_id ( id, name, department, iata_code )
        `
        )
        .eq("status", "open")
        .neq("traveler_id", user.id)
        .or(or)
        .order("created_at", { ascending: false })

      compatibleTrips = data ?? []
    }
  }

  return (
    <main className="p-10">
      <AppNavbar />

      <h1 className="text-3xl font-bold">Market</h1>
      <p className="mt-2 text-sm opacity-80">
        Tus envios, tus viajes y opciones compatibles para hacer match.
      </p>

      <div className="mt-6 flex gap-3">
        <a className="rounded-md bg-black text-white px-4 py-2" href="/app/shipments/new">
          Crear envio
        </a>
        <a className="rounded-md border px-4 py-2" href="/app/trips/new">
          Publicar viaje
        </a>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Mis envios</h2>
        {!myShipments || myShipments.length === 0 ? (
          <p className="mt-2 text-sm opacity-80">Aun no tienes envios.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {myShipments.map((s: any) => (
              <div key={s.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold">
                    {String(s.kind).toUpperCase()} • {s.status}
                  </div>
                  <div className="text-xs opacity-70">{new Date(s.created_at).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-sm">
                  <b>Ruta:</b> {s.origin?.name} → {s.destination?.name}
                </div>
                <div className="mt-2 text-sm">
                  <b>Descripcion:</b> {s.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Mis viajes</h2>
        {!myTrips || myTrips.length === 0 ? (
          <p className="mt-2 text-sm opacity-80">Aun no has publicado viajes.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {myTrips.map((t: any) => (
              <div key={t.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold">Viaje • {t.status}</div>
                  <div className="text-xs opacity-70">Sale: {t.departure_date}</div>
                </div>
                <div className="mt-2 text-sm">
                  <b>Ruta:</b> {t.origin?.name} → {t.destination?.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Envios compatibles con mis viajes</h2>

        {openMyTrips.length === 0 && (
          <p className="mt-2 text-sm opacity-80">
            Publica un viaje para poder solicitar transportar envios compatibles.
          </p>
        )}

        {compatibleShipments.length === 0 ? (
          <p className="mt-2 text-sm opacity-80">No hay envios compatibles por ahora.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {compatibleShipments.map((s: any) => {
              const matchingTrip = openMyTrips.find(
                (t: any) =>
                  t.origin?.id === s.origin?.id &&
                  t.destination?.id === s.destination?.id
              )

              return (
                <div key={s.id} className="rounded-xl border p-4">
                  <div className="font-semibold">
                    {String(s.kind).toUpperCase()} • {s.origin?.name} → {s.destination?.name}
                  </div>
                  <div className="mt-2 text-sm">{s.description}</div>

                  <div className="mt-3">
                    {matchingTrip ? (
                      <MatchButton shipmentId={s.id} tripId={matchingTrip.id} />
                    ) : (
                      <div className="text-sm opacity-70">
                        No tienes un viaje abierto para esta ruta.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Viajes compatibles con mis envios</h2>
        {compatibleTrips.length === 0 ? (
          <p className="mt-2 text-sm opacity-80">No hay viajes compatibles por ahora.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {compatibleTrips.map((t: any) => (
              <div key={t.id} className="rounded-xl border p-4">
                <div className="font-semibold">
                  Viaje • {t.origin?.name} → {t.destination?.name}
                </div>
                <div className="mt-2 text-sm">Sale: {t.departure_date}</div>

                <div className="mt-3 text-sm opacity-80">
                  En modelo tipo Uber, el viajero es quien solicita el match desde su market.
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 text-sm">
        <a className="underline" href="/app">
          Volver a /app
        </a>
      </p>
    </main>
  )
}
