import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import MatchActions from "./MatchActions";
import MatchesRealtime from "./MatchesRealtime";
import { getStatusLabel, getShipmentKindLabel } from "@/lib/labels";
import { cancelMatchAction, confirmDeliveryAction, markDeliveredAction } from "./[id]/actions";

type CityRow = {
  name: string;
};

type CityRelation = CityRow | CityRow[] | null;

type TripItem = {
  id: string;
  traveler_id: string;
  departure_date: string;
  departure_time: string | null;
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
  status: string | null;
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

type PaymentRow = {
  shipment_id: string | null;
  status: string | null;
  dispute_status: string | null;
  traveler_delivered_at: string | null;
  created_at: string;
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

function formatTimeLabel(timeString: string | null | undefined) {
  if (!timeString) return "Hora por confirmar";

  const [hour = "0", minute = "0"] = timeString.split(":");
  const value = new Date(2000, 0, 1, Number(hour), Number(minute));

  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatDepartureLabel(dateString: string | null | undefined, timeString: string | null | undefined) {
  const dateLabel = dateString ? formatDate(dateString) : "Sin fecha";
  return timeString ? `${dateLabel} · ${formatTimeLabel(timeString)}` : dateLabel;
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

function getShipmentTrackingLabel(status: string | null) {
  switch (status) {
    case "open":
      return "Solicitud creada";
    case "matched":
      return "Match realizado";
    case "accepted":
      return "Match aceptado";
    case "in_transit":
      return "En tránsito";
    case "delivered":
      return "Entregado";
    case "cancelled":
      return "Cancelado";
    default:
      return "Sin estado";
  }
}

function getShipmentTrackingClasses(status: string | null) {
  switch (status) {
    case "accepted":
      return "border-green-200 bg-green-50 text-green-700";
    case "in_transit":
      return "border-blue-200 bg-blue-50 text-[#0B2C4A]";
    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "border-gray-300 bg-gray-100 text-gray-600";
    case "matched":
      return "border-blue-200 bg-blue-50 text-[#0B2C4A]";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function getShipmentTrackingDescription(status: string | null) {
  switch (status) {
    case "accepted":
      return "El match fue aceptado. El siguiente paso es recoger el paquete.";
    case "in_transit":
      return "El viajero ya recogió el paquete. Cuando lo entregue, debe reportarlo aquí.";
    case "delivered":
      return "La entrega fue confirmada correctamente.";
    case "cancelled":
      return "Este envío fue cancelado.";
    case "matched":
      return "Ya existe una coincidencia creada para este envío.";
    default:
      return "Próximamente podrás seguir aquí el avance del paquete.";
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

function getNextStepCopy({
  matchStatus,
  shipmentStatus,
  isOwner,
  hasUnread,
}: {
  matchStatus: string;
  shipmentStatus: string | null;
  isOwner: boolean;
  hasUnread: boolean;
}) {
  if (hasUnread && matchStatus === "accepted") {
    return "Tienes mensajes nuevos por revisar en este match.";
  }

  if (matchStatus === "pending") {
    return isOwner
      ? "Revisa la solicitud y decide si aceptas este viajero."
      : "Tu solicitud fue enviada. Espera la respuesta del cliente.";
  }

  if (shipmentStatus === "matched") {
    return "Ya hay match activo. El siguiente paso es aceptar para habilitar coordinación.";
  }

  if (shipmentStatus === "accepted") {
    return "El match está aceptado. Coordinen recogida y confirma cuando el paquete cambie de manos.";
  }

  if (shipmentStatus === "in_transit") {
    return isOwner
      ? "El paquete va en camino. Mantente pendiente del chat para coordinar entrega y confirmación."
      : "El paquete ya está en tránsito. Cuando lo entregues, repórtalo para continuar el flujo.";
  }

  if (shipmentStatus === "delivered") {
    return "La entrega ya quedó registrada. Puedes revisar el detalle o el estado del pago.";
  }

  return "Revisa el detalle para continuar con el siguiente paso del flujo.";
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D9E4F0] bg-white p-5 text-sm text-gray-500 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-[#0B2C4A]">Todavía no tienes matches</h2>
      <p className="mt-2 max-w-2xl leading-6">{text}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/app/shipments/new"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27ae60]"
        >
          Crear envío
        </Link>
        <Link
          href="/app/trips/new"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Publicar viaje
        </Link>
      </div>
    </div>
  );
}

function SummaryMetricCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  tone: "amber" | "green" | "blue" | "slate";
  icon: ReactNode;
}) {
  const tones = {
    amber: {
      card: "border-[#F6D9A6] bg-white",
      bubble: "bg-[#FFF7E8] text-[#F39C12]",
      title: "text-[#A56A00]",
    },
    green: {
      card: "border-[#CDEFD9] bg-white",
      bubble: "bg-[#EFFBF4] text-[#2ECC71]",
      title: "text-[#1F8B4C]",
    },
    blue: {
      card: "border-[#D7E5F4] bg-white",
      bubble: "bg-[#EEF4FB] text-[#0B5CAD]",
      title: "text-[#0B5CAD]",
    },
    slate: {
      card: "border-[#D9E4F0] bg-white",
      bubble: "bg-[#EEF2F7] text-[#0B2C4A]",
      title: "text-[#3B526B]",
    },
  } as const;

  const currentTone = tones[tone];

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${currentTone.card}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${currentTone.bubble}`}>
          {icon}
        </div>

        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${currentTone.title}`}>{title}</p>
          <p className="mt-1 text-[1.65rem] font-bold leading-none tracking-tight text-[#0B2C4A]">{value}</p>
          <p className="mt-1 text-[12px] leading-4 text-slate-500">{description}</p>
        </div>
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px] leading-5 text-slate-600">
      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#2ECC71]" />
      <p>
        <span className="font-semibold text-[#0B2C4A]">{label}:</span> {value}
      </p>
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
        departure_time,
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
        status,
        origin_city:cities!shipments_origin_city_id_fkey(name),
        destination_city:cities!shipments_destination_city_id_fkey(name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error cargando matches: ${error.message}`);
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

  const { data: profilesData, error: profilesError } = relatedUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", relatedUserIds)
    : { data: [] as ProfileRow[], error: null };

  if (profilesError) {
    throw new Error(`Error cargando perfiles relacionados: ${profilesError.message}`);
  }

  const profilesMap = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name,
    ])
  );

  const matchIds = allMatches.map((match) => match.id);
  const shipmentIds = Array.from(
    new Set(
      allMatches
        .map((match) => normalizeShipment(match.shipments)?.id)
        .filter(Boolean)
    )
  ) as string[];

  let messagesMap = new Map<string, MessageRow>();
  let paymentsMap = new Map<string, PaymentRow>();

  if (matchIds.length > 0) {
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("id, match_id, sender_id, message, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });

    if (messagesError) {
      throw new Error(`Error cargando mensajes de matches: ${messagesError.message}`);
    }

    const latestMessages = new Map<string, MessageRow>();

    for (const msg of (messagesData ?? []) as MessageRow[]) {
      if (!latestMessages.has(msg.match_id)) {
        latestMessages.set(msg.match_id, msg);
      }
    }

    messagesMap = latestMessages;
  }

  if (shipmentIds.length > 0) {
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("shipment_id, status, dispute_status, traveler_delivered_at, created_at")
      .in("shipment_id", shipmentIds)
      .order("created_at", { ascending: false });

    if (paymentsError) {
      throw new Error(`Error cargando pagos de matches: ${paymentsError.message}`);
    }

    const latestPayments = new Map<string, PaymentRow>();

    for (const payment of (paymentsData ?? []) as PaymentRow[]) {
      if (!payment.shipment_id || latestPayments.has(payment.shipment_id)) {
        continue;
      }

      latestPayments.set(payment.shipment_id, payment);
    }

    paymentsMap = latestPayments;
  }

  const pendingMatchesCount = allMatches.filter((match) => match.status === "pending").length;
  const acceptedMatchesCount = allMatches.filter((match) => match.status === "accepted").length;
  const unreadMatchesCount = allMatches.filter((match) => {
    const trip = normalizeTrip(match.trips);
    const shipment = normalizeShipment(match.shipments);
    const lastMessage = messagesMap.get(match.id);

    if (!lastMessage || lastMessage.sender_id === user.id || match.status !== "accepted") {
      return false;
    }

    const isTraveler = trip?.traveler_id === user.id;
    const isOwner = shipment?.owner_id === user.id;

    if (isTraveler) {
      return !match.last_read_by_traveler || new Date(lastMessage.created_at) > new Date(match.last_read_by_traveler);
    }

    if (isOwner) {
      return !match.last_read_by_owner || new Date(lastMessage.created_at) > new Date(match.last_read_by_owner);
    }

    return false;
  }).length;

  const inTransitCount = allMatches.filter((match) => {
    const shipment = normalizeShipment(match.shipments);
    return shipment?.status === "in_transit";
  }).length;

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#F5F8FB]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <MatchesRealtime currentUserId={user.id} />

          <div className="mb-6">
            <h1 className="text-[clamp(1.45rem,1.8vw,1.95rem)] font-bold leading-none tracking-tight text-[#0B2C4A]">
              Mis matches
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500 sm:text-sm">
              Revisa tus coincidencias, administra solicitudes y entra al chat
              cuando el match esté aceptado.
            </p>
          </div>

          <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetricCard
              title="Pendientes"
              value={pendingMatchesCount}
              description="Solicitudes esperando decisión."
              tone="amber"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3h8M8 21h8M9 3v5l3 4-3 4v5m6-18v5l-3 4 3 4v5" />
                </svg>
              }
            />
            <SummaryMetricCard
              title="Activos"
              value={acceptedMatchesCount}
              description="Matches aceptados listos para coordinar."
              tone="green"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <SummaryMetricCard
              title="En tránsito"
              value={inTransitCount}
              description="Paquetes que ya están en movimiento."
              tone="blue"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17H6a2 2 0 01-2-2V7a2 2 0 012-2h9a2 2 0 012 2v3m-1 7h2m0 0a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4zm8 0H9m8-6h2l2 3v3h-2" />
                </svg>
              }
            />
            <SummaryMetricCard
              title="Mensajes nuevos"
              value={unreadMatchesCount}
              description="Chats que requieren revisión."
              tone="slate"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h8m-8 4h5m8-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </section>

          {allMatches.length === 0 ? (
            <EmptyState text="Aún no tienes matches disponibles." />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {allMatches.map((match) => {
                const trip = normalizeTrip(match.trips);
                const shipment = normalizeShipment(match.shipments);
                const lastMessage = messagesMap.get(match.id);
                const payment = shipment?.id ? paymentsMap.get(shipment.id) ?? null : null;

                const isTraveler = trip?.traveler_id === user.id;
                const isOwner = shipment?.owner_id === user.id;

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
                const nextStepCopy = getNextStepCopy({
                  matchStatus: match.status,
                  shipmentStatus: shipment?.status ?? null,
                  isOwner,
                  hasUnread: Boolean(unread),
                });
                const routeLabel = `${getCityName(shipment?.origin_city ?? null) ?? "Origen"} → ${getCityName(
                  shipment?.destination_city ?? null
                ) ?? "Destino"}`;

                return (
                  <section
                    key={match.id}
                    className="overflow-hidden rounded-2xl border border-[#D9E4F0] bg-white shadow-sm"
                  >
                    <div className="border-b border-[#E6EDF5] px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#D7E5F4] bg-[#F7FAFD] px-3 py-1 text-[11px] font-semibold text-[#0B2C4A]">
                              {routeLabel}
                            </span>
                            <span className="rounded-full border border-[#D7E5F4] bg-[#F7FAFD] px-3 py-1 text-[11px] font-medium text-[#0B2C4A]">
                              {otherUserLabel}: {otherUserName}
                            </span>
                            <span className="rounded-full border border-[#E6EDF5] bg-white px-3 py-1 text-[11px] text-slate-500">
                              Creado: {formatDate(match.created_at)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusClasses(
                              match.status
                            )}`}
                          >
                            {getStatusLabel(match.status)}
                          </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getShipmentTrackingClasses(
                                shipment?.status ?? null
                              )}`}
                            >
                              {getShipmentTrackingLabel(shipment?.status ?? null)}
                            </span>
                          </div>
                        </div>

                        <div>
                          {unread ? (
                            <span className="rounded-full border border-[#CDEFD9] bg-[#EFFBF4] px-3 py-1 text-[11px] font-semibold text-[#1F8B4C]">
                              Nuevo mensaje
                            </span>
                          ) : (
                            <span className="rounded-full border border-[#E6EDF5] bg-[#F8FAFC] px-3 py-1 text-[11px] text-slate-500">
                              Al día
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-[#CDEFD9] bg-[linear-gradient(90deg,rgba(46,204,113,0.12)_0%,rgba(239,251,244,0.75)_100%)] px-4 py-3 text-[13px] font-medium leading-5 text-[#285B41]">
                        {nextStepCopy}
                      </div>
                    </div>

                    <div className="p-4 sm:p-6">
                      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_220px]">
                        <div className="rounded-2xl border border-[#D9E4F0] bg-[#FBFDFF] p-4">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FB] text-[#0B5CAD]">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.5 19l19-7-19-7 5 7-5 7z" />
                              </svg>
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0B2C4A]">Viaje</h3>
                          </div>

                          <div className="space-y-3">
                            <DetailRow
                              label="Ruta"
                              value={`${getCityName(trip?.origin_city ?? null) ?? "Origen"} → ${getCityName(
                                trip?.destination_city ?? null
                              ) ?? "Destino"}`}
                            />
                            <DetailRow
                              label="Salida"
                              value={formatDepartureLabel(trip?.departure_date, trip?.departure_time)}
                            />
                            <DetailRow label="Capacidad" value={`${trip?.capacity_kg ?? 0} kg`} />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#D9E4F0] bg-[#FBFDFF] p-4">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF7E8] text-[#C98012]">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                              </svg>
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0B2C4A]">Envío</h3>
                          </div>

                          <div className="space-y-3">
                            <DetailRow label="Ruta" value={routeLabel} />
                            <DetailRow label="Tipo" value={getShipmentKindLabel(shipment?.kind ?? null)} />
                            <DetailRow label="Peso" value={`${shipment?.weight_kg ?? 0} kg`} />
                            <DetailRow label="Valor" value={formatCurrency(shipment?.declared_value_cop ?? 0)} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          {match.status === "accepted" ? (
                            <>
                              <Link
                                href={`/app/matches/${match.id}`}
                                className="flex min-h-11 items-center justify-center rounded-2xl border border-[#D9E4F0] bg-white px-4 text-[13px] font-semibold text-[#0B2C4A] transition hover:bg-[#F7FAFD]"
                              >
                                Ver detalle
                              </Link>

                              <Link
                                href={`/app/matches/${match.id}/chat`}
                                className="flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 text-[13px] font-semibold text-white transition hover:opacity-95"
                              >
                                Abrir chat
                              </Link>

                              <div className="rounded-2xl border border-[#D9E4F0] bg-[#FBFDFF] p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Estado del envío
                                </p>

                                <div className="mt-3">
                                  <span
                                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getShipmentTrackingClasses(
                                      shipment?.status ?? null
                                    )}`}
                                  >
                                    {getShipmentTrackingLabel(shipment?.status ?? null)}
                                  </span>
                                </div>

                                <p className="mt-3 text-[12px] leading-4 text-slate-500">
                                  {getShipmentTrackingDescription(
                                    shipment?.status ?? null
                                  )}
                                </p>

                                {shipment?.status === "in_transit" &&
                                  isTraveler &&
                                  payment?.status === "held" &&
                                  payment?.dispute_status !== "open" &&
                                  !payment?.traveler_delivered_at && (
                                    <form
                                      action={async () => {
                                        "use server";
                                        await markDeliveredAction(shipment.id);
                                        revalidatePath("/app/matches");
                                        revalidatePath(`/app/matches/${match.id}`);
                                        revalidatePath("/app");
                                      }}
                                    >
                                      <button
                                        type="submit"
                                        className="mt-4 min-h-11 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                      >
                                        Paquete entregado
                                      </button>
                                    </form>
                                  )}

                                {shipment?.status === "in_transit" &&
                                  isTraveler &&
                                  payment?.traveler_delivered_at && (
                                    <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
                                      Entrega reportada. Esperando confirmación del cliente.
                                    </p>
                                  )}

                                {shipment?.status === "in_transit" &&
                                  isOwner &&
                                  payment?.status === "held" &&
                                  payment?.dispute_status !== "open" &&
                                  payment?.traveler_delivered_at && (
                                    <form
                                      action={async () => {
                                        "use server";
                                        await confirmDeliveryAction(shipment.id);
                                        revalidatePath("/app/matches");
                                        revalidatePath(`/app/matches/${match.id}`);
                                        revalidatePath("/app");
                                      }}
                                    >
                                      <button
                                        type="submit"
                                        className="mt-4 min-h-11 w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                                      >
                                        Paquete recibido
                                      </button>
                                    </form>
                                  )}
                              </div>
                            </>
                          ) : (
                            <div className="rounded-2xl border border-[#D9E4F0] bg-[#FBFDFF] p-3">
                              <MatchActions
                                matchId={match.id}
                                matchStatus={match.status}
                                currentUserId={user.id}
                                shipmentOwnerId={shipment?.owner_id ?? null}
                                onCancel={cancelMatchAction}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-[#D9E4F0] bg-[#FBFDFF] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Último mensaje
                          </p>

                          {lastMessage ? (
                            <span className="text-[11px] text-slate-400">
                              {formatDateTime(lastMessage.created_at)}
                            </span>
                          ) : null}
                        </div>

                        <div className="rounded-xl border border-[#E6EDF5] bg-white px-4 py-3 text-[13px] leading-5 text-slate-700 break-words shadow-sm">
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
