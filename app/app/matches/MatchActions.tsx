"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStatusLabel } from "@/lib/labels";

type ActionResult = Promise<{ success: boolean; error?: string }>;

export default function MatchActions({
  matchId,
  matchStatus,
  currentUserId,
  shipmentOwnerId,
  onCancel,
  showDetail = true,
  showStatusMessage = true,
}: {
  matchId: string;
  matchStatus: string;
  currentUserId: string;
  shipmentOwnerId: string | null;
  onCancel: (matchId: string) => ActionResult;
  showDetail?: boolean;
  showStatusMessage?: boolean;
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

    if (fn === "cancel_match") {
      const result = await onCancel(matchId);

      setLoading(false);

      if (!result.success) {
        setMsg("❌ " + (result.error ?? "No se pudo cancelar"));
        return;
      }
    } else {
      const { error } = await supabase.rpc(fn, { p_match_id: matchId });

      setLoading(false);

      if (error) {
        setMsg("❌ " + error.message);
        return;
      }
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
        {showDetail ? (
          <Link
            href={`/app/matches/${matchId}`}
            className="intra-btn intra-btn-secondary w-full"
          >
            Ver detalle
          </Link>
        ) : null}

        <Link
          href={`/app/matches/${matchId}/chat`}
          className="intra-btn w-full bg-intra-blue text-intra-card hover:opacity-95"
        >
          Abrir chat
        </Link>

        {msg ? (
          <div className="rounded-2xl border border-intra-border bg-intra-card px-4 py-3 intra-body">
            {msg}
          </div>
        ) : null}
      </div>
    );
  }

  if (!isPending) {
    return (
      <div className="flex flex-col gap-3">
        {showDetail ? (
          <Link
            href={`/app/matches/${matchId}`}
            className="intra-btn intra-btn-secondary w-full"
          >
            Ver detalle
          </Link>
        ) : null}

        {showStatusMessage ? (
          <div className="rounded-2xl border border-intra-border bg-intra-card px-4 py-3 intra-body">
            Estado: <span className="intra-body-strong">{getStatusLabel(matchStatus)}</span>
          </div>
        ) : null}

        {msg ? (
          <div className="rounded-2xl border border-intra-border bg-intra-card px-4 py-3 intra-body">
            {msg}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showDetail ? (
        <Link
          href={`/app/matches/${matchId}`}
          className="intra-btn intra-btn-secondary w-full"
        >
          Ver detalle
        </Link>
      ) : null}

      {isClient ? (
        <>
          {showStatusMessage ? (
            <div className="rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 intra-body text-intra-warning-text">
              El viajero solicitó transportar tu envío.
            </div>
          ) : null}

          <button
            disabled={loading || done}
            onClick={() => call("accept_match")}
            className="intra-btn w-full bg-intra-blue text-intra-card disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Aceptar solicitud"}
          </button>

          <button
            disabled={loading || done}
            onClick={() => call("reject_match")}
            className="intra-btn intra-btn-secondary w-full text-intra-text-muted disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Rechazar solicitud"}
          </button>
        </>
      ) : (
        <>
          {showStatusMessage ? (
            <div className="rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 intra-body text-intra-warning-text">
              Solicitud enviada. Esperando respuesta del cliente.
            </div>
          ) : null}

          <button
            disabled={loading || done}
            onClick={() => call("cancel_match")}
            className="intra-btn intra-btn-secondary w-full text-intra-text-muted disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Cancelar solicitud"}
          </button>
        </>
      )}

      {msg ? (
        <div className="rounded-2xl border border-intra-border bg-intra-card px-4 py-3 intra-body">
          {msg}
        </div>
      ) : null}
    </div>
  );
}
