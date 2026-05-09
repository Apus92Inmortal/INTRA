import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import MatchDetailActions from "./MatchDetailActions";
import MatchDetailRealtime from "./MatchDetailRealtime";
import {
  acceptMatchAction,
  rejectMatchAction,
  cancelMatchAction,
  markInTransitFormAction,
  markDeliveredFormAction,
  openDisputeFormAction,
  confirmDeliveryFormAction,
} from "./actions";
import { TrackingCodeBadge } from "@/components/tracking-code-badge";
import { getStatusLabel, getShipmentKindLabel } from "@/lib/labels";
import { fetchRatingSummaryMap, formatRatingValue } from "@/lib/reviews";
import SuspiciousReportForm from "./SuspiciousReportForm";
import { CheckCircle2, MessageCircle, PackageCheck, Route, ShieldAlert, Star, Truck } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  verification_status?: string | null;
};

type CityRow = {
  name: string | null;
};

type CityRelation = CityRow | CityRow[] | null;

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatCurrency(value: number | null | undefined) {
  if (!value) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
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

function getCityName(city: CityRelation) {
  if (!city) return null;
  if (Array.isArray(city)) return city[0]?.name ?? null;
  return city.name ?? null;
}

function getCompactRatingText(avgRating: number | null | undefined, totalReviews: number) {
  const formatted = formatRatingValue(avgRating) ?? "0.0";

  return `${formatted}/${Math.max(totalReviews, 0)}`;
}

function getProgressStepIndex({
  matchStatus,
  shipmentStatus,
  travelerDeliveredAt,
  deliveredAt,
}: {
  matchStatus: string;
  shipmentStatus: string | null | undefined;
  travelerDeliveredAt: string | null | undefined;
  deliveredAt: string | null | undefined;
}) {
  if (matchStatus === "pending") return -1;
  if (deliveredAt || shipmentStatus === "delivered" || matchStatus === "completed") return 3;
  if (travelerDeliveredAt) return 3;
  if (shipmentStatus === "in_transit") return 2;
  if (shipmentStatus === "matched" || matchStatus === "accepted") return 0;
  return -1;
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      id,
      status,
      created_at,
      trip_id,
      shipment_id,
      trips (
        id,
        traveler_id,
        capacity_kg,
        departure_date,
        departure_time,
        origin_city_id,
        destination_city_id,
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
        status,
        tracking_code,
        origin_city_id,
        destination_city_id,
        origin_city:cities!shipments_origin_city_id_fkey(name),
        destination_city:cities!shipments_destination_city_id_fkey(name)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !match) {
    notFound();
  }

  const trip = Array.isArray(match.trips) ? match.trips[0] : match.trips;
  const shipment = Array.isArray(match.shipments)
    ? match.shipments[0]
    : match.shipments;

  const { data: payment } = shipment?.id
    ? await supabase
        .from("payments")
        .select(
          "id, status, amount, gross_amount, traveler_amount, intra_fee, gateway_fee_estimated, dispute_status, dispute_deadline_at, auto_release_at, released_at, refunded_at, delivered_at, traveler_delivered_at"
        )
        .eq("shipment_id", shipment.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const ownerId = shipment?.owner_id ?? null;
  const travelerId = trip?.traveler_id ?? null;
  const isOwner = user.id === ownerId;
  const isTraveler = user.id === travelerId;

  if (!isOwner && !isTraveler) {
    notFound();
  }

  const participantIds = [ownerId, travelerId].filter(
    (value): value is string => Boolean(value)
  );

  const { data: participantProfiles } = participantIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", participantIds)
    : { data: [] as ProfileRow[] };

  const participantNameById = new Map<string, string>(
    ((participantProfiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Usuario INTRA",
    ])
  );

  const ratingSummaryMap = await fetchRatingSummaryMap(supabase, participantIds);
  const otherUserId = isOwner ? travelerId : ownerId;
  const otherUserName = otherUserId
    ? participantNameById.get(otherUserId) ?? "la otra persona"
    : "la otra persona";
  const otherUserRoleLabel = isOwner ? "Viajero" : "Cliente";
  const shipmentRouteLabel = `${getCityName(shipment?.origin_city as CityRelation) ?? "Origen"} → ${getCityName(
    shipment?.destination_city as CityRelation
  ) ?? "Destino"}`;
  const tripRouteLabel = `${getCityName(trip?.origin_city as CityRelation) ?? "Origen"} → ${getCityName(
    trip?.destination_city as CityRelation
  ) ?? "Destino"}`;
  const primaryPanelTitle = isTraveler ? "Envío solicitado" : "Viaje disponible";
  const headerRatingText = getCompactRatingText(
    otherUserId ? ratingSummaryMap[otherUserId]?.avgRating ?? null : null,
    otherUserId ? ratingSummaryMap[otherUserId]?.totalReviews ?? 0 : 0
  );
  const progressIndex = getProgressStepIndex({
    matchStatus: match.status,
    shipmentStatus: shipment?.status,
    travelerDeliveredAt: payment?.traveler_delivered_at,
    deliveredAt: payment?.delivered_at,
  });
  const matchCode = shipment?.tracking_code || `MATCH-${match.id.slice(0, 8).toUpperCase()}`;
  const progressSteps = [
    "Match aceptado",
    "Recogida",
    "En tránsito",
    "Entrega",
  ];

  const canAccept = isOwner && match.status === "pending";
  const canCancel =
    (isOwner || isTraveler) &&
    (match.status === "pending" || match.status === "accepted");

  const canOpenChat = match.status === "accepted";

  const canMarkInTransit =
    isTraveler &&
    match.status === "accepted" &&
    shipment?.status === "matched";

  const canMarkDelivered =
    isTraveler &&
    match.status === "accepted" &&
    shipment?.status === "in_transit" &&
    payment?.status === "held" &&
    payment?.dispute_status !== "open" &&
    !payment?.traveler_delivered_at;

  const canConfirmDelivery =
    isOwner &&
    match.status === "accepted" &&
    shipment?.status === "in_transit" &&
    payment?.status === "held" &&
    payment?.dispute_status !== "open" &&
    Boolean(payment?.traveler_delivered_at);

  const canOpenDispute =
    isOwner &&
    payment?.status === "held" &&
    payment?.dispute_status !== "open";

  const markInTransitSubmitAction =
    shipment?.id && match?.id
      ? markInTransitFormAction.bind(null, shipment.id, match.id)
      : undefined;

  const markDeliveredSubmitAction =
    shipment?.id && match?.id
      ? markDeliveredFormAction.bind(null, shipment.id, match.id)
      : undefined;

  const openDisputeSubmitAction = match?.id
    ? openDisputeFormAction.bind(null, match.id)
    : undefined;

  const confirmDeliverySubmitAction =
    shipment?.id && match?.id
      ? confirmDeliveryFormAction.bind(null, shipment.id, match.id)
      : undefined;

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6 sm:py-8">
        <MatchDetailRealtime matchId={match.id} />

        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FB] text-[#0B5CAD]">
                      <Route className="h-5 w-5" strokeWidth={2.1} />
                    </div>
                    <h1 className="text-[clamp(1.65rem,2.5vw,2.35rem)] font-bold tracking-tight text-[#0B2C4A]">
                      {shipmentRouteLabel}
                    </h1>
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${
                        match.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : match.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : match.status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {getStatusLabel(match.status)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                    <span>
                      <span className="font-medium text-slate-500">{otherUserRoleLabel}:</span>{" "}
                      <span className="font-semibold text-[#0B2C4A]">{otherUserName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] px-3 py-1 text-sm font-semibold text-[#8A5A00]">
                      <Star className="h-3.5 w-3.5 fill-[#D4A017] text-[#D4A017]" strokeWidth={1.8} />
                      <span>{headerRatingText}</span>
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-2 text-center">
                  <TrackingCodeBadge code={matchCode} className="bg-[#0B2C4A] hover:bg-[#12385C]" />
                  <span className="text-sm text-slate-500">Creado: {formatDate(match.created_at)}</span>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progreso del envío</p>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
                  {progressSteps.map((step, index) => {
                    const isDone = index <= progressIndex;
                    const isCurrent = index === progressIndex;

                    return (
                      <div key={step} className="min-w-0">
                        <div
                          className={`h-2.5 rounded-full transition ${
                            isDone ? "bg-[#2C9B57]" : "bg-slate-200"
                          }`}
                        />
                        <p
                          className={`mt-2 text-center text-[10px] font-semibold leading-3.5 sm:text-[11px] sm:leading-4 ${
                            isCurrent ? "text-[#0B2C4A]" : isDone ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {step}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-4 py-5 sm:px-8 sm:py-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-[#D7E5F4] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFF_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isTraveler ? "bg-[#FFF7E8] text-[#C98012]" : "bg-[#EEF4FB] text-[#0B5CAD]"}`}>
                        <span className="text-lg">{isTraveler ? "📦" : "✈️"}</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0B2C4A]">{primaryPanelTitle}</h2>
                      </div>
                    </div>

                    {isTraveler ? (
                      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
                        <div className="space-y-3 text-sm text-slate-700">
                          <p><span className="font-medium text-slate-900">Tipo:</span> {getShipmentKindLabel(shipment?.kind)}</p>
                          <p><span className="font-medium text-slate-900">Valor:</span> {formatCurrency(shipment?.declared_value_cop)}</p>
                          <p><span className="font-medium text-slate-900">Descripción:</span> {shipment?.description?.trim() || "Sin descripción"}</p>
                          <p><span className="font-medium text-slate-900">Peso:</span> {shipment?.weight_kg ?? 0} kg</p>
                        </div>

                        {shipment?.id && ownerId ? (
                          <div className="flex flex-col justify-center rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#FFFDF8_0%,#FFF7E8_100%)] p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-amber-700">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100">
                                <ShieldAlert className="h-4 w-4" strokeWidth={2} />
                              </div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide">Protección del envío</p>
                            </div>

                            <div className="mt-3">
                              <SuspiciousReportForm
                                shipmentId={shipment.id}
                                matchId={match.id}
                                reporterName={participantNameById.get(user.id) ?? "El viajero"}
                                recipientUserId={ownerId}
                                embedded
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <p><span className="font-medium text-slate-900">Salida:</span> {formatDate(trip?.departure_date)}</p>
                        <p><span className="font-medium text-slate-900">Hora:</span> {formatTimeLabel(trip?.departure_time)}</p>
                        <p><span className="font-medium text-slate-900">Capacidad:</span> {trip?.capacity_kg ?? 0} kg</p>
                        <p><span className="font-medium text-slate-900">Ruta del viaje:</span> {tripRouteLabel}</p>
                      </div>
                    )}
                  </section>

                </div>

                <div className="space-y-5">
                  <section className="rounded-2xl border border-[#D9E4F0] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFD_100%)] p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-[#0B2C4A]">Acciones del match</h2>

                    <div className="mt-5 space-y-3">
                      {canMarkInTransit && markInTransitSubmitAction ? (
                        <form action={markInTransitSubmitAction}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2C9B57] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#247C47]"
                          >
                            <PackageCheck className="h-4 w-4" strokeWidth={2.1} />
                            Confirmar recogida
                          </button>
                        </form>
                      ) : null}

                      {canMarkDelivered && markDeliveredSubmitAction ? (
                        <form action={markDeliveredSubmitAction}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2C9B57] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#247C47]"
                          >
                            <Truck className="h-4 w-4" strokeWidth={2.1} />
                            Confirmar entrega
                          </button>
                        </form>
                      ) : null}

                      {canConfirmDelivery && confirmDeliverySubmitAction ? (
                        <form action={confirmDeliverySubmitAction}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2C9B57] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#247C47]"
                          >
                            <CheckCircle2 className="h-4 w-4" strokeWidth={2.1} />
                            Confirmar recepción
                          </button>
                        </form>
                      ) : canOpenChat ? (
                        <Link
                          href={`/app/matches/${match.id}/chat`}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B5CAD] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#094B8C]"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={2.1} />
                          Abrir chat
                        </Link>
                      ) : (
                        <MatchDetailActions
                          matchId={match.id}
                          status={match.status}
                          canAccept={canAccept}
                          canCancel={canCancel}
                          onAccept={acceptMatchAction}
                          onReject={rejectMatchAction}
                          onCancel={cancelMatchAction}
                        />
                      )}

                      {canOpenDispute && openDisputeSubmitAction ? (
                        <form action={openDisputeSubmitAction}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            <ShieldAlert className="h-4 w-4" strokeWidth={2.1} />
                            Solicitar revisión
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </section>

                </div>
              </div>

              {!canOpenChat ? (
                <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                  El chat se activará automáticamente cuando el match sea aceptado.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
