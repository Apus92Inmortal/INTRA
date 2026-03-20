export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import { createClient } from "@/lib/supabase/server";
import MatchesAutoRefresh from "./MatchesAutoRefresh";
import MatchesRealtime from "./MatchesRealtime";

function formatCurrency(value?: number | null) {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "Sin fecha";
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function statusStyles(status?: string | null) {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "accepted":
      return "Aceptado";
    case "rejected":
      return "Rechazado";
    case "cancelled":
      return "Cancelado";
    default:
      return "Pendiente";
  }
}

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type MatchRow = {
  id: string;
  status: string;
  created_at: string;
  trip_id: string;
  shipment_id: string;
  last_read_by_traveler: string | null;
  last_read_by_owner: string | null;
  trip: {
    id: string;
    traveler_id: string;
    departure_date: string | null;
    capacity_kg: number | null;
    origin_city?: { name: string } | null;
    destination_city?: { name: string } | null;
  } | null;
  shipment: {
    id: string;
    owner_id: string;
    kind: string | null;
    description: string | null;
    weight_kg: number | null;
    declared_value_cop: number | null;
    origin_city?: { name: string } | null;
    destination_city?: { name: string } | null;
  } | null;
};

export default async function MatchesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(`
      id,
      status,
      created_at,
      trip_id,
      shipment_id,
      last_read_by_traveler,
      last_read_by_owner,
      trip:trips (
        id,
        traveler_id,
        departure_date,
        capacity_kg,
        origin_city:cities!trips_origin_city_id_fkey (
          name
        ),
        destination_city:cities!trips_destination_city_id_fkey (
          name
        )
      ),
      shipment:shipments (
        id,
        owner_id,
        kind,
        description,
        weight_kg,
        declared_value_cop,
        origin_city:cities!shipments_origin_city_id_fkey (
          name
        ),
        destination_city:cities!shipments_destination_city_id_fkey (
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (matchesError) {
    return (
      <>
        <AppNavbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            Error cargando matches: {matchesError.message}
          </div>
        </main>
      </>
    );
  }

  const allMatches = (matchesData ?? []) as unknown as MatchRow[];

  const userMatches = allMatches.filter((match) => {
    const isTraveler = match.trip?.traveler_id === user.id;
    const isOwner = match.shipment?.owner_id === user.id;
    return isTraveler || isOwner;
  });

  const matchIds = userMatches.map((match) => match.id);

  const latestMessagesMap = new Map<string, MessageRow>();
  const unreadCountMap = new Map<string, number>();

  if (matchIds.length > 0) {
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("id, match_id, sender_id, message, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });

    if (messagesError) {
      return (
        <>
          <AppNavbar />
          <main className="mx-auto max-w-5xl px-4 py-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              Error cargando mensajes: {messagesError.message}
            </div>
          </main>
        </>
      );
    }

    const messages = (messagesData ?? []) as MessageRow[];

    for (const msg of messages) {
      if (!latestMessagesMap.has(msg.match_id)) {
        latestMessagesMap.set(msg.match_id, msg);
      }
    }

    for (const match of userMatches) {
      const isTraveler = match.trip?.traveler_id === user.id;
      const lastReadAt = isTraveler
        ? match.last_read_by_traveler
        : match.last_read_by_owner;

      const unreadCount = messages.filter((msg) => {
        if (msg.match_id !== match.id) return false;
        if (msg.sender_id === user.id) return false;

        if (!lastReadAt) {
          return true;
        }

        return (
          new Date(msg.created_at).getTime() > new Date(lastReadAt).getTime()
        );
      }).length;

      unreadCountMap.set(match.id, unreadCount);
    }
  }

  return (
    <>
      <AppNavbar />
      <MatchesRealtime />
      <MatchesAutoRefresh />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis matches</h1>
            <p className="mt-1 text-sm text-slate-600">
              Revisa tus coincidencias, estado y último mensaje.
            </p>
          </div>
        </div>

        {userMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">Aún no tienes matches.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userMatches.map((match) => {
              const latestMessage = latestMessagesMap.get(match.id);
              const unreadCount = unreadCountMap.get(match.id) ?? 0;

              const tripOrigin = match.trip?.origin_city?.name ?? "Sin origen";
              const tripDestination =
                match.trip?.destination_city?.name ?? "Sin destino";

              const shipmentOrigin =
                match.shipment?.origin_city?.name ?? "Sin origen";
              const shipmentDestination =
                match.shipment?.destination_city?.name ?? "Sin destino";

              const isTraveler = match.trip?.traveler_id === user.id;
              const otherRole = isTraveler ? "Cliente" : "Viajero";
              const canOpenChat = match.status === "accepted";

              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles(match.status)}`}
                        >
                          {statusLabel(match.status)}
                        </span>

                        <span className="text-xs text-slate-500">
                          Creado: {formatDate(match.created_at)}
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <h2 className="mb-2 text-sm font-semibold text-slate-900">
                            Viaje
                          </h2>
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">Ruta:</span>{" "}
                            {tripOrigin} → {tripDestination}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            <span className="font-medium">Salida:</span>{" "}
                            {formatDate(match.trip?.departure_date)}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            <span className="font-medium">Capacidad:</span>{" "}
                            {match.trip?.capacity_kg ?? 0} kg
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <h2 className="mb-2 text-sm font-semibold text-slate-900">
                            Envío
                          </h2>
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">Ruta:</span>{" "}
                            {shipmentOrigin} → {shipmentDestination}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            <span className="font-medium">Tipo:</span>{" "}
                            {match.shipment?.kind ?? "No especificado"}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            <span className="font-medium">Peso:</span>{" "}
                            {match.shipment?.weight_kg ?? 0} kg
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            <span className="font-medium">Valor:</span>{" "}
                            {formatCurrency(match.shipment?.declared_value_cop)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Último mensaje
                          </p>

                          {unreadCount > 0 ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                              {unreadCount} nuevo{unreadCount > 1 ? "s" : ""}
                            </span>
                          ) : null}
                        </div>

                        {latestMessage ? (
                          <>
                            <p className="line-clamp-2 text-sm text-slate-800">
                              {latestMessage.message}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(latestMessage.created_at)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Aún no hay mensajes en este chat.
                          </p>
                        )}
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-slate-500">
                          Conversación asociada al match · contraparte:{" "}
                          {otherRole}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2 md:flex-col">
                      <Link
                        href={`/app/matches/${match.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Ver detalle
                      </Link>

                      {canOpenChat ? (
                        <Link
                          href={`/app/matches/${match.id}/chat`}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          Abrir chat
                        </Link>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                          Chat al aceptar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}