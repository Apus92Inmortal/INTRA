import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowRight, CircleDollarSign, Clock3, MessageCircle, PackageCheck, Route, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import MatchActions from "./MatchActions";
import MatchesRealtime from "./MatchesRealtime";
import { getStatusLabel, getShipmentKindLabel } from "@/lib/labels";
import { cancelMatchAction, confirmDeliveryAction, markDeliveredAction } from "./[id]/actions";
import { fetchRatingSummaryMap, formatRatingValue } from "@/lib/reviews";

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
  accepts_fragile: boolean | null;
  accepts_multiple_packages: boolean | null;
  has_stopovers: boolean | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type ShipmentItem = {
  id: string;
  owner_id: string;
  kind: string | null;
  description: string | null;
  weight_kg: number | null;
  declared_value_cop: number | null;
  is_fragile: boolean | null;
  is_urgent: boolean | null;
  is_high_value: boolean | null;
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

function formatTimeLabel(timeString: string | null | undefined) {
  if (!timeString) return "Hora por confirmar";

  const [hour = "0", minute = "0"] = timeString.split(":");
  const value = new Date(2000, 0, 1, Number(hour), Number(minute));

  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
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
      return "border border-intra-success-border bg-intra-success-soft text-intra-text-success";
    case "pending":
      return "border border-intra-warning-border bg-intra-warning-soft text-intra-warning-text";
    case "rejected":
      return "border border-intra-danger-border bg-intra-danger-soft text-intra-danger";
    case "cancelled":
      return "border border-intra-border bg-intra-neutral-pill text-intra-text-muted";
    default:
      return "border border-intra-border bg-intra-neutral-pill text-intra-text-muted";
  }
}

function getPrimaryStatusInfo(matchStatus: string, shipmentStatus: string | null) {
  if (shipmentStatus === "in_transit") {
    return {
      label: "En tránsito",
      classes: "border border-intra-border-strong bg-intra-info-soft text-intra-blue",
    };
  }

  if (shipmentStatus === "delivered") {
    return {
      label: "Entregado",
      classes: "border border-intra-success-border bg-intra-success-soft text-intra-text-success",
    };
  }

  if (shipmentStatus === "cancelled" || matchStatus === "cancelled") {
    return {
      label: "Cancelado",
      classes: "border border-intra-border bg-intra-neutral-pill text-intra-text-muted",
    };
  }

  return {
    label: getStatusLabel(matchStatus),
    classes: getStatusClasses(matchStatus),
  };
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
    <div className="rounded-2xl border border-dashed border-intra-border-strong bg-intra-card p-5 shadow-sm sm:p-6">
      <h2 className="intra-h3">Todavía no tienes matches</h2>
      <p className="mt-2 max-w-2xl intra-body">{text}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/app/shipments/new"
          className="intra-btn intra-btn-primary"
        >
          Crear envío
        </Link>
        <Link
          href="/app/trips/new"
          className="intra-btn intra-btn-secondary"
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
  tone,
  icon,
}: {
  title: string;
  value: number;
  tone: "amber" | "green" | "blue" | "slate";
  icon: ReactNode;
}) {
  const tones = {
    amber: {
      card: "border-intra-warning-border bg-intra-card",
      bubble: "bg-intra-warning-soft text-intra-warning",
      title: "text-intra-warning-text-strong",
    },
    green: {
      card: "border-intra-success-border bg-intra-card",
      bubble: "bg-intra-success-soft text-intra-green",
      title: "text-intra-text-success",
    },
    blue: {
      card: "border-intra-border-strong bg-intra-card",
      bubble: "bg-intra-info-soft text-intra-info",
      title: "text-intra-info",
    },
    slate: {
      card: "border-intra-border-strong bg-intra-card",
      bubble: "bg-intra-neutral-pill text-intra-blue",
      title: "text-intra-text-subtle",
    },
  } as const;

  const currentTone = tones[tone];

  return (
    <article
      className={`min-w-0 rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${currentTone.card}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${currentTone.bubble}`}>
          {icon}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <p className={`max-w-[9rem] text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] ${currentTone.title} sm:max-w-none sm:text-[11px] sm:tracking-wide`}>{title}</p>
          <p className="shrink-0 text-[1.5rem] font-bold leading-none tracking-tight text-intra-blue sm:text-[1.65rem]">{value}</p>
        </div>
      </div>
    </article>
  );
}

function DetailRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 text-[13px] leading-5 text-intra-text-muted ${className}`}>
      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-intra-green" />
      <p>
        <span className="font-semibold text-intra-blue">{label}:</span> {value}
      </p>
    </div>
  );
}

function ReputationInline({
  avgRating,
  totalReviews,
}: {
  avgRating: number | null;
  totalReviews: number;
}) {
  const formatted = formatRatingValue(avgRating) ?? "0.0";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-intra-warning-soft-alt px-3 py-1 text-[11px] font-semibold text-intra-warning-text sm:text-sm">
      <Star className="h-3.5 w-3.5 fill-intra-warning-alt text-intra-warning-alt" strokeWidth={1.8} />
      <span>{formatted}/{Math.max(totalReviews, 0)}</span>
    </span>
  );
}

function PreferenceToggleColumn({
  items,
}: {
  items: Array<{ label: string; value: boolean | null | undefined; icon: ReactNode }>;
}) {
  return (
    <div className="space-y-2 lg:flex lg:h-full lg:flex-col lg:justify-between lg:space-y-0 lg:gap-2">
      {items.map((item) => {
        const enabled = item.value === true;

        return (
          <span
            key={item.label}
            className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-full border px-3 py-1.5 text-[13px] leading-5 ${
              enabled
                ? "border-intra-success-border bg-[linear-gradient(180deg,var(--intra-success-soft-alt)_0%,var(--intra-success-soft)_100%)] text-intra-text-success"
                : "border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-info-soft-alt)_100%)] text-intra-text-muted"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${enabled ? "bg-intra-card/70 text-intra-text-success" : "bg-intra-bg-app text-intra-text-muted"}`}>
                {item.icon}
              </span>
              <span className="truncate font-semibold text-intra-blue">{item.label}</span>
            </span>
            <span className={`shrink-0 font-medium ${enabled ? "text-intra-text-success" : "text-intra-text-muted"}`}>
              {enabled ? "Sí" : "No"}
            </span>
          </span>
        );
      })}
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
        accepts_fragile,
        accepts_multiple_packages,
        has_stopovers,
        origin_city:cities!trips_origin_city_id_fkey(name),
        destination_city:cities!trips_destination_city_id_fkey(name)
      ),
      shipments (
        id,
        owner_id,
        kind,
        description,
        weight_kg,
        declared_value_cop,
        is_fragile,
        is_urgent,
        is_high_value,
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

  const ratingSummaryMap = await fetchRatingSummaryMap(supabase, relatedUserIds);

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

      <main className="intra-page-shell">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <MatchesRealtime currentUserId={user.id} />

          <div className="mb-6">
            <h1 className="intra-page-title">
              Mis matches
            </h1>
            <p className="mt-1 max-w-2xl intra-body">
              Administra tus conexiones activas, conversa en el chat y mantén
              cada envío bajo control.
            </p>
          </div>

          <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
            <SummaryMetricCard
              title="Pendientes"
              value={pendingMatchesCount}
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

                const otherUserRoleLabel = isTraveler ? "Cliente" : "Viajero";
                const otherUserRating = otherUserId
                  ? ratingSummaryMap[otherUserId] ?? { avgRating: null, totalReviews: 0 }
                  : { avgRating: null, totalReviews: 0 };
                
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
                const primaryStatus = getPrimaryStatusInfo(match.status, shipment?.status ?? null);
                const routeLabel = `${getCityName(shipment?.origin_city ?? null) ?? "Origen"} → ${getCityName(
                  shipment?.destination_city ?? null
                ) ?? "Destino"}`;
                const primaryPanelTitle = isTraveler ? "Envío solicitado" : "Viaje disponible";
                const primaryPreferenceItems = isTraveler
                  ? [
                      { label: "Frágil", value: shipment?.is_fragile, icon: <PackageCheck className="h-4 w-4" /> },
                      { label: "Urgente", value: shipment?.is_urgent, icon: <Clock3 className="h-4 w-4" /> },
                      { label: "Valor alto", value: shipment?.is_high_value, icon: <CircleDollarSign className="h-4 w-4" /> },
                    ]
                  : [
                      { label: "Frágiles", value: trip?.accepts_fragile, icon: <PackageCheck className="h-4 w-4" /> },
                      { label: "Múltiples", value: trip?.accepts_multiple_packages, icon: <Route className="h-4 w-4" /> },
                      { label: "Paradas", value: trip?.has_stopovers, icon: <Clock3 className="h-4 w-4" /> },
                    ];
                return (
                  <section
                    key={match.id}
                    className="relative overflow-hidden rounded-2xl border border-intra-border-strong bg-intra-card shadow-sm"
                  >
                    <span
                      className={`intra-pill intra-badge-text absolute right-4 top-4 w-fit shrink-0 shadow-sm sm:right-6 ${primaryStatus.classes}`}
                    >
                      {primaryStatus.label}
                    </span>

                    <div className="border-b border-intra-border-soft px-4 py-4 pr-24 sm:px-6 sm:pr-28">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="min-w-0">
                            <h2 className="text-[15px] font-semibold tracking-tight text-intra-blue sm:text-base">
                              {routeLabel}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-intra-text-muted sm:text-[13px]">
                              <span>
                                <span className="font-medium text-intra-blue">{otherUserRoleLabel}:</span> {otherUserName}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="font-medium text-intra-blue">Calificación:</span>
                                <ReputationInline
                                  avgRating={otherUserRating.avgRating}
                                  totalReviews={otherUserRating.totalReviews}
                                />
                              </span>
                              <span>Creado: {formatDate(match.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
                        <div className={`rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-info-soft-alt)_100%)] p-3.5 shadow-sm sm:p-4 ${!isTraveler ? "pb-[40px] sm:pb-4" : ""}`}>
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px] lg:items-center">
                            <div>
                              <div className="mb-3 flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isTraveler ? "bg-intra-warning-soft text-intra-warning" : "bg-intra-info-soft text-intra-info"}`}>
                                  {isTraveler ? (
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                                    </svg>
                                  ) : (
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.5 19l19-7-19-7 5 7-5 7z" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-[15px] font-semibold text-intra-blue">{primaryPanelTitle}</h3>
                                </div>
                              </div>

                              {isTraveler ? (
                                <div className="flex flex-col gap-2.5">
                                  <DetailRow label="Tipo" value={getShipmentKindLabel(shipment?.kind ?? null)} />
                                  <DetailRow label="Valor" value={formatCurrency(shipment?.declared_value_cop ?? 0)} />
                                  <DetailRow
                                    label="Descripción"
                                    value={shipment?.description?.trim() || "Sin descripción"}
                                  />
                                  <DetailRow label="Peso" value={`${shipment?.weight_kg ?? 0} kg`} />
                                </div>
                              ) : (
                                <div className="flex h-full flex-col justify-center space-y-2.5 lg:pr-2">
                                  <DetailRow label="Salida" value={trip?.departure_date ? formatDate(trip.departure_date) : "Sin fecha"} />
                                  <DetailRow label="Hora" value={formatTimeLabel(trip?.departure_time)} />
                                  <DetailRow label="Capacidad" value={`${trip?.capacity_kg ?? 0} kg`} />
                                  <DetailRow label="Ruta" value={routeLabel} />

                                  <div className="mt-4 lg:hidden">
                                    <div className="rounded-2xl border border-intra-border-soft bg-intra-card p-3">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-intra-text-muted">
                                        Condiciones
                                      </p>
                                      <p className="mt-1 text-[12px] leading-5 text-intra-text-muted">
                                        Este viaje permite
                                      </p>
                                      <div className="mt-3">
                                        <PreferenceToggleColumn items={primaryPreferenceItems} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className={`rounded-2xl border border-intra-border-soft bg-intra-card p-3 ${!isTraveler ? "hidden lg:block" : ""}`}>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-intra-text-muted">
                                Condiciones
                              </p>
                              <p className="mt-1 text-[12px] leading-5 text-intra-text-muted">
                                {isTraveler ? "Este envío requiere" : "Este viaje permite"}
                              </p>
                              <div className="mt-3">
                                <PreferenceToggleColumn items={primaryPreferenceItems} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-neutral-soft-alt)_100%)] p-3.5 shadow-sm sm:p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-intra-info">
                            Acciones del envío
                          </p>

                          <div className="mt-3 grid gap-2.5">
                          {match.status === "accepted" ? (
                            <>
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
                                        className="intra-btn intra-btn-primary min-h-11 w-full px-4 py-3"
                                      >
                                        Paquete entregado
                                      </button>
                                    </form>
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
                                        className="intra-btn intra-btn-primary min-h-11 w-full px-4 py-3"
                                      >
                                        Paquete recibido
                                      </button>
                                    </form>
                                  )}

                              <Link
                                href={`/app/matches/${match.id}/chat`}
                                className={`intra-btn min-h-11 w-full px-4 py-3 text-[13px] text-white hover:opacity-95 ${
                                  unread ? "bg-intra-info" : "bg-intra-blue"
                                }`}
                              >
                                <MessageCircle className="mr-2 h-4 w-4" strokeWidth={1.9} />
                                Abrir chat
                              </Link>

                              <Link
                                href={`/app/matches/${match.id}`}
                                className="intra-btn intra-btn-secondary min-h-11 w-full px-4 py-3 text-[13px]"
                              >
                                <ArrowRight className="mr-2 h-4 w-4" strokeWidth={1.9} />
                                Ver detalle
                              </Link>

                                {shipment?.status === "in_transit" &&
                                  isTraveler &&
                                  payment?.traveler_delivered_at && (
                                    <p className="rounded-2xl border border-intra-success-border bg-intra-success-soft px-4 py-3 text-[12px] font-medium leading-4 text-intra-text-success">
                                      Entrega reportada. Esperando confirmación del cliente.
                                    </p>
                                  )}
                            </>
                          ) : (
                            <>
                              <Link
                                href={`/app/matches/${match.id}`}
                                className="intra-btn intra-btn-secondary min-h-11 w-full px-4 py-3 text-[13px]"
                              >
                                <ArrowRight className="mr-2 h-4 w-4" strokeWidth={1.9} />
                                Ver detalle
                              </Link>

                              <MatchActions
                                matchId={match.id}
                                matchStatus={match.status}
                                currentUserId={user.id}
                                shipmentOwnerId={shipment?.owner_id ?? null}
                                onCancel={cancelMatchAction}
                                showDetail={false}
                                showStatusMessage={false}
                              />
                            </>
                          )}
                        </div>
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
