"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/uploads";

type EvidenceUploaderProps = {
  shipmentId: string;
  matchId: string;
  expectedUploaderId: string;
  evidenceType: "pickup_photo" | "delivery_photo";
  title: string;
  description: string;
  triggerLabel: string;
  submitLabel: string;
  completeAction: () => Promise<void>;
};

const EVIDENCE_BUCKET = "shipment-evidence";

function getFileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "bin" : "bin";
}

export default function EvidenceUploader({
  shipmentId,
  matchId,
  expectedUploaderId,
  evidenceType,
  title,
  description,
  triggerLabel,
  submitLabel,
  completeAction,
}: EvidenceUploaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const inputId = useMemo(() => `${evidenceType}-${matchId}`, [evidenceType, matchId]);

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
      setMessage("Debes iniciar sesión para subir evidencia.");
      setMessageType("error");
      return;
    }

    if (user.id !== expectedUploaderId) {
      setLoading(false);
      setMessage("Solo el viajero asignado puede subir esta evidencia.");
      setMessageType("error");
      return;
    }

    if (!file) {
      setLoading(false);
      setMessage("Selecciona una imagen antes de continuar.");
      setMessageType("error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLoading(false);
      setMessage("La evidencia debe ser una imagen.");
      setMessageType("error");
      return;
    }

    if (note.trim().length < 4) {
      setLoading(false);
      setMessage("Agrega una descripción corta de la evidencia.");
      setMessageType("error");
      return;
    }

    let path: string | null = null;

    try {
      const compressedFile = await compressImageFile(file);
      path = `${user.id}/${shipmentId}/${Date.now()}-${evidenceType}.${getFileExtension(compressedFile)}`;
      const upload = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, compressedFile, {
        upsert: false,
        contentType: compressedFile.type || undefined,
      });

      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const { error } = await supabase.from("shipment_evidence").insert({
        shipment_id: shipmentId,
        match_id: matchId,
        uploaded_by: user.id,
        evidence_type: evidenceType,
        file_path: path,
        file_name: compressedFile.name,
        mime_type: compressedFile.type || null,
        note: note.trim(),
      });

      if (error) {
        if (path) {
          await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
        }
        throw new Error(error.message);
      }

      await completeAction();

      setMessage("Evidencia de soporte cargada correctamente.");
      setMessageType("success");
      setFile(null);
      setNote("");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la evidencia.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="intra-btn intra-btn-primary min-h-11 w-full px-5 py-3"
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-intra-blue/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <form
            onSubmit={onSubmit}
            className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl border border-intra-border bg-intra-card shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b border-intra-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="intra-h3 text-intra-blue">{title}</h3>
                <p className="mt-1 intra-caption text-intra-text-muted">{description}</p>
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
              <label className="block intra-body-strong text-intra-text-muted">
                Foto obligatoria
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full rounded-xl border border-intra-border bg-intra-card px-3 py-3 intra-body text-intra-blue"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <label className="block intra-body-strong text-intra-text-muted">
                Descripción
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-intra-border bg-intra-card px-3 py-3 intra-body text-intra-blue"
                  placeholder="Ej. paquete recibido sin novedad, sellado, entregado a las 5:20 pm..."
                />
              </label>

              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 intra-caption ${
                    messageType === "success"
                      ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                      : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="intra-btn intra-btn-primary min-h-11 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Guardando evidencia..." : submitLabel}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
