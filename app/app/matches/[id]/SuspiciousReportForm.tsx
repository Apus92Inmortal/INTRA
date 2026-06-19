"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera, ShieldAlert, X } from "lucide-react";
import { compressImageFile } from "@/lib/uploads";
import { notifyAdminSuspiciousReportAction } from "./actions";

type SuspiciousReportFormProps = {
  shipmentId: string;
  matchId: string;
  reporterName: string;
  recipientUserId: string;
  hasActiveAlert?: boolean;
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
  hasActiveAlert = false,
  embedded = false,
}: SuspiciousReportFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]["value"]>("suspicious_package");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const inputId = useMemo(() => `suspicious-photo-${matchId}`, [matchId]);

  const closeModal = () => {
    if (loading) {
      return;
    }

    setIsOpen(false);
    setMessage(null);
    setMessageType(null);
  };

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
    let evidenceCreatedAt: string | null = null;

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
        .select("id, created_at")
        .single();

      if (evidenceError) {
        await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
        throw new Error(evidenceError.message);
      }

      evidenceId = evidence?.id ?? null;
      evidenceCreatedAt = evidence?.created_at ?? null;

      const { data: reportData, error } = await supabase
        .from("shipment_report_events")
        .insert({
          shipment_id: shipmentId,
          match_id: matchId,
          reported_by: user.id,
          report_type: reportType,
          reason: reason.trim(),
          status: "open",
          metadata: {
            support_evidence_id: evidenceId,
            support_evidence_type: SUSPICIOUS_EVIDENCE_TYPE,
            support_evidence_created_at: evidenceCreatedAt,
          },
        })
        .select("id")
        .single();

      if (error) {
        if (evidenceId) {
          await supabase.from("shipment_evidence").delete().eq("id", evidenceId);
        }

        await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
        throw new Error(error.message);
      }

      // Notificar a los administradores tras éxito de inserts locales
      // Usamos await para asegurar la persistencia en entornos serverless/Vercel.
      // notifyAdminSuspiciousReportAction maneja sus propios errores internamente.
      if (matchId && reportData?.id) {
        try {
          await notifyAdminSuspiciousReportAction(matchId, reportData.id);
        } catch (notifyError) {
          console.error(
            "Error al invocar notificación admin de reporte:",
            notifyError
          );
        }
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
    setIsOpen(false);
    setMessage("Reporte enviado con evidencia. El paquete quedó marcado para revisión manual.");
    setMessageType("success");
    router.refresh();
  };

  return (
    <>
      <div className={embedded ? "space-y-3" : "space-y-4 rounded-2xl border border-intra-warning-border bg-intra-card/80 p-4"}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={hasActiveAlert}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-intra-warning px-5 py-3 intra-body-strong text-intra-card transition hover:bg-intra-warning-text-strong disabled:cursor-not-allowed disabled:opacity-60 ${
            embedded ? "w-full" : ""
          }`}
        >
          <ShieldAlert className="h-4 w-4" strokeWidth={2.1} />
          {hasActiveAlert ? "Alerta abierta" : "Reportar Novedad"}
        </button>

        {message ? (
          <div
            className={`rounded-2xl border px-4 py-3 intra-body ${
              messageType === "success"
                ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-intra-blue/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reportar Novedad"
        >
          <form
            onSubmit={onSubmit}
            className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl border border-intra-warning-border bg-intra-card shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b border-intra-warning-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="intra-h3 text-intra-warning-text-strong">
                  Reportar Novedad
                </h3>
                <p className="mt-1 intra-caption text-intra-text-muted">
                  Adjunta una foto clara y describe qué debe revisar el equipo operativo.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-intra-border bg-intra-card text-intra-blue transition hover:bg-intra-neutral-soft-alt disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="block intra-body-strong text-intra-warning-text-strong">
                Motivo obligatorio
                <select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value as (typeof REPORT_TYPES)[number]["value"])}
                  className="mt-2 w-full rounded-xl border border-intra-warning-border bg-intra-card px-3 py-3 intra-body text-intra-blue"
                >
                  {REPORT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block intra-body-strong text-intra-warning-text-strong">
                Foto obligatoria
                <span className="mt-1 block intra-caption text-intra-text-muted">
                  Adjunta una imagen clara del paquete o del detalle que activa la alerta.
                </span>
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full rounded-xl border border-intra-warning-border bg-intra-card px-3 py-3 intra-body text-intra-blue"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <label className="block intra-body-strong text-intra-warning-text-strong">
                Descripción obligatoria
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-intra-warning-border bg-intra-card px-3 py-3 intra-body text-intra-blue"
                  placeholder="Ej. el paquete no coincide con la descripción, presenta sellos alterados, olor extraño..."
                />
              </label>

              {message && messageType === "error" ? (
                <div className="rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 intra-body text-intra-danger">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-intra-warning px-5 py-3 intra-body-strong text-intra-card transition hover:bg-intra-warning-text-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Enviando reporte..." : (
                  <>
                    <Camera className="h-4 w-4" strokeWidth={2.1} />
                    Enviar reporte
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
