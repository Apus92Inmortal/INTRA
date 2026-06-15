"use client";

import {
  BadgeCheck,
  CheckCircle,
  Clock3,
  FileText,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  selectedFile: File | null;
  hasUploaded: boolean;
  disabled?: boolean;
  icon: "document" | "selfie";
  onChange: (file: File | null) => void;
};

function UploadField({
  title,
  selectedFile,
  hasUploaded,
  disabled = false,
  icon,
  onChange,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    onChange(event.currentTarget.files?.[0] ?? null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="sr-only"
      disabled={disabled}
      onChange={handleFileChange}
    />
  );

  if (previewUrl) {
    return (
      <div className={`relative ${disabled ? "opacity-80" : ""}`}>
        {fileInput}
        <div
          role="img"
          aria-label={`${title} seleccionada`}
          className="h-40 w-full rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-bg-app bg-cover bg-center"
          style={{ backgroundImage: `url(${previewUrl})` }}
        />

        {!disabled ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-intra-border-soft bg-intra-card text-intra-text-muted shadow-sm transition hover:text-intra-danger"
            aria-label="Quitar foto seleccionada"
          >
            <span aria-hidden="true">X</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <label
      className={`block rounded-[var(--intra-radius-xs)] border border-dashed border-intra-border-soft bg-intra-bg-app px-4 py-5 text-center transition ${
        disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:border-intra-green"
      }`}
    >
      {fileInput}
      {hasUploaded ? (
        <span className="intra-pill intra-badge-text mx-auto w-fit border border-intra-success-border bg-intra-success-soft text-intra-text-success">
          Cargado
        </span>
      ) : (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-neutral-pill text-intra-text-muted">
          {icon === "document" ? (
            <FileText className="intra-icon-xl" strokeWidth={1.8} />
          ) : (
            <UserRound className="intra-icon-xl" strokeWidth={1.8} />
          )}
        </div>
      )}
      <p className="intra-caption-strong mt-3 text-intra-blue">
        {hasUploaded ? "Archivo cargado" : "Subir foto"}
      </p>
      <p className="intra-caption mt-1">
        {hasUploaded ? "Foto lista." : "JPG o PNG"}
      </p>
    </label>
  );
}

function getVerificationTone(status: string | null, hasDocumentPhoto: boolean, hasSelfie: boolean) {
  switch (status) {
    case "verified":
      return {
        badgeLabel: "Cuenta verificada",
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const isVerified = initialStatus === "verified";
  const isPending = initialStatus === "pending";
  const isRejected = initialStatus === "rejected";
  const isLocked = initialStatus === "pending" || isVerified;
  const canSubmit = !loading && !isLocked && Boolean(documentPhoto) && Boolean(selfie) && acceptConsent;

  const tone = useMemo(
    () => getVerificationTone(initialStatus, hasDocumentPhoto, hasSelfie),
    [initialStatus, hasDocumentPhoto, hasSelfie]
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentStep !== 4) {
      event.stopPropagation();
      setMessage(null);
      setMessageType(null);
      return;
    }

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
      setCurrentStep(1);
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la verificación.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const openVerificationModal = () => {
    setMessage(null);
    setMessageType(null);
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const closeVerificationModal = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (loading) return;
    setIsModalOpen(false);
  };

  const goToNextStep = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setMessage(null);
    setMessageType(null);
    setCurrentStep((step) => {
      if (step === 1) return 2;
      if (step === 2) return 3;
      if (step === 3) return 4;
      return 4;
    });
  };

  const goToPreviousStep = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setMessage(null);
    setMessageType(null);
    setCurrentStep((step) => {
      if (step === 4) return 3;
      if (step === 3) return 2;
      if (step === 2) return 1;
      return 1;
    });
  };

  const handleDocumentPhotoChange = (file: File | null) => {
    setMessage(null);
    setMessageType(null);
    setDocumentPhoto(file);
  };

  const handleSelfieChange = (file: File | null) => {
    setMessage(null);
    setMessageType(null);
    setSelfie(file);
  };

  const canContinue =
    currentStep === 1
      ? acceptConsent
      : currentStep === 2
        ? Boolean(documentPhoto)
        : currentStep === 3
          ? Boolean(selfie)
          : canSubmit;

  if (isVerified) {
    return (
      <section className="intra-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-success-soft text-intra-text-success">
              <ShieldCheck className="intra-icon-lg" strokeWidth={1.9} />
            </div>
            <div className="min-w-0">
              <h2 className="intra-h3">Verificación de identidad</h2>
              <p className="intra-body mt-1">Tu identidad ya fue verificada.</p>
              {reviewedAt ? (
                <p className="intra-caption mt-1">
                  Última revisión: <span className="intra-caption-strong">{formatDate(reviewedAt)}</span>
                </p>
              ) : null}
            </div>
          </div>

          <span className={`intra-pill intra-badge-text w-fit self-start border sm:justify-self-end ${tone.badgeClasses}`}>
            <BadgeCheck className="intra-icon-xs" strokeWidth={2} />
            {tone.badgeLabel}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="intra-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-warning-soft text-intra-warning-text">
            <ShieldCheck className="intra-icon-lg" strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <h2 className="intra-h3">Verificación de identidad</h2>
            <p className="intra-body mt-1 max-w-[40ch]">
              {isPending
                ? "Estamos revisando tus evidencias."
                : isRejected
                  ? "Corrige tus evidencias para volver a enviarlas."
                  : "Aumenta la confianza en tus envíos y viajes."}
            </p>
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

      {initialRejectionReason ? (
        <div className="mt-4 rounded-[var(--intra-radius-xs)] border border-intra-danger-border bg-intra-danger-soft px-4 py-3 intra-body text-intra-danger">
          Motivo de rechazo: {initialRejectionReason}
        </div>
      ) : null}

      {!isPending ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={openVerificationModal}
            className="intra-btn intra-btn-primary"
          >
            <ShieldCheck className="intra-icon-sm" strokeWidth={1.9} />
            {isRejected ? "Corregir verificación" : "Iniciar verificación"}
          </button>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-intra-blue/60 px-4 py-4 sm:items-center">
          <div className="intra-card max-h-screen w-full max-w-xl overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="intra-caption-strong text-intra-text-muted">
                  Paso {currentStep} de 4
                </p>
                <h3 className="intra-h3 mt-1">
                  {currentStep === 1
                    ? "Autoriza la revisión de identidad"
                    : currentStep === 2
                      ? "Documento de identidad"
                      : currentStep === 3
                        ? "Selfie"
                        : "Enviar verificación"}
                </h3>
                <p className="intra-body mt-1">
                  {currentStep === 1
                    ? "INTRA revisará tus evidencias para validar tu cuenta."
                    : currentStep === 2
                      ? "Sube una foto clara de tu documento."
                      : currentStep === 3
                        ? "Sube una selfie clara."
                        : "Revisa que todo esté listo antes de enviar."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeVerificationModal}
                className="intra-link intra-caption-strong"
                disabled={loading}
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              {currentStep === 1 ? (
                <div className="rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-card px-4 py-4">
                  <label className="intra-body flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptConsent}
                      onChange={(event) => setAcceptConsent(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-intra-border-soft accent-intra-green"
                    />
                    <span>
                      Autorizo a INTRA a revisar estas evidencias para validar mi identidad.
                    </span>
                  </label>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <UploadField
                  title="Documento de identidad"
                  selectedFile={documentPhoto}
                  hasUploaded={false}
                  icon="document"
                  onChange={handleDocumentPhotoChange}
                />
              ) : null}

              {currentStep === 3 ? (
                <UploadField
                  title="Selfie"
                  selectedFile={selfie}
                  hasUploaded={false}
                  icon="selfie"
                  onChange={handleSelfieChange}
                />
              ) : null}

              {currentStep === 4 ? (
                <div className="space-y-3">
                  <div className="rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-intra-success-border bg-intra-success-soft text-intra-text-success">
                        <CheckCircle className="intra-icon-sm" strokeWidth={2} />
                      </div>
                      <p className="intra-body-strong text-intra-blue">Listo para revisión</p>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="flex items-center gap-3 intra-body">
                        <CheckCircle className="intra-icon-sm shrink-0 text-intra-text-success" strokeWidth={2} />
                        <span>Documento cargado</span>
                      </div>
                      <div className="flex items-center gap-3 intra-body">
                        <CheckCircle className="intra-icon-sm shrink-0 text-intra-text-success" strokeWidth={2} />
                        <span>Selfie cargada</span>
                      </div>
                      <div className="flex items-center gap-3 intra-body">
                        <CheckCircle className="intra-icon-sm shrink-0 text-intra-text-success" strokeWidth={2} />
                        <span>Autorización aceptada</span>
                      </div>
                    </div>
                  </div>

                  <p className="intra-caption text-intra-text-muted">
                    Tus evidencias serán revisadas manualmente por INTRA.
                  </p>
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

              <div className="flex flex-col gap-3 border-t border-intra-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="intra-btn intra-btn-secondary w-full sm:w-auto"
                  disabled={currentStep === 1 || loading}
                >
                  Atrás
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={goToNextStep}
                    className="intra-btn intra-btn-primary w-full sm:w-auto"
                    disabled={!canContinue}
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="intra-btn intra-btn-primary w-full disabled:cursor-not-allowed sm:w-auto"
                  >
                    <Send className="intra-icon-sm" strokeWidth={1.9} />
                    {loading ? "Enviando a revisión..." : "Enviar a revisión"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
