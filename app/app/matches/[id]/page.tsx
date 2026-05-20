import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import { RatingSummaryBadge } from "@/components/rating-summary-badge";
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
import { fetchRatingSummaryMap, getReviewWindowState } from "@/lib/reviews";
import SuspiciousReportForm from "./SuspiciousReportForm";
import ReviewComposer from "./ReviewComposer";
import { CheckCircle2, MessageCircle, PackageCheck, Route, ShieldAlert, Truck } from "lucide-react";

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
  iata_code?: string | null;
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

function getCityCode(city: CityRelation) {
  const cityName = getCityName(city);

  if (!city) return null;
  if (Array.isArray(city)) {
    const firstCity = city[0];
    if (firstCity?.iata_code) return firstCity.iata_code.toUpperCase();
    return cityName ? cityName.slice(0, 3).toUpperCase() : null;
  }

  if (city.iata_code) return city.iata_code.toUpperCase();
  return cityName ? cityName.slice(0, 3).toUpperCase() : null;
}

function getRouteShortLabel(origin: CityRelation, destination: CityRelation) {
  const originCode = getCityCode(origin) ?? "ORG";
  const destinationCode = getCityCode(destination) ?? "DST";
  return `${originCode} → ${destinationCode}`;
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
  if (deliveredAt || travelerDeliveredAt || shipmentStatus === "delivered" || matchStatus === "completed") return 2;
  if (shipmentStatus === "in_transit") return 1;
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
        origin_city:cities!trips_origin_city_id_fkey(name, iata_code),
        destination_city:cities!trips_destination_city_id_fkey(name, iata_code)
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
        origin_city:cities!shipments_origin_city_id_fkey(name, iata_code),
        destination_city:cities!shipments_destination_city_id_fkey(name, iata_code)
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
          "id, status, amount, gross_amount, traveler_amount, intra_fee, gateway_fee_estimated, dispute_status, dispute_deadline_at, auto_release_at, released_at, refunded_at, delivered_at, traveler_delivered_at, updated_at"
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
  const shipmentRouteShortLabel = getRouteShortLabel(
    shipment?.origin_city as CityRelation,
    shipment?.destination_city as CityRelation
  );
  const tripRouteLabel = `${getCityName(trip?.origin_city as CityRelation) ?? "Origen"} → ${getCityName(
    trip?.destination_city as CityRelation
  ) ?? "Destino"}`;
  const primaryPanelTitle = isTraveler ? "Envío solicitado" : "Viaje disponible";
  const otherUserAvgRating = otherUserId ? ratingSummaryMap[otherUserId]?.avgRating ?? null : null;
  const otherUserTotalReviews = otherUserId ? ratingSummaryMap[otherUserId]?.totalReviews ?? 0 : 0;
  const reviewStageStartedAt =
    payment?.delivered_at ??
    (match.status === "completed" ? payment?.updated_at ?? match.created_at : null);
  const reviewWindow = getReviewWindowState(reviewStageStartedAt, new Date());
  const isReviewStage =
    match.status === "completed" ||
    shipment?.status === "delivered" ||
    Boolean(payment?.delivered_at);
  const { data: existingReview } = isReviewStage
    ? await supabase
        .from("reviews")
        .select("id, rating")
        .eq("match_id", match.id)
        .eq("reviewer_id", user.id)
        .maybeSingle()
    : { data: null };
  if (isReviewStage && !existingReview && reviewWindow.isReminderDue) {
    await supabase.rpc("ensure_review_reminder", {
      p_match_id: match.id,
    });
  }

  const progressIndex = getProgressStepIndex({
    matchStatus: match.status,
    shipmentStatus: shipment?.status,
    travelerDeliveredAt: payment?.traveler_delivered_at,
    deliveredAt: payment?.delivered_at,
  });
  const matchCode = shipment?.tracking_code || `MATCH-${match.id.slice(0, 8).toUpperCase()}`;
  const progressSteps = [
    "Aceptado",
    "En tránsito",
    "Entregado",
  ];
  const matchStatusBadgeClass =
    match.status === "pending"
      ? "border border-intra-warning-border bg-intra-warning-soft text-intra-warning-text"
      : match.status === "accepted"
        ? "border border-intra-success-border bg-intra-success-soft text-intra-text-success"
        : match.status === "rejected"
          ? "border border-intra-danger-border bg-intra-danger-soft text-intra-danger"
          : "border border-intra-border bg-intra-neutral-pill text-intra-text-muted";
  const primaryActionButtonClass =
    "intra-btn intra-btn-primary min-h-11 w-full gap-2 rounded-2xl px-5 py-2.5";
  const chatActionButtonClass =
    "intra-btn min-h-11 w-full gap-2 rounded-2xl bg-intra-info px-5 py-2.5 text-white hover:opacity-95";
  const warningActionButtonClass =
    "intra-btn min-h-11 w-full gap-2 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-5 py-2.5 text-intra-warning-text hover:bg-intra-warning-soft-alt";

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
      <main className="intra-page-shell px-4 py-6 sm:px-6 sm:py-8">
        <MatchDetailRealtime matchId={match.id} />

        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[28px] border border-intra-border-strong bg-intra-card shadow-sm">
            <div className="border-b border-intra-border-strong bg-[linear-gradient(90deg,var(--intra-card)_0%,var(--intra-neutral-soft-alt)_100%)] px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-intra-info-soft text-intra-info">
                      <Route className="intra-icon-emphasis" strokeWidth={2.1} />
                    </div>
                    <h1 className="intra-page-title">
                      {shipmentRouteShortLabel}
                    </h1>
                    <span className={`intra-pill intra-badge-text w-fit ${matchStatusBadgeClass}`}>
                      {getStatusLabel(match.status)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col items-start gap-2 intra-body sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
                    <span className="text-left">
                      <span className="intra-caption">{otherUserRoleLabel}:</span>{" "}
                      <span className="intra-body-strong">{otherUserName}</span>
                    </span>
                    {otherUserTotalReviews > 0 ? (
                      <RatingSummaryBadge
                        avgRating={otherUserAvgRating}
                        totalReviews={otherUserTotalReviews}
                        className="self-start sm:self-auto"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-2 text-center">
                  <TrackingCodeBadge code={matchCode} className="!bg-intra-blue hover:!bg-intra-blue" />
                  <span className="intra-caption">Creado: {formatDate(match.created_at)}</span>
                </div>
              </div>

              <div className="mt-5">
                <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted">Progreso del envío</p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                  {progressSteps.map((step, index) => {
                    const isDone = index <= progressIndex;
                    const isCurrent = index === progressIndex;

                    return (
                      <div key={step} className="min-w-0">
                        <div
                          className={`h-2.5 rounded-full transition ${
                            isDone ? "bg-intra-green" : "bg-intra-neutral-pill"
                          }`}
                        />
                        <p
                          className={`intra-step-label mt-2 text-center ${
                            isCurrent ? "text-intra-blue" : isDone ? "text-intra-text-muted" : "text-intra-text-muted/70"
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
                  <section className="rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-info-soft-alt)_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isTraveler ? "bg-intra-warning-soft text-intra-warning" : "bg-intra-info-soft text-intra-info"}`}>
                        {isTraveler ? <PackageCheck className="intra-icon-body" strokeWidth={2.1} /> : <Route className="intra-icon-body" strokeWidth={2.1} />}
                      </div>
                      <div>
                        <h2 className="intra-h3">{primaryPanelTitle}</h2>
                      </div>
                    </div>

                    {isTraveler ? (
                      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
                        <div className="space-y-3 intra-body">
                          <p><span className="intra-body-strong">Tipo:</span> {getShipmentKindLabel(shipment?.kind)}</p>
                          <p><span className="intra-body-strong">Valor:</span> {formatCurrency(shipment?.declared_value_cop)}</p>
                          <p><span className="intra-body-strong">Descripción:</span> {shipment?.description?.trim() || "Sin descripción"}</p>
                          <p><span className="intra-body-strong">Peso:</span> {shipment?.weight_kg ?? 0} kg</p>
                        </div>

                        {shipment?.id && ownerId ? (
                          <div className="flex flex-col justify-center rounded-2xl border border-intra-warning-border bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-warning-soft)_100%)] p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-intra-warning-text">
                              <div className="intra-icon-shell-body rounded-xl bg-intra-warning-soft-alt">
                                <ShieldAlert className="intra-icon-body" strokeWidth={2} />
                              </div>
                              <p className="intra-caption-strong uppercase tracking-wide text-intra-warning-text">Protección del envío</p>
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
                      <div className="mt-4 space-y-3 intra-body">
                        <p><span className="intra-body-strong">Salida:</span> {formatDate(trip?.departure_date)}</p>
                        <p><span className="intra-body-strong">Hora:</span> {formatTimeLabel(trip?.departure_time)}</p>
                        <p><span className="intra-body-strong">Capacidad:</span> {trip?.capacity_kg ?? 0} kg</p>
                        <p><span className="intra-body-strong">Ruta del viaje:</span> {tripRouteLabel}</p>
                      </div>
                    )}
                  </section>

                </div>

                <div className="space-y-5">
                  {isReviewStage ? (
                    <ReviewComposer
                      matchId={match.id}
                      existingRating={existingReview?.rating ?? null}
                      isExpired={!existingReview && reviewWindow.isExpired}
                      otherUserName={otherUserName}
                    />
                  ) : (
                    <section className="rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-neutral-soft-alt)_100%)] p-5 shadow-sm">
                      <h2 className="intra-h3">Acciones del match</h2>

                      <div className="mt-5 space-y-3">
                        {canMarkInTransit && markInTransitSubmitAction ? (
                          <form action={markInTransitSubmitAction}>
                            <button
                              type="submit"
                              className={primaryActionButtonClass}
                            >
                              <PackageCheck className="intra-icon-body" strokeWidth={2.1} />
                              Confirmar recogida
                            </button>
                          </form>
                        ) : null}

                        {canMarkDelivered && markDeliveredSubmitAction ? (
                          <form action={markDeliveredSubmitAction}>
                            <button
                              type="submit"
                              className={primaryActionButtonClass}
                            >
                              <Truck className="intra-icon-body" strokeWidth={2.1} />
                              Confirmar entrega
                            </button>
                          </form>
                        ) : null}

                        {canConfirmDelivery && confirmDeliverySubmitAction ? (
                          <form action={confirmDeliverySubmitAction}>
                            <button
                              type="submit"
                              className={primaryActionButtonClass}
                            >
                              <CheckCircle2 className="intra-icon-body" strokeWidth={2.1} />
                              Confirmar recepción
                            </button>
                          </form>
                        ) : canOpenChat ? (
                          <Link
                            href={`/app/matches/${match.id}/chat`}
                            className={chatActionButtonClass}
                          >
                            <MessageCircle className="intra-icon-body" strokeWidth={2.1} />
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
                              className={warningActionButtonClass}
                            >
                              <ShieldAlert className="intra-icon-body" strokeWidth={2.1} />
                              Solicitar revisión
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </section>
                  )}

                </div>
              </div>

              {!canOpenChat ? (
                <div className="mt-6 rounded-2xl bg-intra-neutral-pill px-4 py-3 intra-body">
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
