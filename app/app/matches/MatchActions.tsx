"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStatusLabel } from "@/lib/labels";

export default function MatchActions({
  matchId,
  matchStatus,
  currentUserId,
  shipmentOwnerId,
}: {
  matchId: string;
  matchStatus: string;
  currentUserId: string;
  shipmentOwnerId: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isClient = shipmentOwnerId === currentUserId;
  const isPending = matchStatus === "pending";
  const isAccepted = matchStatus === "accepted";

  const call = async (fn: "accept_match" | "reject_match" | "cancel_match") => {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.rpc(fn, { p_match_id: matchId });

    setLoading(false);

    if (error) {
      setMsg("❌ " + error.message);
      return;
    }

    setDone(true);

    if (fn === "accept_match") {
      setMsg("✅ Match aceptado");
    } else if (fn === "reject_match") {
      setMsg("✅ Solicitud rechazada");
    } else {
      setMsg("✅ Solicitud cancelada");
    }

    router.refresh();
  };

  if (isAccepted) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href={`/app/matches/${matchId}`}
          className="flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
        >
          Ver detalle
        </Link>

        <Link
          href={`/app/matches/${matchId}/chat`}
          className="flex h-12 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 text-sm font-semibold text-white transition hover:opacity-95"
        >
          Abrir chat
        </Link>

        {msg ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            {msg}
          </div>
        ) : null}
      </div>
    );
  }

  if (!isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href={`/app/matches/${matchId}`}
          className="flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
        >
          Ver detalle
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          Estado: <span className="font-semibold">{getStatusLabel(matchStatus)}</span>
        </div>

        {msg ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            {msg}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={`/app/matches/${matchId}`}
        className="flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
      >
        Ver detalle
      </Link>

      {isClient ? (
        <>
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            El viajero solicitó transportar tu envío.
          </div>

          <button
            disabled={loading || done}
            onClick={() => call("accept_match")}
            className="flex h-12 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Aceptar solicitud"}
          </button>

          <button
            disabled={loading || done}
            onClick={() => call("reject_match")}
            className="flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Rechazar solicitud"}
          </button>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Solicitud enviada. Esperando respuesta del cliente.
          </div>

          <button
            disabled={loading || done}
            onClick={() => call("cancel_match")}
            className="flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Cancelar solicitud"}
          </button>
        </>
      )}

      {msg ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          {msg}
        </div>
      ) : null}
    </div>
  );
}