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
    <div className={`rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-card p-4 ${disabled ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="intra-body-strong">{title}</p>
          <p className="intra-caption mt-1">{helper}</p>
        </div>

        {isReady ? (
          <span className="intra-pill intra-badge-text border border-intra-success-border bg-intra-success-soft text-intra-text-success">
            Cargado
          </span>
        ) : null}
      </div>

      <label
        className={`mt-4 block rounded-[var(--intra-radius-xs)] border border-dashed border-intra-border-soft bg-intra-bg-app px-4 py-5 text-center transition ${
          disabled ? "cursor-not-allowed" : "cursor-pointer hover:border-intra-green"
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-neutral-pill text-intra-text-muted">
          {icon === "document" ? (
            <FileText className="intra-icon-xl" strokeWidth={1.8} />
          ) : (
            <UserRound className="intra-icon-xl" strokeWidth={1.8} />
          )}
        </div>
        <p className="intra-caption-strong mt-3 text-intra-blue">
          {selectedFile || hasUploaded ? "Foto seleccionada" : "Subir foto"}
        </p>
        <p className="intra-caption mt-1 break-all">
          {selectedFile
            ? selectedFile.name
            : hasUploaded
              ? "Archivo cargado."
              : "JPG o PNG"}
        </p>
      </label>

      {selectedFile && !disabled ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            className="intra-link intra-caption-strong"
          >
            Quitar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getVerificationTone(status: string | null, hasDocumentPhoto: boolean, hasSelfie: boolean) {
  switch (status) {
    case "verified":
      return {
        badgeLabel: "Verificada",
        badgeClasses: "border-intra-success-border bg-intra-success-soft text-intra-text-success",
        badgeIcon: "check" as const,
        note: "Tu identidad ya fue validada.",
      };
    case "pending":
      return {
        badgeLabel: "En revisión",
        badgeClasses: "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text",
        badgeIcon: "clock" as const,
        note: "Estamos revisando tus archivos.",
      };
    case "rejected":
      return {
        badgeLabel: "Requiere corrección",
        badgeClasses: "border-intra-danger-border bg-intra-danger-soft text-intra-danger",
        badgeIcon: null,
        note: "Corrige los archivos y vuelve a enviarlos para continuar.",
      };
    default:
      return {
        badgeLabel: hasDocumentPhoto && hasSelfie ? "Lista para envío" : "Pendiente",
        badgeClasses: "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text",
        badgeIcon: "clock" as const,
        note: "Carga tu documento y una selfie.",
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

  const isVerified = initialStatus === "verified";
  const isLocked = initialStatus === "pending" || isVerified;
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
    <section className="intra-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--intra-radius-xs)] ${
              isVerified ? "bg-intra-success-soft text-intra-text-success" : "bg-intra-warning-soft text-intra-warning-text"
            }`}
          >
            <ShieldCheck className="intra-icon-lg" strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <h2 className="intra-h3">Verificación de identidad</h2>
            <p className="intra-body mt-1 max-w-[40ch]">
              Carga tu documento y selfie.
            </p>
            {isVerified && reviewedAt ? (
              <p className="intra-caption mt-1">
                Última revisión: <span className="intra-caption-strong">{formatDate(reviewedAt)}</span>
              </p>
            ) : null}
          </div>
        </div>

        <span
          className={`intra-pill intra-badge-text w-fit self-start border sm:justify-self-end ${tone.badgeClasses}`}
        >
          {tone.badgeIcon === "clock" ? <Clock3 className="intra-icon-xs" strokeWidth={2} /> : null}
          {tone.badgeIcon === "check" ? <BadgeCheck className="intra-icon-xs" strokeWidth={2} /> : null}
          {tone.badgeLabel}
        </span>
      </div>

      {initialStatus !== "rejected" && !isVerified ? (
        <div className="mt-5 rounded-[var(--intra-radius-xs)] border border-intra-warning-border bg-intra-warning-soft px-4 py-3 intra-body text-intra-warning-text">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="intra-icon-sm mt-0.5 shrink-0" strokeWidth={1.9} />
            <div>
              <p>{initialStatus === "pending" ? tone.note : "Carga tu documento y una selfie."}</p>
              {reviewedAt ? (
                <p className="intra-caption mt-1">
                  Última revisión: <span className="intra-caption-strong">{formatDate(reviewedAt)}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {initialRejectionReason ? (
        <div className="mt-4 rounded-[var(--intra-radius-xs)] border border-intra-danger-border bg-intra-danger-soft px-4 py-3 intra-body text-intra-danger">
          Motivo de rechazo: {initialRejectionReason}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <UploadField
            title="Documento"
            helper="JPG o PNG"
            selectedFile={documentPhoto}
            hasUploaded={hasDocumentPhoto}
            disabled={isLocked}
            icon="document"
            onChange={setDocumentPhoto}
          />

          <UploadField
            title="Selfie"
            helper="JPG o PNG"
            selectedFile={selfie}
            hasUploaded={hasSelfie}
            disabled={isLocked}
            icon="selfie"
            onChange={setSelfie}
          />
        </div>

        <div className="rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-card px-4 py-4">
          <p className="intra-body-strong">Autorización</p>
          <label
            className={`intra-body mt-3 flex items-start gap-3 ${
              isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={acceptConsent || isLocked}
              disabled={isLocked}
              onChange={(event) => setAcceptConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-intra-border-soft accent-intra-green"
            />
            <span>
              Autorizo a INTRA a revisar estas evidencias para validar mi identidad.
            </span>
          </label>
        </div>

        {initialStatus === "pending" ? (
          <div className="rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-bg-app px-4 py-3 intra-body">
            <div className="flex items-start gap-2.5">
              <Lock className="intra-icon-sm mt-0.5 shrink-0" strokeWidth={1.9} />
              <p>
                Estamos revisando tus archivos.
              </p>
            </div>
          </div>
        ) : null}

        {message ? (
          <div
            className={`rounded-[var(--intra-radius-xs)] border px-4 py-3 intra-body ${
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
            className="intra-btn intra-btn-primary disabled:cursor-not-allowed"
          >
            {initialStatus === "verified" ? (
              <BadgeCheck className="intra-icon-sm" strokeWidth={1.9} />
            ) : (
              <Send className="intra-icon-sm" strokeWidth={1.9} />
            )}
            {loading
              ? "Enviando a revisión..."
              : isLocked
                ? initialStatus === "verified"
                  ? "Verificación completada"
                  : "En revisión"
                : "Enviar a revisión"}
          </button>

          <div className="rounded-[var(--intra-radius-xs)] border border-intra-success-border bg-intra-success-soft px-4 py-3 intra-caption text-intra-text-success">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="intra-icon-sm mt-0.5 shrink-0" strokeWidth={1.9} />
              <p>Tus archivos se protegen durante la revisión.</p>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
