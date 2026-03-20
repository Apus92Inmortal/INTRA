"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    setMsg("✅ Listo");
    router.refresh();
  };

  // Si ya no está pending, mostramos navegación útil
  if (!isPending) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm opacity-80">
          Estado: <b>{matchStatus}</b>
        </div>

        <Link
          href={`/app/matches/${matchId}`}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
        >
          Ver detalle
        </Link>

        <Link
          href={`/app/matches/${matchId}/chat`}
          className="rounded-md bg-black px-3 py-2 text-sm text-white hover:opacity-90"
        >
          Contactar
        </Link>

        {msg && <div className="text-sm opacity-80">{msg}</div>}
      </div>
    );
  }

  // PENDING
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={`/app/matches/${matchId}`}
        className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
      >
        Ver detalle
      </Link>

      {isClient ? (
        <>
          <button
            disabled={loading || done}
            onClick={() => call("accept_match")}
            className="rounded-md bg-black px-3 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Aceptar"}
          </button>

          <button
            disabled={loading || done}
            onClick={() => call("reject_match")}
            className="rounded-md border px-3 py-2 disabled:opacity-60"
          >
            Rechazar
          </button>

          <span className="text-sm opacity-80">
            (El viajero solicitó transportar tu envío)
          </span>
        </>
      ) : (
        <>
          <div className="text-sm opacity-80">
            Solicitud enviada. Esperando respuesta del cliente...
          </div>

          <button
            disabled={loading || done}
            onClick={() => call("cancel_match")}
            className="rounded-md border px-3 py-2 disabled:opacity-60"
          >
            Cancelar solicitud
          </button>
        </>
      )}

      {msg && <div className="text-sm opacity-80">{msg}</div>}
    </div>
  );
}