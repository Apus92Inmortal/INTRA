"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getVerificationBadge } from "@/lib/trust";
import { compressImageFile } from "@/lib/uploads";

type VerificationPanelProps = {
  initialStatus: string | null;
  initialRejectionReason: string | null;
  hasDocumentPhoto: boolean;
  hasSelfie: boolean;
  reviewedAt: string | null;
};

const IDENTITY_BUCKET = "identity-verification";
const TERMS_VERSION = "1.0";

function formatDate(dateString: string | null) {
  if (!dateString) return null;

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getFileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "bin" : "bin";
}

type UploadFieldProps = {
  label: string;
  selectedFile: File | null;
  hasUploaded: boolean;
  uploadedLabel: string;
  onChange: (file: File | null) => void;
};

function UploadField({
  label,
  selectedFile,
  hasUploaded,
  uploadedLabel,
  onChange,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const status = selectedFile
    ? {
        label: "Lista para enviar",
        classes: "border-green-200 bg-green-100 text-green-700",
      }
    : hasUploaded
      ? {
          label: uploadedLabel,
          classes: "border-green-200 bg-green-100 text-green-700",
        }
      : {
          label: "Pendiente",
          classes: "border-amber-200 bg-amber-100 text-amber-700",
        };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-sm text-slate-500">
            {selectedFile
              ? selectedFile.name
              : hasUploaded
                ? "Ya hay un archivo cargado. Puedes reemplazarlo si quieres."
                : "Sube una imagen clara en JPG o PNG."}
          </p>
        </div>
        <span
          className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${status.classes}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-[#0B2C4A]/12 bg-white px-4 py-2 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#EEF2F7]">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
          {selectedFile ? "Cambiar archivo" : "Seleccionar archivo"}
        </label>

        {selectedFile ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function VerificationPanel({
  initialStatus,
  initialRejectionReason,
  hasDocumentPhoto,
  hasSelfie,
  reviewedAt,
}: VerificationPanelProps) {
  const supabase = createClient();
  const router = useRouter();

  const badge = useMemo(() => getVerificationBadge(initialStatus), [initialStatus]);

  const [documentPhoto, setDocumentPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
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
      setMessage("Debes iniciar sesión para enviar tu verificación.");
      setMessageType("error");
      return;
    }

    if (!documentPhoto || !selfie) {
      setLoading(false);
      setMessage("Debes adjuntar documento y selfie para enviar la verificación.");
      setMessageType("error");
      return;
    }

    const uploadFile = async (file: File, kind: "document" | "selfie") => {
      const path = `${user.id}/${kind}.${getFileExtension(file)}`;
      const upload = await supabase.storage.from(IDENTITY_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });

      if (upload.error) {
        throw new Error(upload.error.message);
      }

      return path;
    };

    try {
      const [compressedDocument, compressedSelfie] = await Promise.all([
        compressImageFile(documentPhoto),
        compressImageFile(selfie),
      ]);

      const [documentPath, selfiePath] = await Promise.all([
        uploadFile(compressedDocument, "document"),
        uploadFile(compressedSelfie, "selfie"),
      ]);

      const { error } = await supabase.from("user_verifications").upsert(
        {
          user_id: user.id,
          verification_status: "pending",
          document_photo_url: documentPath,
          selfie_url: selfiePath,
          terms_version: TERMS_VERSION,
          data_consent_accepted_at: new Date().toISOString(),
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
          metadata: {
            source: "profile_verification_panel",
            submitted_at: new Date().toISOString(),
          },
        },
        { onConflict: "user_id" }
      );

      if (error) {
        throw new Error(error.message);
      }

      setMessage("Documentos enviados. Tu verificación quedó en revisión manual.");
      setMessageType("success");
      setDocumentPhoto(null);
      setSelfie(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la verificación.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0B2C4A]">Verificación de identidad</h2>
          <p className="mt-1 text-sm text-gray-500">
            Esta revisión es manual. Nos ayuda a subir la confianza y a liberar mejores límites de uso.
          </p>
        </div>

        <span className={`inline-flex min-w-[118px] justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold ${badge.classes}`}>
          {badge.label}
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
        <p>{badge.description}</p>
        {reviewedAt ? <p className="mt-2">Última revisión: <span className="font-medium text-slate-800">{formatDate(reviewedAt)}</span></p> : null}
        {initialRejectionReason ? (
          <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            Motivo de rechazo: {initialRejectionReason}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">Documento</p>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                hasDocumentPhoto
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-amber-200 bg-amber-100 text-amber-700"
              }`}
            >
              {hasDocumentPhoto ? "Documento cargado" : "Pendiente"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">Selfie</p>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                hasSelfie
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-amber-200 bg-amber-100 text-amber-700"
              }`}
            >
              {hasSelfie ? "Selfie cargada" : "Pendiente"}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <UploadField
            label="Foto del documento"
            selectedFile={documentPhoto}
            hasUploaded={hasDocumentPhoto}
            uploadedLabel="Documento cargado"
            onChange={setDocumentPhoto}
          />

          <UploadField
            label="Selfie"
            selectedFile={selfie}
            hasUploaded={hasSelfie}
            uploadedLabel="Selfie cargada"
            onChange={setSelfie}
          />
        </div>

        <div className="rounded-2xl border border-[#D9E7F2] bg-[#F7FAFC] px-4 py-3 text-sm leading-6 text-slate-600">
          Al enviarlos aceptas que el equipo revise manualmente estas evidencias para validar tu identidad dentro de INTRA. Si la imagen pesa demasiado, la comprimimos antes de subirla.
        </div>

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
          {loading ? "Enviando verificación..." : "Enviar verificación"}
        </button>
      </form>
    </section>
  );
}
