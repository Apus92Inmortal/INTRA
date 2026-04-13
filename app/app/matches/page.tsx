import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import MatchActions from "./MatchActions";
import MatchesRealtime from "./MatchesRealtime";
import { getStatusLabel, getShipmentKindLabel } from "@/lib/labels";

type CityRow = {
  name: string;
};

type CityRelation = CityRow | CityRow[] | null;

type TripItem = {
  id: string;
  traveler_id: string;
  departure_date: string;
  capacity_kg: number | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type ShipmentItem = {
  id: string;
  owner_id: string;
  kind: string | null;
  weight_kg: number | null;
  declared_value_cop: number | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type MatchRow = {
  id: string;
  status: string;
  created_at: string;
  last_read_by_owner: string | null;
  last_read_by_traveler: string | null;
  trips: TripItem | TripItem[] | null;
  shipments: ShipmentItem | ShipmentItem[] | null;
};

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatCurrency(value: number | null) {
  if (!value) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusClasses(status: string) {
  switch (status) {
    case "accepted":
      return "bg-green-50 text-green-700 border border-green-200";
    case "pending":
      return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "rejected":
      return "bg-red-50 text-red-700 border border-red-200";
    case "cancelled":
      return "bg-gray-100 text-gray-600 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function getCityName(city: CityRelation) {
  if (!city) return null;
  if (Array.isArray(city)) return city[0]?.name ?? null;
  return city.name ?? null;
}

function normalizeTrip(trip: MatchRow["trips"]): TripItem | null {
  if (!trip) return null;
  return Array.isArray(trip) ? (trip[0] ?? null) : trip;
}

function normalizeShipment(
  shipment: MatchRow["shipments"]
): ShipmentItem | null {
  if (!shipment) return null;
  return Array.isArray(shipment) ? (shipment[0] ?? null) : shipment;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
      {text}
    </div>
  );
}

export default async function MatchesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: matchesData, error } = await supabase
    .from("matches")
    .select(`
      id,
      status,
      created_at,
      last_read_by_owner,
      last_read_by_traveler,
      trips (
        id,
        traveler_id,
        departure_date,
        capacity_kg,
        origin_city:cities!trips_origin_city_id_fkey(name),
        destination_city:cities!trips_destination_city_id_fkey(name)
      ),
      shipments (
        id,
        owner_id,
        kind,
        weight_kg,
        declared_value_cop,
        origin_city:cities!shipments_origin_city_id_fkey(name),
        destination_city:cities!shipments_destination_city_id_fkey(name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <AppNavbar />
        <main className="min-h-screen bg-[#EEF2F7]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-600 shadow-sm">
              Error cargando matches.
            </div>
          </div>
        </main>
      </>
    );
  }

  const allMatches = ((matchesData ?? []) as MatchRow[]).filter((match) => {
    const trip = normalizeTrip(match.trips);
    const shipment = normalizeShipment(match.shipments);

    const travelerId = trip?.traveler_id;
    const ownerId = shipment?.owner_id;

    return travelerId === user.id || ownerId === user.id;
  });

  const relatedUserIds = Array.from(
    new Set(
      allMatches.flatMap((match) => {
        const ids: string[] = [];
        const trip = normalizeTrip(match.trips);
        const shipment = normalizeShipment(match.shipments);

        if (trip?.traveler_id) ids.push(trip.traveler_id);
        if (shipment?.owner_id) ids.push(shipment.owner_id);

        return ids;
      })
    )
  );

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", relatedUserIds);

  const profilesMap = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name,
    ])
  );

  const matchIds = allMatches.map((match) => match.id);

  let messagesMap = new Map<string, MessageRow>();

  if (matchIds.length > 0) {
    const { data: messagesData } = await supabase
      .from("messages")
      .select("id, match_id, sender_id, message, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });

    const latestMessages = new Map<string, MessageRow>();

    for (const msg of (messagesData ?? []) as MessageRow[]) {
      if (!latestMessages.has(msg.match_id)) {
        latestMessages.set(msg.match_id, msg);
      }
    }

    messagesMap = latestMessages;
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#EEF2F7]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <MatchesRealtime currentUserId={user.id} />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0B2C4A]">Mis matches</h1>
            <p className="mt-2 text-sm text-gray-600">
              Revisa tus coincidencias, administra solicitudes y entra al chat
              cuando el match esté aceptado.
            </p>
          </div>

          {allMatches.length === 0 ? (
            <EmptyState text="Aún no tienes matches disponibles." />
          ) : (
            <div className="space-y-6">
              {allMatches.map((match) => {
                const trip = normalizeTrip(match.trips);
                const shipment = normalizeShipment(match.shipments);
                const lastMessage = messagesMap.get(match.id);

                const isTraveler = trip?.traveler_id === user.id;
                const otherUserId = isTraveler
                  ? shipment?.owner_id
                  : trip?.traveler_id;

                const rawOtherUserName = otherUserId
                  ? profilesMap.get(otherUserId)
                  : null;

                const otherUserName =
                  rawOtherUserName && rawOtherUserName.trim().length > 0
                    ? rawOtherUserName
                    : "Usuario";

                const otherUserLabel = isTraveler ? "Cliente" : "Viajero";

                const unread =
                  match.status === "accepted" &&
                  lastMessage &&
                  lastMessage.sender_id !== user.id &&
                  (isTraveler
                    ? !match.last_read_by_traveler ||
                      new Date(lastMessage.created_at) >
                        new Date(match.last_read_by_traveler)
                    : !match.last_read_by_owner ||
                      new Date(lastMessage.created_at) >
                        new Date(match.last_read_by_owner));

                return (
                  <section
                    key={match.id}
                    className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-gray-100 px-6 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              match.status
                            )}`}
                          >
                            {getStatusLabel(match.status)}
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#0B2C4A]">
                            {otherUserLabel}: {otherUserName}
                          </span>

                          <span className="text-xs text-gray-500">
                            Creado: {formatDate(match.created_at)}
                          </span>
                        </div>

                        <div>
                          {unread ? (
                            <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Nuevo mensaje
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                              Sin novedades
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_220px]">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                          <h3 className="mb-4 text-base font-semibold text-[#0B2C4A]">
                            ✈️ Viaje
                          </h3>

                          <div className="space-y-2 text-sm text-gray-700">
                            <p>
                              <span className="font-medium">Ruta:</span>{" "}
                              {getCityName(trip?.origin_city ?? null) ?? "Origen"} →{" "}
                              {getCityName(trip?.destination_city ?? null) ?? "Destino"}
                            </p>
                            <p>
                              <span className="font-medium">Salida:</span>{" "}
                              {trip?.departure_date
                                ? formatDate(trip.departure_date)
                                : "Sin fecha"}
                            </p>
                            <p>
                              <span className="font-medium">Capacidad:</span>{" "}
                              {trip?.capacity_kg ?? 0} kg
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                          <h3 className="mb-4 text-base font-semibold text-[#0B2C4A]">
                            📦 Envío
                          </h3>

                          <div className="space-y-2 text-sm text-gray-700">
                            <p>
                              <span className="font-medium">Ruta:</span>{" "}
                              {getCityName(shipment?.origin_city ?? null) ?? "Origen"} →{" "}
                              {getCityName(shipment?.destination_city ?? null) ?? "Destino"}
                            </p>
                            <p>
                              <span className="font-medium">Tipo:</span>{" "}
                              {getShipmentKindLabel(shipment?.kind ?? null)}
                            </p>
                            <p>
                              <span className="font-medium">Peso:</span>{" "}
                              {shipment?.weight_kg ?? 0} kg
                            </p>
                            <p>
                              <span className="font-medium">Valor:</span>{" "}
                              {formatCurrency(shipment?.declared_value_cop ?? 0)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          {match.status === "accepted" ? (
                            <>
                              <Link
                                href={`/app/matches/${match.id}`}
                                className="flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
                              >
                                Ver detalle
                              </Link>

                              <Link
                                href={`/app/matches/${match.id}/chat`}
                                className="flex h-12 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 text-sm font-semibold text-white transition hover:opacity-95"
                              >
                                Abrir chat
                              </Link>

                              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Estado del envío
                                </p>

                                <div className="mt-3">
                                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0B2C4A]">
                                    Match realizado
                                  </span>
                                </div>

                                <p className="mt-3 text-xs text-gray-500">
                                  Próximamente podrás seguir aquí el avance del
                                  paquete.
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                              <MatchActions
                                matchId={match.id}
                                matchStatus={match.status}
                                currentUserId={user.id}
                                shipmentOwnerId={shipment?.owner_id ?? null}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Último mensaje
                          </p>

                          {lastMessage ? (
                            <span className="text-xs text-gray-400">
                              {formatDateTime(lastMessage.created_at)}
                            </span>
                          ) : null}
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700">
                          {lastMessage?.message?.trim()
                            ? lastMessage.message
                            : "Aún no hay mensajes en este match."}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}