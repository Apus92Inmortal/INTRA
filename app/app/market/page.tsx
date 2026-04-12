import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";

type CityRow = {
  name: string;
};

type CityRelation = CityRow | CityRow[] | null;

type TripRow = {
  id: string;
  departure_date: string;
  status: string;
  capacity_kg: number | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type ShipmentRow = {
  id: string;
  kind: string | null;
  description: string | null;
  weight_kg: number | null;
  status: string;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type CompatibleShipmentRow = {
  id: string;
  kind: string | null;
  description: string | null;
  weight_kg: number | null;
  owner_id: string;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type CompatibleTripRow = {
  id: string;
  traveler_id: string;
  departure_date: string;
  capacity_kg: number | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getCityName(city: CityRelation) {
  if (!city) return null;
  if (Array.isArray(city)) return city[0]?.name ?? null;
  return city.name ?? null;
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-[#0B2C4A]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
      {text}
    </div>
  );
}

export default async function MarketPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-10">No autorizado</div>;
  }

  const { data: shipments } = await supabase
    .from("shipments")
    .select(`
      id,
      kind,
      description,
      weight_kg,
      status,
      origin_city:cities!shipments_origin_city_id_fkey(name),
      destination_city:cities!shipments_destination_city_id_fkey(name)
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: trips } = await supabase
    .from("trips")
    .select(`
      id,
      departure_date,
      status,
      capacity_kg,
      origin_city:cities!trips_origin_city_id_fkey(name),
      destination_city:cities!trips_destination_city_id_fkey(name)
    `)
    .eq("traveler_id", user.id)
    .order("created_at", { ascending: false });

  const userTrips = (trips ?? []) as TripRow[];
  const userShipments = (shipments ?? []) as ShipmentRow[];

  let compatibleShipments: CompatibleShipmentRow[] = [];
  let compatibleTrips: CompatibleTripRow[] = [];

  if (userTrips.length > 0) {
    const tripRoutes = userTrips.map((trip) => ({
      origin: getCityName(trip.origin_city),
      destination: getCityName(trip.destination_city),
    }));

    const validTripRoutes = tripRoutes.filter(
      (route) => route.origin && route.destination
    );

    if (validTripRoutes.length > 0) {
      const { data } = await supabase
        .from("shipments")
        .select(`
          id,
          kind,
          description,
          weight_kg,
          owner_id,
          origin_city:cities!shipments_origin_city_id_fkey(name),
          destination_city:cities!shipments_destination_city_id_fkey(name)
        `)
        .eq("status", "open")
        .neq("owner_id", user.id);

      compatibleShipments =
        ((data ?? []) as CompatibleShipmentRow[]).filter((shipment) =>
          validTripRoutes.some(
            (route) =>
              getCityName(shipment.origin_city) === route.origin &&
              getCityName(shipment.destination_city) === route.destination
          )
        );
    }
  }

  if (userShipments.length > 0) {
    const shipmentRoutes = userShipments.map((shipment) => ({
      origin: getCityName(shipment.origin_city),
      destination: getCityName(shipment.destination_city),
    }));

    const validShipmentRoutes = shipmentRoutes.filter(
      (route) => route.origin && route.destination
    );

    if (validShipmentRoutes.length > 0) {
      const { data } = await supabase
        .from("trips")
        .select(`
          id,
          traveler_id,
          departure_date,
          capacity_kg,
          origin_city:cities!trips_origin_city_id_fkey(name),
          destination_city:cities!trips_destination_city_id_fkey(name)
        `)
        .eq("status", "open")
        .neq("traveler_id", user.id);

      compatibleTrips =
        ((data ?? []) as CompatibleTripRow[]).filter((trip) =>
          validShipmentRoutes.some(
            (route) =>
              getCityName(trip.origin_city) === route.origin &&
              getCityName(trip.destination_city) === route.destination
          )
        );
    }
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#EEF2F7]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0B2C4A]">Market</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona tus envíos y viajes, y encuentra opciones compatibles para hacer match.
            </p>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <Link
              href="/app/shipments/new"
              className="rounded-2xl bg-[#0B2C4A] p-6 text-white shadow-sm transition hover:scale-[1.01]"
            >
              <h2 className="text-xl font-semibold">Crear envío</h2>
              <p className="mt-2 text-sm text-white/85">
                Publica un paquete para enviarlo con un viajero.
              </p>
            </Link>

            <Link
              href="/app/trips/new"
              className="rounded-2xl bg-[#2ECC71] p-6 text-white shadow-sm transition hover:scale-[1.01]"
            >
              <h2 className="text-xl font-semibold">Publicar viaje</h2>
              <p className="mt-2 text-sm text-white/90">
                Ofrece espacio en tu viaje para transportar paquetes.
              </p>
            </Link>
          </div>

          <div className="grid gap-6">
            <SectionCard
              title="Mis envíos"
              subtitle="Tus publicaciones activas y su estado actual."
            >
              {userShipments.length === 0 ? (
                <EmptyState text="Aún no tienes envíos publicados." />
              ) : (
                <div className="space-y-4">
                  {userShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0B2C4A]">
                            {shipment.kind || "Envío"} · {shipment.status}
                          </h3>
                          <p className="mt-1 text-sm text-gray-700">
                            Ruta: {getCityName(shipment.origin_city) ?? "Origen"} →{" "}
                            {getCityName(shipment.destination_city) ?? "Destino"}
                          </p>
                          {shipment.description ? (
                            <p className="mt-2 text-sm text-gray-500">
                              {shipment.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-sm text-gray-500">
                          {shipment.weight_kg ? `${shipment.weight_kg} kg` : "Peso no definido"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Mis viajes"
              subtitle="Tus trayectos publicados disponibles para transportar paquetes."
            >
              {userTrips.length === 0 ? (
                <EmptyState text="Aún no tienes viajes publicados." />
              ) : (
                <div className="space-y-4">
                  {userTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0B2C4A]">
                            Viaje · {trip.status}
                          </h3>
                          <p className="mt-1 text-sm text-gray-700">
                            Ruta: {getCityName(trip.origin_city) ?? "Origen"} →{" "}
                            {getCityName(trip.destination_city) ?? "Destino"}
                          </p>
                          <p className="mt-2 text-sm text-gray-500">
                            Capacidad: {trip.capacity_kg ?? 0} kg
                          </p>
                        </div>

                        <div className="text-sm text-gray-500">
                          Sale: {formatDate(trip.departure_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Envíos compatibles con mis viajes"
              subtitle="Opciones que podrían hacer match con tus rutas actuales."
            >
              {compatibleShipments.length === 0 ? (
                <EmptyState text="No hay envíos compatibles por ahora." />
              ) : (
                <div className="space-y-4">
                  {compatibleShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0B2C4A]">
                            {shipment.kind || "Envío disponible"}
                          </h3>
                          <p className="mt-1 text-sm text-gray-700">
                            Ruta: {getCityName(shipment.origin_city) ?? "Origen"} →{" "}
                            {getCityName(shipment.destination_city) ?? "Destino"}
                          </p>
                          {shipment.description ? (
                            <p className="mt-2 text-sm text-gray-500">
                              {shipment.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-sm text-gray-500">
                          {shipment.weight_kg ? `${shipment.weight_kg} kg` : "Sin peso"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Viajes compatibles con mis envíos"
              subtitle="Viajes que podrían transportar alguno de tus paquetes."
            >
              {compatibleTrips.length === 0 ? (
                <EmptyState text="No hay viajes compatibles por ahora." />
              ) : (
                <div className="space-y-4">
                  {compatibleTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0B2C4A]">
                            Viaje disponible
                          </h3>
                          <p className="mt-1 text-sm text-gray-700">
                            Ruta: {getCityName(trip.origin_city) ?? "Origen"} →{" "}
                            {getCityName(trip.destination_city) ?? "Destino"}
                          </p>
                          <p className="mt-2 text-sm text-gray-500">
                            Capacidad: {trip.capacity_kg ?? 0} kg
                          </p>
                        </div>

                        <div className="text-sm text-gray-500">
                          Sale: {formatDate(trip.departure_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </main>
    </>
  );
}