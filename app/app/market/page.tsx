import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import MatchButton from "./MatchButton";
import MarketRealtime from "./MarketRealtime";
import { RatingSummaryBadge } from "@/components/rating-summary-badge";
import { getShipmentKindLabel, getStatusLabel } from "@/lib/labels";
import {
  getPendingPaymentLabel,
  isShipmentPaymentReady,
  isShipmentPaymentRetryable,
} from "@/lib/payments/shipment-payment-state";
import { fetchRatingSummaryMap } from "@/lib/reviews";

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
  declared_value_cop: number | null;
  status: string;
  origin_city_id: string | null;
  destination_city_id: string | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type CompatibleShipmentRow = {
  id: string;
  kind: string | null;
  description: string | null;
  weight_kg: number | null;
  declared_value_cop: number | null;
  owner_id: string;
  origin_city_id: string | null;
  destination_city_id: string | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type PaymentRow = {
  id: string;
  shipment_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string;
};

type CompatibleTripRow = {
  id: string;
  traveler_id: string;
  departure_date: string;
  capacity_kg: number | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
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
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
    >
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
    redirect("/login");
  }

  const { data: shipments, error: shipmentsError } = await supabase
    .from("shipments")
    .select(`
      id,
      kind,
      description,
      weight_kg,
      declared_value_cop,
      status,
      origin_city_id,
      destination_city_id,
      origin_city:cities!shipments_origin_city_id_fkey(name),
      destination_city:cities!shipments_destination_city_id_fkey(name)
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (shipmentsError) {
    throw new Error(`Error cargando envíos: ${shipmentsError.message}`);
  }

  const { data: trips, error: tripsError } = await supabase
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

  if (tripsError) {
    throw new Error(`Error cargando viajes: ${tripsError.message}`);
  }

  const userTrips = (trips ?? []) as TripRow[];
  const userShipments = (shipments ?? []) as ShipmentRow[];
  const userShipmentIds = userShipments.map((shipment) => shipment.id);

  const { data: userShipmentPayments } = userShipmentIds.length
    ? await supabase
        .from("payments")
        .select("id, shipment_id, amount, status, created_at")
        .in("shipment_id", userShipmentIds)
        .order("created_at", { ascending: false })
    : { data: [] as PaymentRow[] };

  const latestPaymentByShipment = new Map<string, PaymentRow>();
  for (const payment of ((userShipmentPayments ?? []) as PaymentRow[])) {
    if (!payment.shipment_id || latestPaymentByShipment.has(payment.shipment_id)) {
      continue;
    }

    latestPaymentByShipment.set(payment.shipment_id, payment);
  }

  const pendingPaymentShipments = userShipments.filter(
    (shipment) => !isShipmentPaymentReady(latestPaymentByShipment.get(shipment.id)?.status)
  );
  const readyUserShipments = userShipments.filter((shipment) =>
    isShipmentPaymentReady(latestPaymentByShipment.get(shipment.id)?.status)
  );

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
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          id,
          kind,
          description,
          weight_kg,
          declared_value_cop,
          owner_id,
          origin_city_id,
          destination_city_id,
          origin_city:cities!shipments_origin_city_id_fkey(name),
          destination_city:cities!shipments_destination_city_id_fkey(name)
        `)
        .eq("status", "open")
        .neq("owner_id", user.id);

      if (error) {
        throw new Error(`Error cargando envíos compatibles: ${error.message}`);
      }

      const compatibleShipmentCandidates = (data ?? []) as CompatibleShipmentRow[];
      const compatibleShipmentIds = compatibleShipmentCandidates.map((shipment) => shipment.id);
      const { data: compatibleShipmentPayments } = compatibleShipmentIds.length
        ? await supabase
            .from("payments")
            .select("id, shipment_id, amount, status, created_at")
            .in("shipment_id", compatibleShipmentIds)
            .order("created_at", { ascending: false })
        : { data: [] as PaymentRow[] };

      const latestCompatiblePaymentByShipment = new Map<string, PaymentRow>();
      for (const payment of ((compatibleShipmentPayments ?? []) as PaymentRow[])) {
        if (!payment.shipment_id || latestCompatiblePaymentByShipment.has(payment.shipment_id)) {
          continue;
        }

        latestCompatiblePaymentByShipment.set(payment.shipment_id, payment);
      }

      compatibleShipments =
        compatibleShipmentCandidates.filter(
          (shipment) =>
            isShipmentPaymentReady(latestCompatiblePaymentByShipment.get(shipment.id)?.status) &&
            validTripRoutes.some(
              (route) =>
                getCityName(shipment.origin_city) === route.origin &&
                getCityName(shipment.destination_city) === route.destination
            )
        );
    }
  }

  if (readyUserShipments.length > 0) {
    const shipmentRoutes = readyUserShipments.map((shipment) => ({
      origin: getCityName(shipment.origin_city),
      destination: getCityName(shipment.destination_city),
    }));

    const validShipmentRoutes = shipmentRoutes.filter(
      (route) => route.origin && route.destination
    );

    if (validShipmentRoutes.length > 0) {
      const { data, error } = await supabase
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

      if (error) {
        throw new Error(`Error cargando viajes compatibles: ${error.message}`);
      }

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

  const counterpartIds = Array.from(
    new Set([
      ...compatibleShipments.map((shipment) => shipment.owner_id),
      ...compatibleTrips.map((trip) => trip.traveler_id),
    ])
  );

  const { data: counterpartProfiles } = counterpartIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", counterpartIds)
    : { data: [] as ProfileRow[] };

  const counterpartNameById = new Map<string, string>(
    ((counterpartProfiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Usuario INTRA",
    ])
  );

  const counterpartRatingSummaryMap = await fetchRatingSummaryMap(
    supabase,
    counterpartIds
  );

  return (
    <>
      <AppNavbar />
      <MarketRealtime currentUserId={user.id} />

      <main className="min-h-screen bg-[#EEF2F7]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0B2C4A]">Market</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona tus envíos y viajes, y encuentra opciones compatibles para hacer match.
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <Link
              href="/app/shipments/new"
              className="min-h-28 rounded-2xl bg-[#0B2C4A] p-5 text-white shadow-sm transition hover:scale-[1.01] sm:p-6"
            >
              <h2 className="text-xl font-semibold">Crear envío</h2>
              <p className="mt-2 text-sm text-white/85">
                Publica un paquete para enviarlo con un viajero.
              </p>
            </Link>

            <Link
              href="/app/trips/new"
              className="min-h-28 rounded-2xl bg-[#2ECC71] p-5 text-white shadow-sm transition hover:scale-[1.01] sm:p-6"
            >
              <h2 className="text-xl font-semibold">Publicar viaje</h2>
              <p className="mt-2 text-sm text-white/90">
                Ofrece espacio en tu viaje para transportar paquetes.
              </p>
            </Link>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-3 sm:hidden">
            <Link href="#pendientes-de-pago" className="flex min-h-11 items-center justify-center rounded-xl bg-[#FFF4E5] px-3 py-2 text-center text-sm font-medium text-amber-900">Pendientes</Link>
            <Link href="#mis-envios" className="flex min-h-11 items-center justify-center rounded-xl bg-[#EEF2F7] px-3 py-2 text-center text-sm font-medium text-[#0B2C4A]">Mis envíos</Link>
            <Link href="#mis-viajes" className="flex min-h-11 items-center justify-center rounded-xl bg-[#EEF2F7] px-3 py-2 text-center text-sm font-medium text-[#0B2C4A]">Mis viajes</Link>
            <Link href="#envios-compatibles" className="flex min-h-11 items-center justify-center rounded-xl bg-[#EEF2F7] px-3 py-2 text-center text-sm font-medium text-[#0B2C4A]">Envíos compatibles</Link>
            <Link href="#viajes-compatibles" className="flex min-h-11 items-center justify-center rounded-xl bg-[#EEF2F7] px-3 py-2 text-center text-sm font-medium text-[#0B2C4A]">Viajes compatibles</Link>
          </div>

          <div className="grid gap-6">
            <SectionCard
              id="pendientes-de-pago"
              title="Pendientes de pago"
              subtitle="Completa el checkout para que tus envíos se publiquen y aparezcan en el market."
            >
              {pendingPaymentShipments.length === 0 ? (
                <EmptyState text="No tienes envíos pendientes de pago." />
              ) : (
                <div className="space-y-4">
                  {pendingPaymentShipments.map((shipment) => {
                    const latestPayment = latestPaymentByShipment.get(shipment.id) ?? null;
                    const checkoutHref = latestPayment?.id && isShipmentPaymentRetryable(latestPayment.status)
                      ? `/app/payments/checkout?retryPaymentId=${latestPayment.id}`
                      : `/app/payments/checkout?shipmentId=${shipment.id}`;

                    return (
                      <div
                        key={shipment.id}
                        className="rounded-2xl border border-amber-200 bg-[#FFFDF7] p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                {getPendingPaymentLabel(latestPayment?.status)}
                              </span>
                              <span className="text-xs text-amber-400">{getStatusLabel(shipment.status)}</span>
                            </div>
                            <h3 className="text-base font-semibold text-[#0B2C4A]">
                              {getShipmentKindLabel(shipment.kind)}
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

                          <div className="flex flex-col items-start gap-3 text-sm text-gray-500 md:items-end">
                            <div>
                              {shipment.weight_kg ? `${shipment.weight_kg} kg` : "Peso pendiente"}
                            </div>
                            <Link
                              href={checkoutHref}
                              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                            >
                              Ir al checkout
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard
              id="mis-envios"
              title="Mis envíos"
              subtitle="Tus publicaciones activas y su estado actual."
            >
              {readyUserShipments.length === 0 ? (
                <EmptyState text="Aún no tienes envíos publicados." />
              ) : (
                <div className="space-y-4">
                  {readyUserShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0B2C4A]">
                            {getShipmentKindLabel(shipment.kind)} · {getStatusLabel(shipment.status)}
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
              id="mis-viajes"
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
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0B2C4A]">
                            Viaje · {getStatusLabel(trip.status)}
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
              id="envios-compatibles"
              title="Envíos compatibles con mis viajes"
              subtitle="Opciones que podrían hacer match con tus rutas actuales."
            >
              {compatibleShipments.length === 0 ? (
                <EmptyState text="No hay envíos compatibles por ahora." />
              ) : (
                <div className="space-y-4">
                  {compatibleShipments.map((shipment) => {
                    const matchingTrip = userTrips.find(
                      (trip) =>
                        getCityName(trip.origin_city) === getCityName(shipment.origin_city) &&
                        getCityName(trip.destination_city) === getCityName(shipment.destination_city) &&
                        trip.status === "open"
                    );

                    return (
                      <div
                        key={shipment.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-base font-semibold text-[#0B2C4A]">
                              {getShipmentKindLabel(shipment.kind)}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                              <span>
                                Cliente: {counterpartNameById.get(shipment.owner_id) ?? "Usuario INTRA"}
                              </span>
                              <RatingSummaryBadge
                                avgRating={counterpartRatingSummaryMap[shipment.owner_id]?.avgRating ?? null}
                                totalReviews={counterpartRatingSummaryMap[shipment.owner_id]?.totalReviews ?? 0}
                              />
                            </div>
                            <p className="mt-1 text-sm text-gray-700">
                              Ruta: {getCityName(shipment.origin_city) ?? "Origen"} →{" "}
                              {getCityName(shipment.destination_city) ?? "Destino"}
                            </p>
                            {shipment.description ? (
                              <p className="mt-2 text-sm text-gray-500">
                                {shipment.description}
                              </p>
                            ) : null}

                            <div className="mt-4">
                              {matchingTrip ? (
                                <MatchButton
                                  shipmentId={shipment.id}
                                  tripId={matchingTrip.id}
                                />
                              ) : (
                                <p className="text-sm text-gray-500">
                                  No tienes un viaje abierto para esta ruta.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-sm text-gray-500">
                            {shipment.weight_kg ? `${shipment.weight_kg} kg` : "Sin peso"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard
              id="viajes-compatibles"
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
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0B2C4A]">
                            Viaje disponible
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>
                              Viajero: {counterpartNameById.get(trip.traveler_id) ?? "Usuario INTRA"}
                            </span>
                            <RatingSummaryBadge
                              avgRating={counterpartRatingSummaryMap[trip.traveler_id]?.avgRating ?? null}
                              totalReviews={counterpartRatingSummaryMap[trip.traveler_id]?.totalReviews ?? 0}
                            />
                          </div>
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
