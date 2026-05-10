"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert } from "lucide-react";

type SuspiciousReportFormProps = {
  shipmentId: string;
  matchId: string;
  reporterName: string;
  recipientUserId: string;
  embedded?: boolean;
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
  embedded = false,
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
    <form
      onSubmit={onSubmit}
      className={embedded ? "space-y-3" : "space-y-4 rounded-2xl border border-intra-warning-border bg-intra-card/80 p-4"}
    >
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-intra-warning px-4 py-2.5 text-sm font-semibold text-intra-card transition hover:bg-intra-warning-text-strong ${
            embedded ? "w-full" : ""
          }`}
        >
          <ShieldAlert className="h-4 w-4" strokeWidth={2.1} />
          {expanded ? "Cerrar alerta" : "Activar alerta"}
        </button>
      </div>

      {expanded ? (
        <>
          <label className="block text-sm font-medium text-intra-warning-text-strong">
            Tipo de alerta
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value as (typeof REPORT_TYPES)[number]["value"])}
              className="mt-2 w-full rounded-xl border border-intra-warning-border bg-intra-card px-3 py-3 text-sm text-intra-blue"
            >
              {REPORT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-intra-warning-text-strong">
            Qué pasó
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-intra-warning-border bg-intra-card px-3 py-3 text-sm text-intra-blue"
              placeholder="Ej. el paquete no coincide con la descripción, presenta sellos alterados, olor extraño..."
            />
          </label>
        </>
      ) : null}

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
              : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
          }`}
        >
          {message}
        </div>
      ) : null}

      {expanded ? (
        <button
          type="submit"
          disabled={loading}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-intra-warning px-5 py-3 text-sm font-semibold text-intra-card transition hover:bg-intra-warning-text-strong disabled:cursor-not-allowed disabled:opacity-60 ${
            embedded ? "w-full" : ""
          }`}
        >
          <ShieldAlert className="h-4 w-4" strokeWidth={2.1} />
          {loading ? "Enviando alerta..." : "Enviar alerta"}
        </button>
      ) : null}
    </form>
  );
}
