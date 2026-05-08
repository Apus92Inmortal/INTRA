"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SuspiciousReportFormProps = {
  shipmentId: string;
  matchId: string;
  reporterName: string;
  recipientUserId: string;
};

const REPORT_TYPES = [
  { value: "suspicious_package", label: "Paquete sospechoso" },
  { value: "incident", label: "Incidente en la recogida" },
  { value: "other", label: "Otro" },
] as const;

export default function SuspiciousReportForm({
  shipmentId,
  matchId,
  reporterName,
  recipientUserId,
}: SuspiciousReportFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]["value"]>("suspicious_package");
  const [reason, setReason] = useState("");
  const [expanded, setExpanded] = useState(false);
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
      report_type: reportType,
      reason: reason.trim(),
      status: "open",
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: recipientUserId,
      type: "shipment_alert",
      title: "Tu envío fue reportado para revisión",
      message: `${reporterName} reportó el paquete para revisión manual.`,
      related_match_id: matchId,
      is_read: false,
    });

    if (notificationError) {
      console.error("Error creating shipment alert notification:", notificationError.message);
    }

    setLoading(false);
    setReason("");
    setReportType("suspicious_package");
    setExpanded(false);
    setMessage("Reporte enviado. El paquete quedó marcado para revisión manual.");
    setMessageType("success");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-amber-200 bg-white/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Botón de alerta</h3>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Úsalo solo si el paquete no coincide con lo acordado o aparece una situación delicada.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          {expanded ? "Cerrar alerta" : "Activar alerta"}
        </button>
      </div>

      {expanded ? (
        <>
          <label className="block text-sm font-medium text-amber-900">
            Tipo de alerta
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value as (typeof REPORT_TYPES)[number]["value"])}
              className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-700"
            >
              {REPORT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-amber-900">
            Qué pasó
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-700"
              placeholder="Ej. el paquete no coincide con la descripción, presenta sellos alterados, olor extraño..."
            />
          </label>
        </>
      ) : null}

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

      {expanded ? (
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Enviando alerta..." : "Enviar alerta"}
        </button>
      ) : null}
    </form>
  );
}
