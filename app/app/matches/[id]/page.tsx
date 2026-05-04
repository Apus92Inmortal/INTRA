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
import { fetchRatingSummaryMap } from "@/lib/reviews";
import { getEvidenceTypeLabel, getReportStatusLabel, getVerificationBadge } from "@/lib/trust";
import EvidenceUploader from "./EvidenceUploader";
import SuspiciousReportForm from "./SuspiciousReportForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  verification_status?: string | null;
};

type EvidenceRow = {
  id: string;
  uploaded_by: string;
  evidence_type: string;
  note: string | null;
  created_at: string;
  file_path: string;
  file_name: string | null;
};

type ReportEventRow = {
  id: string;
  reported_by: string;
  report_type: string;
  reason: string;
  status: string;
  created_at: string;
};

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

function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
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
  const dateLabel = formatDate(dateString);
  return timeString ? `${dateLabel} · ${formatTimeLabel(timeString)}` : dateLabel;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "IN";
}

function getReviewerName(review: MatchReviewRow) {
  const reviewerProfile = Array.isArray(review.reviewer_profile)
    ? review.reviewer_profile[0]
    : review.reviewer_profile;

  return reviewerProfile?.full_name?.trim() || "Usuario INTRA";
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => (
    <span key={`${rating}-${index}`} className={index < rating ? "text-amber-400" : "text-slate-200"}>
      ★
    </span>
  ));
}

function getShipmentTrackingLabel(status: string | null | undefined) {
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

function getShipmentTrackingClasses(status: string | null | undefined) {
  switch (status) {
    case "accepted":
      return "bg-emerald-100 text-emerald-700";
    case "in_transit":
      return "bg-blue-100 text-blue-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-slate-100 text-slate-700";
    case "matched":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getShipmentTrackingDescription(status: string | null | undefined) {
  switch (status) {
    case "accepted":
      return "El match fue aceptado. El siguiente paso es recoger el paquete.";
    case "in_transit":
      return "El viajero ya recogió el paquete y está en camino.";
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
        destination_city_id
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
        destination_city_id
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

  const { data: evidenceData } = shipment?.id
    ? await supabase
        .from("shipment_evidence")
        .select("id, uploaded_by, evidence_type, note, created_at, file_path, file_name")
        .eq("shipment_id", shipment.id)
        .order("created_at", { ascending: false })
    : { data: [] as EvidenceRow[] };

  const evidenceItems = await Promise.all(
    ((evidenceData ?? []) as EvidenceRow[]).map(async (evidence) => {
      const { data } = await supabase.storage
        .from("shipment-evidence")
        .createSignedUrl(evidence.file_path, 60 * 60);

      return {
        ...evidence,
        signedUrl: data?.signedUrl ?? null,
      };
    })
  );

  const { data: reportEventsData } = shipment?.id
    ? await supabase
        .from("shipment_report_events")
        .select("id, reported_by, report_type, reason, status, created_at")
        .eq("shipment_id", shipment.id)
        .order("created_at", { ascending: false })
    : { data: [] as ReportEventRow[] };

  const reportEvents = (reportEventsData ?? []) as ReportEventRow[];
  const otherUserId = isOwner ? travelerId : ownerId;
  const otherUserName = otherUserId
    ? participantNameById.get(otherUserId) ?? "la otra persona"
    : "la otra persona";

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

  const canUploadEvidence = isOwner || isTraveler;
  const allowedEvidenceTypes = Array.from(
    new Set([
      ...(isTraveler ? ["pickup"] : []),
      ...(isOwner ? ["delivery"] : []),
      "package_state",
    ])
  );

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

        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#0B2C4A]">
                  Detalle del match
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Revisa la información del envío y del viaje, y administra este
                  match desde aquí.
                </p>
              </div>

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
          </div>

            <div className="px-4 py-5 sm:px-8 sm:py-6">
              <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <h2 className="text-lg font-semibold text-[#0B2C4A]">
                    Envío
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Tipo:</span>{" "}
                    {getShipmentKindLabel(shipment?.kind)}
                  </p>

                  <p>
                    <span className="font-medium text-slate-900">
                      Descripción:
                    </span>{" "}
                    {shipment?.description?.trim() || "Sin descripción"}
                  </p>

                  <p>
                    <span className="font-medium text-slate-900">Peso:</span>{" "}
                    {shipment?.weight_kg ?? 0} kg
                  </p>

                  <p>
                    <span className="font-medium text-slate-900">Valor:</span>{" "}
                    {formatCurrency(shipment?.declared_value_cop)}
                  </p>

                  {ownerId ? (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cliente
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {participantNameById.get(ownerId) ?? "Usuario INTRA"}
                        </p>
                        <RatingSummaryBadge
                          avgRating={ratingSummaryMap[ownerId]?.avgRating ?? null}
                          totalReviews={ratingSummaryMap[ownerId]?.totalReviews ?? 0}
                        />
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getVerificationBadge(
                            participantVerificationById.get(ownerId)
                          ).classes}`}
                        >
                          {getVerificationBadge(participantVerificationById.get(ownerId)).label}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <p className="font-medium text-slate-900">Tracking:</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getShipmentTrackingClasses(
                          shipment?.status
                        )}`}
                      >
                        {getShipmentTrackingLabel(shipment?.status)}
                      </span>

                      {shipment?.tracking_code ? <TrackingCodeBadge code={shipment.tracking_code} /> : null}
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {getShipmentTrackingDescription(shipment?.status)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✈️</span>
                  <h2 className="text-lg font-semibold text-[#0B2C4A]">
                    Viaje
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">
                      Capacidad:
                    </span>{" "}
                    {trip?.capacity_kg ?? 0} kg
                  </p>

                  <p>
                    <span className="font-medium text-slate-900">Salida:</span>{" "}
                    {formatDepartureLabel(trip?.departure_date, trip?.departure_time)}
                  </p>

                  <p>
                    <span className="font-medium text-slate-900">Estado:</span>{" "}
                    {getStatusLabel(match.status)}
                  </p>

                  {travelerId ? (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Viajero
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {participantNameById.get(travelerId) ?? "Usuario INTRA"}
                        </p>
                        <RatingSummaryBadge
                          avgRating={ratingSummaryMap[travelerId]?.avgRating ?? null}
                          totalReviews={ratingSummaryMap[travelerId]?.totalReviews ?? 0}
                        />
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getVerificationBadge(
                            participantVerificationById.get(travelerId)
                          ).classes}`}
                        >
                          {getVerificationBadge(participantVerificationById.get(travelerId)).label}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

              {payment ? (
                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0B2C4A]">
                        💳 Pago seguro
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Retención temporal del dinero hasta que la entrega quede validada.
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        payment.status === "held"
                          ? "bg-amber-100 text-amber-700"
                          : payment.status === "released"
                          ? "bg-emerald-100 text-emerald-700"
                          : payment.status === "refunded"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {getStatusLabel(payment.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total pagado
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrency(payment.gross_amount ?? payment.amount)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Valor para viajero
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrency(payment.traveler_amount)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Comisión INTRA
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrency(payment.intra_fee)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Fee de pasarela
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrency(payment.gateway_fee_estimated)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    {payment.traveler_delivered_at ? (
                      <p>
                        Viajero reportó entrega: <span className="font-medium text-slate-900">{formatDateTime(payment.traveler_delivered_at)}</span>
                      </p>
                    ) : null}
                    {payment.delivered_at ? (
                      <p>
                        Cliente confirmó recepción: <span className="font-medium text-slate-900">{formatDateTime(payment.delivered_at)}</span>
                      </p>
                    ) : null}
                    {payment.dispute_status === "open" && payment.dispute_deadline_at ? (
                      <p>
                        Ventana de disputa: <span className="font-medium text-slate-900">hasta {formatDateTime(payment.dispute_deadline_at)}</span>
                      </p>
                    ) : null}
                    {payment.auto_release_at ? (
                      <p>
                        Auto liberación programada: <span className="font-medium text-slate-900">{formatDateTime(payment.auto_release_at)}</span>
                      </p>
                    ) : null}
                    {payment.released_at ? (
                      <p>
                        Liberado al viajero: <span className="font-medium text-slate-900">{formatDateTime(payment.released_at)}</span>
                      </p>
                    ) : null}
                    {payment.dispute_status === "open" ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                        Hay una disputa abierta. El dinero seguirá retenido hasta revisión manual.
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-[#0B2C4A]">
                  Acciones del match
                </h2>

                <div className="mt-4 space-y-3">
                  <MatchDetailActions
                    matchId={match.id}
                    status={match.status}
                    canAccept={canAccept}
                    canCancel={canCancel}
                    onAccept={acceptMatchAction}
                    onReject={rejectMatchAction}
                    onCancel={cancelMatchAction}
                  />

                  {canMarkInTransit && markInTransitSubmitAction ? (
                    <form action={markInTransitSubmitAction}>
                      <button
                        type="submit"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                      >
                        Recogí el paquete
                      </button>
                    </form>
                  ) : null}

                  {canMarkDelivered && markDeliveredSubmitAction ? (
                    <form action={markDeliveredSubmitAction}>
                      <button
                        type="submit"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                      >
                        Paquete entregado
                      </button>
                    </form>
                  ) : null}

                  {canConfirmDelivery && confirmDeliverySubmitAction ? (
                    <form action={confirmDeliverySubmitAction}>
                      <button
                        type="submit"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 sm:w-auto"
                      >
                        Paquete recibido
                      </button>
                    </form>
                  ) : null}

                  {canOpenDispute && openDisputeSubmitAction ? (
                    <form action={openDisputeSubmitAction}>
                      <button
                        type="submit"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 sm:w-auto"
                      >
                        Abrir disputa
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              <section className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0B2C4A]">
                      Evidencia y seguridad
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Aquí queda la trazabilidad visual del paquete y cualquier alerta manual del match.
                    </p>
                  </div>
                </div>

                {canUploadEvidence && shipment?.id ? (
                  <EvidenceUploader
                    shipmentId={shipment.id}
                    matchId={match.id}
                    allowedTypes={allowedEvidenceTypes}
                  />
                ) : null}

                {shipment?.id && isTraveler && ownerId ? (
                  <SuspiciousReportForm
                    shipmentId={shipment.id}
                    matchId={match.id}
                    reporterName={participantNameById.get(user.id) ?? "El viajero"}
                    recipientUserId={ownerId}
                  />
                ) : null}

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Si el paquete no coincide con lo declarado, puedes rechazarlo y dejar evidencia aquí mismo.
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#0B2C4A]">Evidencias cargadas</h3>
                    {evidenceItems.length > 0 ? (
                      evidenceItems.map((evidence) => (
                        <article
                          key={evidence.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              {getEvidenceTypeLabel(evidence.evidence_type)}
                            </span>
                            <span className="text-xs text-slate-500">
                              por {participantNameById.get(evidence.uploaded_by) ?? "Usuario INTRA"}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(evidence.created_at)}
                            </span>
                          </div>

                          {evidence.note ? (
                            <p className="mt-3 text-sm text-slate-600">{evidence.note}</p>
                          ) : null}

                          {evidence.signedUrl ? (
                            <a
                              href={evidence.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-sm font-semibold text-[#0B2C4A] hover:underline"
                            >
                              Ver archivo {evidence.file_name ? `(${evidence.file_name})` : ""}
                            </a>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                        Todavía no hay evidencias cargadas para este envío.
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#0B2C4A]">Reportes manuales</h3>
                    {reportEvents.length > 0 ? (
                      reportEvents.map((report) => (
                        <article
                          key={report.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                              {report.report_type === "suspicious_package" ? "Paquete sospechoso" : "Reporte"}
                            </span>
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              {getReportStatusLabel(report.status)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-700">{report.reason}</p>
                          <p className="mt-3 text-xs text-slate-400">
                            Reportado por {participantNameById.get(report.reported_by) ?? "Usuario INTRA"} · {formatDateTime(report.created_at)}
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                        No hay reportes manuales para este match.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0B2C4A]">
                      Reviews de este match
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Aquí se refleja la experiencia entre cliente y viajero después de una entrega completada.
                    </p>
                  </div>

                  {otherUserId ? (
                    <RatingSummaryBadge
                      avgRating={ratingSummaryMap[otherUserId]?.avgRating ?? null}
                      totalReviews={ratingSummaryMap[otherUserId]?.totalReviews ?? 0}
                    />
                  ) : null}
                </div>

                {canLeaveReview ? (
                  <ReviewComposer matchId={match.id} otherUserName={otherUserName} />
                ) : null}

                {matchReviews.length > 0 ? (
                  <div className="space-y-3">
                    {matchReviews.map((review) => {
                      const reviewerName = getReviewerName(review);

                      return (
                        <article
                          key={review.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0B2C4A] text-sm font-semibold text-white">
                              {getInitials(reviewerName)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-semibold text-[#0B2C4A]">{reviewerName}</p>
                                  <div className="mt-1 flex items-center gap-1 text-lg leading-none">
                                    {renderStars(review.rating)}
                                  </div>
                                </div>

                                <p className="text-xs text-slate-400">
                                  {formatDate(review.created_at)}
                                </p>
                              </div>

                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {review.comment?.trim() || "Sin comentario adicional."}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                    Aún no hay reviews para este match.
                  </div>
                )}
              </section>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {canOpenChat ? (
                  <Link
                    href={`/app/matches/${match.id}/chat`}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    💬 Abrir chat
                  </Link>
                ) : (
                  <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
                    El chat se activará automáticamente cuando el match sea aceptado.
                  </div>
                )}

                <Link
                  href="/app/matches"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  ← Volver a matches
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
