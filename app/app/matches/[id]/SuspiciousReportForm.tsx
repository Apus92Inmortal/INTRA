"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera, ShieldAlert } from "lucide-react";
import { compressImageFile } from "@/lib/uploads";

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

const EVIDENCE_BUCKET = "shipment-evidence";
const SUSPICIOUS_EVIDENCE_TYPE = "suspicious_photo";

function getFileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "bin" : "bin";
}

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
  const [file, setFile] = useState<File | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const inputId = useMemo(() => `suspicious-photo-${matchId}`, [matchId]);

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

    if (!file) {
      setLoading(false);
      setMessage("Sube una foto de soporte para que el equipo pueda revisar la alerta.");
      setMessageType("error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLoading(false);
      setMessage("La evidencia debe ser una imagen.");
      setMessageType("error");
      return;
    }

    let path: string | null = null;
    let evidenceId: string | null = null;

    try {
      const compressedFile = await compressImageFile(file);
      path = `${user.id}/${shipmentId}/${Date.now()}-${SUSPICIOUS_EVIDENCE_TYPE}.${getFileExtension(compressedFile)}`;

      const upload = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, compressedFile, {
        upsert: false,
        contentType: compressedFile.type || undefined,
      });

      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const { data: evidence, error: evidenceError } = await supabase
        .from("shipment_evidence")
        .insert({
          shipment_id: shipmentId,
          match_id: matchId,
          uploaded_by: user.id,
          evidence_type: SUSPICIOUS_EVIDENCE_TYPE,
          file_path: path,
          file_name: compressedFile.name,
          mime_type: compressedFile.type || null,
          note: reason.trim(),
        })
        .select("id")
        .single();

      if (evidenceError) {
        await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
        throw new Error(evidenceError.message);
      }

      evidenceId = evidence?.id ?? null;

      const { error } = await supabase.from("shipment_report_events").insert({
        shipment_id: shipmentId,
        match_id: matchId,
        reported_by: user.id,
        report_type: reportType,
        reason: reason.trim(),
        status: "open",
        metadata: {
          support_evidence_id: evidenceId,
          support_evidence_type: SUSPICIOUS_EVIDENCE_TYPE,
          support_evidence_path: path,
        },
      });

      if (error) {
        if (evidenceId) {
          await supabase.from("shipment_evidence").delete().eq("id", evidenceId);
        }

        await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
        throw new Error(error.message);
      }
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : "No pudimos enviar la alerta.");
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
    setFile(null);
    setReportType("suspicious_package");
    setExpanded(false);
    setMessage("Reporte enviado con evidencia. El paquete quedó marcado para revisión manual.");
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

          <label className="block text-sm font-medium text-intra-warning-text-strong">
            Foto de soporte
            <span className="mt-1 block text-xs font-normal leading-5 text-intra-text-muted">
              Adjunta una imagen clara del paquete o del detalle que activa la alerta.
            </span>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="mt-2 block w-full rounded-xl border border-intra-warning-border bg-intra-card px-3 py-3 text-sm text-intra-blue"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
          {loading ? "Enviando alerta..." : (
            <>
              <Camera className="h-4 w-4" strokeWidth={2.1} />
              Enviar alerta con evidencia
            </>
          )}
        </button>
      ) : null}
    </form>
  );
}
