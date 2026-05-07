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
  disabled?: boolean;
  onChange: (file: File | null) => void;
};

function UploadField({
  label,
  selectedFile,
  hasUploaded,
  disabled = false,
  onChange,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${disabled ? "opacity-75" : ""}`}>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">
          {selectedFile
            ? selectedFile.name
            : hasUploaded
              ? "Ya hay un archivo cargado."
              : "Sube una imagen clara en JPG o PNG."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : "cursor-pointer border-[#0B2C4A]/12 bg-white text-[#0B2C4A] hover:bg-[#EEF2F7]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
          {selectedFile ? "Cambiar archivo" : "Seleccionar archivo"}
        </label>

        {selectedFile && !disabled ? (
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
  const [acceptConsent, setAcceptConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const isLocked = initialStatus === "pending" || initialStatus === "verified";
  const canSubmit = !loading && !isLocked && Boolean(documentPhoto) && Boolean(selfie) && acceptConsent;

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

    if (isLocked) {
      setLoading(false);
      setMessage("Tu verificación ya fue enviada y los archivos están bloqueados mientras el equipo la revisa.");
      setMessageType("error");
      return;
    }

    if (!documentPhoto || !selfie) {
      setLoading(false);
      setMessage("Debes adjuntar documento y selfie para enviar la verificación.");
      setMessageType("error");
      return;
    }

    if (!acceptConsent) {
      setLoading(false);
      setMessage("Debes aceptar la autorización para enviar la verificación.");
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
      setAcceptConsent(false);
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

        <span className={`inline-flex min-w-[170px] justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-xs font-semibold ${badge.classes}`}>
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
              className={`inline-flex min-w-[92px] justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
                hasDocumentPhoto
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-amber-200 bg-amber-100 text-amber-700"
              }`}
            >
              {hasDocumentPhoto ? "Cargado" : "Pendiente"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">Selfie</p>
            <span
              className={`inline-flex min-w-[92px] justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
                hasSelfie
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-amber-200 bg-amber-100 text-amber-700"
              }`}
            >
              {hasSelfie ? "Cargado" : "Pendiente"}
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
            disabled={isLocked}
            onChange={setDocumentPhoto}
          />

          <UploadField
            label="Selfie"
            selectedFile={selfie}
            hasUploaded={hasSelfie}
            disabled={isLocked}
            onChange={setSelfie}
          />
        </div>

        <details className="rounded-2xl border border-[#D9E7F2] bg-[#F7FAFC]" open={!isLocked}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#0B2C4A] [&::-webkit-details-marker]:hidden">
            Autorización para revisión manual
          </summary>
          <div className="border-t border-[#D9E7F2] px-4 py-3">
            <label className={`flex items-start gap-3 text-sm leading-6 text-slate-600 ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={acceptConsent || isLocked}
                disabled={isLocked}
                onChange={(event) => setAcceptConsent(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0B2C4A] focus:ring-[#0B2C4A]/20"
              />
              <span>
                Acepto que el equipo revise manualmente estas evidencias para validar mi identidad dentro de INTRA. Si la imagen pesa demasiado, la comprimimos antes de subirla.
              </span>
            </label>
          </div>
        </details>

        {isLocked ? (
          <div className="rounded-2xl border border-[#D9E7F2] bg-[#F7FAFC] px-4 py-3 text-sm text-slate-600">
            {initialStatus === "verified"
              ? "Tu identidad ya fue verificada. Los archivos quedaron bloqueados y no necesitas volver a enviarlos."
              : "Tu verificación está en revisión. Mientras el equipo responde, los archivos y el envío quedan bloqueados para evitar duplicados."}
          </div>
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

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Enviando verificación..."
            : isLocked
              ? "Verificación bloqueada"
              : "Enviar verificación"}
        </button>
      </form>
    </section>
  );
}
