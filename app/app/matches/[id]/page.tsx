import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import MatchDetailActions from "./MatchDetailActions";
import MatchDetailRealtime from "./MatchDetailRealtime";
import ReviewComposer from "./ReviewComposer";
import {
  acceptMatchAction,
  rejectMatchAction,
  cancelMatchAction,
  markInTransitFormAction,
  markDeliveredFormAction,
  openDisputeFormAction,
  confirmDeliveryFormAction,
} from "./actions";
import { RatingSummaryBadge } from "@/components/rating-summary-badge";
import { TrackingCodeBadge } from "@/components/tracking-code-badge";
import { getStatusLabel, getShipmentKindLabel } from "@/lib/labels";
import { fetchRatingSummaryMap, formatRatingValue } from "@/lib/reviews";
import { getVerificationBadge } from "@/lib/trust";
import SuspiciousReportForm from "./SuspiciousReportForm";

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

type MatchReviewRow = {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_profile:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

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

function formatDepartureLabel(dateString: string | null | undefined, timeString: string | null | undefined) {
  const dateLabel = formatDate(dateString);
  return timeString ? `${dateLabel} · ${formatTimeLabel(timeString)}` : dateLabel;
}

function getCityName(city: CityRelation) {
  if (!city) return null;
  if (Array.isArray(city)) return city[0]?.name ?? null;
  return city.name ?? null;
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => (
    <span key={`${rating}-${index}`} className={index < rating ? "text-amber-400" : "text-slate-200"}>
      ★
    </span>
  ));
}

function getRatingSummaryText(avgRating: number | null | undefined, totalReviews: number) {
  const formatted = formatRatingValue(avgRating);

  if (!formatted || totalReviews <= 0) {
    return "Nuevo usuario";
  }

  return `⭐ ${formatted} · ${totalReviews} valoraciones`;
}

function getNextStepContent({
  matchStatus,
  shipmentStatus,
  isOwner,
  travelerDeliveredAt,
}: {
  matchStatus: string;
  shipmentStatus: string | null | undefined;
  isOwner: boolean;
  travelerDeliveredAt: string | null | undefined;
}) {
  if (matchStatus === "pending") {
    return isOwner
      ? {
          label: "Decisión pendiente",
          title: "Revisa esta solicitud",
          description: "Confirma si este viajero encaja con tu envío para abrir la coordinación.",
        }
      : {
          label: "Esperando respuesta",
          title: "Tu solicitud ya fue enviada",
          description: "Cuando el cliente la acepte, se habilita el chat y el siguiente paso del envío.",
        };
  }

  if (shipmentStatus === "matched") {
    return {
      label: "Coordinación",
      title: "Define la recogida",
      description: "Usen el chat para cerrar hora, punto y condiciones de entrega del paquete.",
    };
  }

  if (shipmentStatus === "in_transit" && travelerDeliveredAt && isOwner) {
    return {
      label: "Confirmación final",
      title: "Confirma la recepción",
      description: "Si ya recibiste el paquete, marca la entrega para cerrar el flujo correctamente.",
    };
  }

  if (shipmentStatus === "in_transit" && travelerDeliveredAt) {
    return {
      label: "Esperando confirmación",
      title: "Entrega reportada",
      description: "Tu reporte ya quedó hecho. Ahora solo falta la confirmación del cliente.",
    };
  }

  if (shipmentStatus === "in_transit") {
    return {
      label: "En curso",
      title: "El paquete ya va en camino",
      description: "Mantén la coordinación por chat y usa esta vista solo para el siguiente paso operativo.",
    };
  }

  if (shipmentStatus === "delivered" || matchStatus === "completed") {
    return {
      label: "Cierre",
      title: "Flujo completado",
      description: "Si aún falta, deja tu calificación para fortalecer la reputación del otro usuario.",
    };
  }

  if (matchStatus === "rejected" || matchStatus === "cancelled") {
    return {
      label: "Cierre",
      title: "Este match ya no sigue activo",
      description: "Puedes volver a matches para revisar otras conversaciones o solicitudes.",
    };
  }

  return {
    label: "Estado actual",
    title: "Revisa el siguiente paso",
    description: "Aquí verás solo lo necesario para continuar este match sin ruido adicional.",
  };
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

  const { data: participantVerifications } = participantIds.length
    ? await supabase
        .from("user_verifications")
        .select("user_id, verification_status")
        .in("user_id", participantIds)
    : { data: [] as Array<{ user_id: string; verification_status: string | null }> };

  const participantNameById = new Map<string, string>(
    ((participantProfiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Usuario INTRA",
    ])
  );

  const participantVerificationById = new Map<string, string | null>(
    ((participantVerifications ?? []) as Array<{ user_id: string; verification_status: string | null }>).map((verification) => [
      verification.user_id,
      verification.verification_status ?? null,
    ])
  );

  const ratingSummaryMap = await fetchRatingSummaryMap(supabase, participantIds);

  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(
      `
        id,
        reviewer_id,
        reviewed_user_id,
        rating,
        comment,
        created_at,
        reviewer_profile:profiles!reviews_reviewer_id_fkey(full_name)
      `
    )
    .eq("match_id", match.id)
    .order("created_at", { ascending: false });

  const matchReviews = (reviewsData ?? []) as MatchReviewRow[];
  const currentUserReview = matchReviews.find((review) => review.reviewer_id === user.id) ?? null;
  const otherUserId = isOwner ? travelerId : ownerId;
  const otherUserName = otherUserId
    ? participantNameById.get(otherUserId) ?? "la otra persona"
    : "la otra persona";
  const otherUserRoleLabel = isOwner ? "Viajero" : "Cliente";
  const ownerName = ownerId
    ? participantNameById.get(ownerId) ?? "Usuario INTRA"
    : "Usuario INTRA";
  const shipmentRouteLabel = `${getCityName(shipment?.origin_city as CityRelation) ?? "Origen"} → ${getCityName(
    shipment?.destination_city as CityRelation
  ) ?? "Destino"}`;
  const tripRouteLabel = `${getCityName(trip?.origin_city as CityRelation) ?? "Origen"} → ${getCityName(
    trip?.destination_city as CityRelation
  ) ?? "Destino"}`;
  const primaryPanelTitle = isTraveler ? "Envío solicitado" : "Viaje disponible";
  const secondaryPanelTitle = isTraveler ? "Viaje asignado" : "Envío confirmado";
  const otherUserVerification = getVerificationBadge(
    otherUserId ? participantVerificationById.get(otherUserId) : null
  );
  const otherUserRatingText = otherUserId
    ? getRatingSummaryText(
        ratingSummaryMap[otherUserId]?.avgRating ?? null,
        ratingSummaryMap[otherUserId]?.totalReviews ?? 0
      )
    : "Nuevo usuario";
  const nextStep = getNextStepContent({
    matchStatus: match.status,
    shipmentStatus: shipment?.status,
    isOwner,
    travelerDeliveredAt: payment?.traveler_delivered_at,
  });
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

  const canLeaveReview =
    match.status === "completed" &&
    Boolean(otherUserId) &&
    !currentUserReview;

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
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/app/matches"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Volver a matches
            </Link>

            {canOpenChat ? (
              <Link
                href={`/app/matches/${match.id}/chat`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-2.5 font-semibold text-white transition hover:opacity-95"
              >
                💬 Abrir chat
              </Link>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isTraveler ? "bg-[#EAF8EF] text-[#2C9B57]" : "bg-[#EEF4FB] text-[#0B5CAD]"}`}>
                      <span className="text-xl">{isTraveler ? "📦" : "✈️"}</span>
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
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Coordina la recogida y revisa los datos clave del match.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                    <span>
                      <span className="font-medium text-slate-500">{otherUserRoleLabel}:</span>{" "}
                      <span className="font-semibold text-[#0B2C4A]">{otherUserName}</span>
                    </span>
                    <span>{otherUserRatingText}</span>
                    <span>Creado: {formatDate(match.created_at)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <TrackingCodeBadge code={matchCode} className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 [&>span:last-child]:text-slate-400" />
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

                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      {isTraveler ? (
                        <>
                          <p><span className="font-medium text-slate-900">Tipo:</span> {getShipmentKindLabel(shipment?.kind)}</p>
                          <p><span className="font-medium text-slate-900">Valor:</span> {formatCurrency(shipment?.declared_value_cop)}</p>
                          <p><span className="font-medium text-slate-900">Descripción:</span> {shipment?.description?.trim() || "Sin descripción"}</p>
                          <p><span className="font-medium text-slate-900">Peso:</span> {shipment?.weight_kg ?? 0} kg</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium text-slate-900">Salida:</span> {formatDepartureLabel(trip?.departure_date, trip?.departure_time)}</p>
                          <p><span className="font-medium text-slate-900">Capacidad:</span> {trip?.capacity_kg ?? 0} kg</p>
                          <p><span className="font-medium text-slate-900">Ruta del viaje:</span> {tripRouteLabel}</p>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-[#0B2C4A]">{secondaryPanelTitle}</h2>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                      {isTraveler ? (
                        <>
                          <p><span className="font-medium text-slate-900">Ruta:</span> {tripRouteLabel}</p>
                          <p><span className="font-medium text-slate-900">Salida:</span> {formatDepartureLabel(trip?.departure_date, trip?.departure_time)}</p>
                          <p><span className="font-medium text-slate-900">Capacidad:</span> {trip?.capacity_kg ?? 0} kg</p>
                          <p><span className="font-medium text-slate-900">Cliente:</span> {ownerName}</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium text-slate-900">Tipo:</span> {getShipmentKindLabel(shipment?.kind)}</p>
                          <p><span className="font-medium text-slate-900">Peso:</span> {shipment?.weight_kg ?? 0} kg</p>
                          <p><span className="font-medium text-slate-900">Valor:</span> {formatCurrency(shipment?.declared_value_cop)}</p>
                          <p><span className="font-medium text-slate-900">Cliente:</span> {ownerName}</p>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-[#0B2C4A]">{otherUserRoleLabel}</h2>
                        <p className="mt-1 text-sm text-slate-500">{otherUserName}</p>
                      </div>

                      {otherUserId ? (
                        <RatingSummaryBadge
                          avgRating={ratingSummaryMap[otherUserId]?.avgRating ?? null}
                          totalReviews={ratingSummaryMap[otherUserId]?.totalReviews ?? 0}
                        />
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {otherUserRoleLabel}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${otherUserVerification.classes}`}>
                        {otherUserVerification.label}
                      </span>
                      <span className="rounded-full bg-[#FFF7E8] px-3 py-1 text-xs font-semibold text-[#9A6B00]">
                        {otherUserRatingText}
                      </span>
                    </div>

                    {canLeaveReview ? (
                      <div className="mt-5">
                        <ReviewComposer matchId={match.id} otherUserName={otherUserName} />
                      </div>
                    ) : currentUserReview ? (
                      <article className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-[#0B2C4A]">Tu calificación a {otherUserName}</p>
                            <div className="mt-1 flex items-center gap-1 text-lg leading-none">
                              {renderStars(currentUserReview.rating)}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400">{formatDate(currentUserReview.created_at)}</p>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {currentUserReview.comment?.trim() || "Sin comentario adicional."}
                        </p>
                      </article>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                        La calificación se habilita cuando la experiencia ya quedó cerrada.
                      </div>
                    )}
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="rounded-2xl border border-[#D9E4F0] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFD_100%)] p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0B5CAD]">Próximo paso</p>
                    <h2 className="mt-2 text-lg font-semibold text-[#0B2C4A]">{nextStep.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{nextStep.description}</p>

                    <div className="mt-5 space-y-3">
                      {canMarkInTransit && markInTransitSubmitAction ? (
                        <form action={markInTransitSubmitAction}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                          >
                            Confirmar recogida
                          </button>
                        </form>
                      ) : null}

                      {canMarkDelivered && markDeliveredSubmitAction ? (
                        <form action={markDeliveredSubmitAction}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                          >
                            Confirmar entrega
                          </button>
                        </form>
                      ) : null}

                      {canConfirmDelivery && confirmDeliverySubmitAction ? (
                        <form action={confirmDeliverySubmitAction}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                          >
                            Confirmar recepción
                          </button>
                        </form>
                      ) : canOpenChat ? (
                        <Link
                          href={`/app/matches/${match.id}/chat`}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                        >
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
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            Solicitar revisión
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-[#0B2C4A]">Progreso del envío</h2>

                    <div className="mt-5 grid grid-cols-4 gap-2">
                      {progressSteps.map((step, index) => {
                        const isDone = index <= progressIndex;
                        const isCurrent = index === progressIndex;

                        return (
                          <div key={step} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div
                                className={`h-8 w-8 rounded-full border text-xs font-semibold flex items-center justify-center ${
                                  isDone
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-400"
                                }`}
                              >
                                {isDone ? "✓" : index + 1}
                              </div>
                            </div>
                            <p className={`mt-2 text-[11px] font-semibold leading-4 ${isCurrent ? "text-[#0B2C4A]" : "text-slate-500"}`}>
                              {step}
                            </p>
                            {isCurrent ? (
                              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-emerald-600">Actual</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#FFFDF8_0%,#FFF7E8_100%)] p-5 shadow-sm">
                    {shipment?.id && isTraveler && ownerId ? (
                      <>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Protección del envío</p>
                          <h2 className="mt-2 text-lg font-semibold text-[#0B2C4A]">Activa una alerta si algo no cuadra</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Si el paquete no coincide con lo acordado o detectas algo irregular, activa una alerta.
                          </p>
                        </div>

                        <div className="mt-4">
                          <SuspiciousReportForm
                            shipmentId={shipment.id}
                            matchId={match.id}
                            reporterName={participantNameById.get(user.id) ?? "El viajero"}
                            recipientUserId={ownerId}
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Protección del envío</p>
                        <h2 className="mt-2 text-lg font-semibold text-[#0B2C4A]">Seguimiento protegido</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Si surge una irregularidad durante la coordinación o la entrega, el flujo de protección se activa desde el lado operativo correspondiente.
                        </p>
                      </div>
                    )}
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
