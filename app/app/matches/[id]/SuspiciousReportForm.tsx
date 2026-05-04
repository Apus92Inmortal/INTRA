"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SuspiciousReportFormProps = {
  shipmentId: string;
  matchId: string;
};

export default function SuspiciousReportForm({ shipmentId, matchId }: SuspiciousReportFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setMessageType(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setMessage("Debes iniciar sesión para reportar el paquete.");
      setMessageType("error");
      return;
    }

    if (reason.trim().length < 12) {
      setLoading(false);
      setMessage("Describe mejor el motivo del reporte para que el equipo lo revise.");
      setMessageType("error");
      return;
    }

    const { error } = await supabase.from("shipment_report_events").insert({
      shipment_id: shipmentId,
      match_id: matchId,
      reported_by: user.id,
      report_type: "suspicious_package",
      reason: reason.trim(),
      status: "open",
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setReason("");
    setMessage("Reporte enviado. El paquete quedará marcado para revisión manual.");
    setMessageType("success");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-900">Reportar paquete sospechoso</h3>
        <p className="mt-1 text-xs text-amber-800">
          Úsalo si ves inconsistencias, contenido extraño o una situación que amerite revisión manual.
        </p>
      </div>

      <label className="block text-sm font-medium text-amber-900">
        Motivo del reporte
        <textarea
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-700"
          placeholder="Ej. el paquete no coincide con la descripción, presenta sellos alterados, olor extraño..."
        />
      </label>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Enviando reporte..." : "Reportar ahora"}
      </button>
    </form>
  );
}
