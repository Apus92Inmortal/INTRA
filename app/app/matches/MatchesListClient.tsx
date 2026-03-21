"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type MatchItem = {
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
  latestMessage: MessageRow | null;
  unreadCount: number;
};

type Props = {
  currentUserId: string;
  initialMatches: MatchItem[];
};

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
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "";

  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "p. m." : "a. m.";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
}

function statusStyles(status?: string | null) {
  switch (status) {
    case "accepted":
      return "border-green-200 bg-green-50 text-green-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "cancelled":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
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

export default function MatchesListClient({
  currentUserId,
  initialMatches,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    const matchIds = new Set(matches.map((m) => m.id));
    if (matchIds.size === 0) return;

    const channel = supabase
      .channel(`matches-list-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const incoming = payload.new as MessageRow;
          if (!matchIds.has(incoming.match_id)) return;

          setMatches((prev) =>
            prev.map((match) => {
              if (match.id !== incoming.match_id) return match;

              const isTraveler = match.trip?.traveler_id === currentUserId;
              const lastReadAt = isTraveler
                ? match.last_read_by_traveler
                : match.last_read_by_owner;

              const isMine = incoming.sender_id === currentUserId;

              let nextUnread = match.unreadCount;

              if (!isMine) {
                if (!lastReadAt) {
                  nextUnread += 1;
                } else {
                  const msgTime = new Date(incoming.created_at).getTime();
                  const lastReadTime = new Date(lastReadAt).getTime();

                  if (msgTime > lastReadTime) {
                    nextUnread += 1;
                  }
                }
              }

              return {
                ...match,
                latestMessage: incoming,
                unreadCount: nextUnread,
              };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            status: string;
            last_read_by_owner: string | null;
            last_read_by_traveler: string | null;
          };

          if (!matchIds.has(updated.id)) return;

          setMatches((prev) =>
            prev.map((match) => {
              if (match.id !== updated.id) return match;

              const isTraveler = match.trip?.traveler_id === currentUserId;
              const newLastReadAt = isTraveler
                ? updated.last_read_by_traveler
                : updated.last_read_by_owner;

              let nextUnread = match.unreadCount;

              if (newLastReadAt) {
                nextUnread = 0;
              }

              return {
                ...match,
                status: updated.status ?? match.status,
                last_read_by_owner: updated.last_read_by_owner,
                last_read_by_traveler: updated.last_read_by_traveler,
                unreadCount: nextUnread,
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, matches]);

  if (matches.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-3 text-4xl">📦</div>
          <h2 className="text-lg font-semibold text-slate-900">
            Aún no tienes matches
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Cuando un viaje coincida con un envío, aparecerá aquí con su estado,
            último mensaje y acceso directo al chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {matches.map((match) => {
        const latestMessage = match.latestMessage;
        const unreadCount = match.unreadCount ?? 0;

        const tripOrigin = match.trip?.origin_city?.name ?? "Sin origen";
        const tripDestination =
          match.trip?.destination_city?.name ?? "Sin destino";

        const shipmentOrigin =
          match.shipment?.origin_city?.name ?? "Sin origen";
        const shipmentDestination =
          match.shipment?.destination_city?.name ?? "Sin destino";

        const isTraveler = match.trip?.traveler_id === currentUserId;
        const otherRole = isTraveler ? "Cliente" : "Viajero";
        const canOpenChat = match.status === "accepted";

        return (
          <div
            key={match.id}
            className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles(
                      match.status
                    )}`}
                  >
                    {statusLabel(match.status)}
                  </span>

                  <span className="text-xs text-slate-500">
                    Creado: {formatDate(match.created_at)}
                  </span>

                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {otherRole}
                  </span>
                </div>

                {unreadCount > 0 ? (
                  <span className="inline-flex w-fit items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    🔴 {unreadCount} mensaje{unreadCount > 1 ? "s" : ""} nuevo
                    {unreadCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Sin novedades
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-base">✈️</span>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Viaje
                    </h2>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-900">Ruta:</span>{" "}
                      {tripOrigin} → {tripDestination}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Salida:</span>{" "}
                      {formatDate(match.trip?.departure_date)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">
                        Capacidad:
                      </span>{" "}
                      {match.trip?.capacity_kg ?? 0} kg
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-base">📦</span>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Envío
                    </h2>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-900">Ruta:</span>{" "}
                      {shipmentOrigin} → {shipmentDestination}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Tipo:</span>{" "}
                      {match.shipment?.kind ?? "No especificado"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Peso:</span>{" "}
                      {match.shipment?.weight_kg ?? 0} kg
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Valor:</span>{" "}
                      {formatCurrency(match.shipment?.declared_value_cop)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href={`/app/matches/${match.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Ver detalle
                  </Link>

                  {canOpenChat ? (
                    <Link
                      href={`/app/matches/${match.id}/chat`}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Abrir chat
                    </Link>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                      Chat al aceptar
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Último mensaje
                  </p>

                  {latestMessage ? (
                    <span className="text-xs text-slate-400">
                      {formatDateTime(latestMessage.created_at)}
                    </span>
                  ) : null}
                </div>

                {latestMessage ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="line-clamp-2 text-sm text-slate-800">
                      {latestMessage.message}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-500">
                      Aún no hay mensajes en este chat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}