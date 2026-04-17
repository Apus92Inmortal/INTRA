import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchDetailActions from "./MatchDetailActions";
import MatchDetailRealtime from "./MatchDetailRealtime";
import {
  acceptMatchAction,
  rejectMatchAction,
  cancelMatchAction,
  markInTransitAndRevalidateAction,
  confirmDeliveryAndRevalidateAction,
} from "./actions";
import { getStatusLabel, getShipmentKindLabel } from "@/lib/labels";

type PageProps = {
  params: Promise<{ id: string }>;
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

  const isOwner = user.id === shipment?.owner_id;
  const isTraveler = user.id === trip?.traveler_id;

  const canAccept = isOwner && match.status === "pending";
  const canCancel =
    (isOwner || isTraveler) &&
    (match.status === "pending" || match.status === "accepted");

  const canOpenChat = match.status === "accepted";

  const canMarkInTransit =
    isTraveler &&
    match.status === "accepted" &&
    shipment?.status === "accepted";

  const canConfirmDelivery =
    isOwner &&
    match.status === "accepted" &&
    shipment?.status === "in_transit";

  const markInTransitFormAction =
    shipment?.id && match?.id
      ? markInTransitAndRevalidateAction.bind(null, shipment.id, match.id)
      : undefined;

  const confirmDeliveryFormAction =
    shipment?.id && match?.id
      ? confirmDeliveryAndRevalidateAction.bind(null, shipment.id, match.id)
      : undefined;

  return (
    <main className="min-h-screen bg-[#EEF2F7] px-4 py-8 sm:px-6">
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

          <div className="px-6 py-6 sm:px-8">
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

                  <div className="pt-2">
                    <p className="font-medium text-slate-900">Tracking:</p>

                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getShipmentTrackingClasses(
                          shipment?.status
                        )}`}
                      >
                        {getShipmentTrackingLabel(shipment?.status)}
                      </span>
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
                    {formatDate(trip?.departure_date)}
                  </p>

                  <p>
                    <span className="font-medium text-slate-900">Estado:</span>{" "}
                    {getStatusLabel(match.status)}
                  </p>
                </div>
              </section>
            </div>

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

                {canMarkInTransit && markInTransitFormAction ? (
                  <form action={markInTransitFormAction}>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Recogí el paquete
                    </button>
                  </form>
                ) : null}

                {canConfirmDelivery && confirmDeliveryFormAction ? (
                  <form action={confirmDeliveryFormAction}>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Confirmar entrega
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {canOpenChat ? (
                <Link
                  href={`/app/matches/${match.id}/chat`}
                  className="inline-flex items-center rounded-2xl bg-[#0B2C4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
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
                className="inline-flex items-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ← Volver a matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}