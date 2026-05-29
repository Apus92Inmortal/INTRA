"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/uploads";

type EvidenceUploaderProps = {
  shipmentId: string;
  matchId: string;
  expectedUploaderId: string;
  evidenceType: "pickup_photo" | "delivery_photo";
  title: string;
  description: string;
  submitLabel: string;
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
  submitLabel,
}: EvidenceUploaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const inputId = useMemo(() => `${evidenceType}-${matchId}`, [evidenceType, matchId]);

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
        note: note.trim() || null,
      });

      if (error) {
        if (path) {
          await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
        }
        throw new Error(error.message);
      }

      setMessage("Evidencia de soporte cargada correctamente.");
      setMessageType("success");
      setFile(null);
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la evidencia.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-intra-border bg-intra-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-intra-blue">{title}</h3>
        <p className="mt-1 text-xs text-intra-text-muted">
          {description}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block text-sm font-medium text-intra-text-muted">
          Imagen
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="mt-2 block w-full rounded-xl border border-intra-border bg-intra-card px-3 py-3 text-sm text-intra-blue"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-intra-text-muted">
        Nota opcional
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-intra-border bg-intra-card px-3 py-3 text-sm text-intra-blue"
          placeholder="Ej. paquete recibido sin novedad, sellado, entregado a las 5:20 pm..."
        />
      </label>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs ${
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
        className="intra-btn min-h-11 bg-intra-blue px-5 py-3 text-sm text-intra-card hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Subiendo evidencia..." : submitLabel}
      </button>
    </form>
  );
}
