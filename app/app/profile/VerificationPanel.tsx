"use client";

import {
  AlertCircle,
  BadgeCheck,
  Clock3,
  FileText,
  Lock,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  title: string;
  helper: string;
  selectedFile: File | null;
  hasUploaded: boolean;
  disabled?: boolean;
  icon: "document" | "selfie";
  onChange: (file: File | null) => void;
};

function UploadField({
  title,
  helper,
  selectedFile,
  hasUploaded,
  disabled = false,
  icon,
  onChange,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isReady = Boolean(selectedFile) || hasUploaded;

  return (
    <div className={`rounded-[20px] border border-[#E4E7EC] bg-white p-4 ${disabled ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#667085]">
            {icon === "document" ? (
              <FileText className="h-4 w-4" strokeWidth={1.9} />
            ) : (
              <UserRound className="h-4 w-4" strokeWidth={1.9} />
            )}
          </div>
          <div>
            <p className="text-[14px] font-bold leading-5 text-[#0B2C4A]">{title}</p>
            <p className="mt-1 text-[12px] leading-[18px] text-[#667085]">{helper}</p>
          </div>
        </div>

        {isReady ? (
          <span className="inline-flex rounded-full bg-[#EFFBF4] px-2.5 py-1 text-[12px] font-bold leading-4 text-[#1E8C4E]">
            Cargado
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-[16px] border border-dashed border-[#E4E7EC] bg-[#FCFCFD] px-4 py-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#667085]">
          {icon === "document" ? (
            <FileText className="h-7 w-7" strokeWidth={1.8} />
          ) : (
            <UserRound className="h-7 w-7" strokeWidth={1.8} />
          )}
        </div>
        <p className="mt-3 text-[12px] leading-[18px] text-[#667085]">
          {selectedFile
            ? selectedFile.name
            : hasUploaded
              ? "Ya hay un archivo cargado."
              : "Sube una imagen clara para iniciar la revisión."}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-[14px] font-semibold transition ${
            disabled
              ? "cursor-not-allowed border-[#E4E7EC] bg-[#F9FAFB] text-[#98A2B3]"
              : "cursor-pointer border-[#E4E7EC] bg-white text-[#0B2C4A] hover:bg-[#F9FAFB]"
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
          Seleccionar archivo
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
            className="text-[12px] font-semibold text-[#667085] transition hover:text-[#0B2C4A]"
          >
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getVerificationTone(status: string | null, hasDocumentPhoto: boolean, hasSelfie: boolean) {
  switch (status) {
    case "verified":
      return {
        badgeLabel: "Verificada",
        badgeClasses: "bg-[#EFFBF4] text-[#1E8C4E]",
        badgeIcon: "check" as const,
        note: "Tu identidad ya fue validada manualmente por el equipo.",
      };
    case "pending":
      return {
        badgeLabel: "En revisión",
        badgeClasses: "bg-[#FFF7E8] text-[#D4A017]",
        badgeIcon: "clock" as const,
        note: "Ya recibimos tus archivos. El equipo los revisará manualmente.",
      };
    case "rejected":
      return {
        badgeLabel: "Requiere corrección",
        badgeClasses: "bg-[#FEF3F2] text-[#D92D20]",
        badgeIcon: null,
        note: "Corrige los archivos y vuelve a enviarlos para continuar.",
      };
    default:
      return {
        badgeLabel: hasDocumentPhoto && hasSelfie ? "Lista para envío" : "Pendiente de envío",
        badgeClasses: "bg-[#FFF7E8] text-[#D4A017]",
        badgeIcon: "clock" as const,
        note: "Aún falta cargar tu documento y selfie para iniciar la revisión.",
      };
  }
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

  const [documentPhoto, setDocumentPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [acceptConsent, setAcceptConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const isLocked = initialStatus === "pending" || initialStatus === "verified";
  const canSubmit = !loading && !isLocked && Boolean(documentPhoto) && Boolean(selfie) && acceptConsent;

  const tone = useMemo(
    () => getVerificationTone(initialStatus, hasDocumentPhoto, hasSelfie),
    [initialStatus, hasDocumentPhoto, hasSelfie]
  );

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
      setMessage(
        "Tu verificación ya fue enviada y los archivos están bloqueados mientras el equipo la revisa."
      );
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
    <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7E8] text-[#D4A017]">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="text-[18px] font-bold leading-6 text-[#0B2C4A]">Verificación de identidad</h2>
            <p className="mt-1 max-w-[42ch] text-[14px] leading-[22px] text-[#667085]">
              Sube tu documento y una selfie clara. Revisaremos la información manualmente para proteger la comunidad.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-bold leading-4 ${tone.badgeClasses}`}
        >
          {tone.badgeIcon === "clock" ? <Clock3 className="h-3.5 w-3.5" strokeWidth={2} /> : null}
          {tone.badgeIcon === "check" ? <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} /> : null}
          {tone.badgeLabel}
        </span>
      </div>

      <div className="mt-5 rounded-[18px] border border-[#FDE7B2] bg-[#FFF9EC] px-4 py-3 text-[14px] leading-[22px] text-[#8A6C12]">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
          <div>
            <p>{initialStatus === "pending" || initialStatus === "verified" ? tone.note : "Necesitamos tu documento y una selfie para continuar."}</p>
            {reviewedAt ? (
              <p className="mt-1 text-[12px] leading-[18px] text-[#667085]">
                Última revisión: <span className="font-semibold text-[#0B2C4A]">{formatDate(reviewedAt)}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {initialRejectionReason ? (
        <div className="mt-4 rounded-[18px] border border-intra-danger-border bg-intra-danger-soft px-4 py-3 text-[14px] leading-[22px] text-intra-danger">
          Motivo de rechazo: {initialRejectionReason}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <UploadField
            title="Documento requerido"
            helper="JPG o PNG"
            selectedFile={documentPhoto}
            hasUploaded={hasDocumentPhoto}
            disabled={isLocked}
            icon="document"
            onChange={setDocumentPhoto}
          />

          <UploadField
            title="Selfie requerida"
            helper="JPG o PNG"
            selectedFile={selfie}
            hasUploaded={hasSelfie}
            disabled={isLocked}
            icon="selfie"
            onChange={setSelfie}
          />
        </div>

        <div className="rounded-[20px] border border-[#E4E7EC] bg-white px-4 py-4">
          <p className="text-[14px] font-bold leading-5 text-[#0B2C4A]">Autorización</p>
          <label
            className={`mt-3 flex items-start gap-3 text-[14px] leading-[22px] text-[#667085] ${
              isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={acceptConsent || isLocked}
              disabled={isLocked}
              onChange={(event) => setAcceptConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#D0D5DD] text-[#2ECC71] focus:ring-[#2ECC71]/20"
            />
            <span>
              Acepto que INTRA revise manualmente estas evidencias para validar mi identidad.
            </span>
          </label>
        </div>

        {isLocked ? (
          <div className="rounded-[18px] border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-[14px] leading-[22px] text-[#667085]">
            <div className="flex items-start gap-2.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
              <p>
                {initialStatus === "verified"
                  ? "Tu identidad ya fue verificada. No necesitas volver a cargar archivos."
                  : "Tu verificación está en revisión. Mientras el equipo responde, el envío queda bloqueado para evitar duplicados."}
              </p>
            </div>
          </div>
        ) : null}

        {message ? (
          <div
            className={`rounded-[18px] border px-4 py-3 text-[14px] leading-[22px] ${
              messageType === "success"
                ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
            }`}
          >
            {message}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-center">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#2ECC71] px-5 py-3 text-[14px] font-bold leading-5 text-white transition hover:bg-[#27AE60] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {initialStatus === "verified" ? (
              <BadgeCheck className="h-4 w-4" strokeWidth={1.9} />
            ) : (
              <Send className="h-4 w-4" strokeWidth={1.9} />
            )}
            {loading
              ? "Enviando a revisión..."
              : isLocked
                ? initialStatus === "verified"
                  ? "Verificación completada"
                  : "En revisión"
                : "Enviar a revisión"}
          </button>

          <div className="rounded-[18px] border border-[#CFEAD7] bg-[#EFFBF4] px-4 py-3 text-[12px] leading-[18px] text-[#1E8C4E]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
              <p>Tu información se revisa de forma segura y manual.</p>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
