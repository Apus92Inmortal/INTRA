"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/uploads";

type EvidenceUploaderProps = {
  shipmentId: string;
  matchId: string;
  allowedTypes: string[];
};

const EVIDENCE_BUCKET = "shipment-evidence";

function getTypeOptions(allowedTypes: string[]) {
  return allowedTypes.map((type) => ({
    value: type,
    label:
      type === "pickup"
        ? "Recogida"
        : type === "delivery"
          ? "Entrega"
          : "Estado del paquete",
  }));
}

function getFileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "bin" : "bin";
}

export default function EvidenceUploader({ shipmentId, matchId, allowedTypes }: EvidenceUploaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const options = useMemo(() => getTypeOptions(allowedTypes), [allowedTypes]);

  const [selectedType, setSelectedType] = useState(options[0]?.value ?? "pickup");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
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
      setMessage("Debes iniciar sesión para subir evidencia.");
      setMessageType("error");
      return;
    }

    if (!file) {
      setLoading(false);
      setMessage("Selecciona una imagen antes de continuar.");
      setMessageType("error");
      return;
    }

    try {
      const compressedFile = await compressImageFile(file);
      const path = `${user.id}/${shipmentId}/${Date.now()}-${selectedType}.${getFileExtension(compressedFile)}`;
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
        evidence_type: selectedType,
        file_path: path,
        file_name: compressedFile.name,
        mime_type: compressedFile.type || null,
        note: note.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessage("Evidencia cargada correctamente.");
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

  if (options.length === 0) {
    return null;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[#0B2C4A]">Subir evidencia</h3>
        <p className="mt-1 text-xs text-slate-500">
          Sube una foto para dejar trazabilidad de recogida, estado o entrega. Si pesa más de 2MB la comprimimos antes de subirla.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Tipo de evidencia
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Imagen
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Nota opcional
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700"
          placeholder="Ej. paquete recibido sin novedad, sellado, entregado a las 5:20 pm..."
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
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Subiendo evidencia..." : "Guardar evidencia"}
      </button>
    </form>
  );
}
