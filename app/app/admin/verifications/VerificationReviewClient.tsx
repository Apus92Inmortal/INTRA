"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { reviewUserVerificationAction } from "@/app/app/admin/actions"
import { getVerificationBadge } from "@/lib/trust"

type AdminVerification = {
  id: string
  userId: string
  fullName: string
  phone: string | null
  documentNumber: string | null
  verificationStatus: string | null
  documentPhotoUrl: string | null
  selfieUrl: string | null
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string | null
}

type ReviewedFilter = "all" | "verified" | "rejected"

function formatDateTime(dateString: string | null) {
  if (!dateString) {
    return "Sin fecha"
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString))
}

function matchesSearch(verification: AdminVerification, search: string) {
  if (!search) {
    return true
  }

  const haystack = [
    verification.fullName,
    verification.phone ?? "",
    verification.documentNumber ?? "",
    verification.userId,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(search.toLowerCase())
}

function VerificationImage({
  title,
  url,
}: {
  title: string
  url: string | null
}) {
  return (
    <div className="rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="intra-body-strong text-intra-blue">{title}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="intra-caption-strong text-intra-blue hover:underline"
          >
            Abrir
          </a>
        ) : null}
      </div>

      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={title}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-intra-border-soft bg-intra-card intra-body text-intra-text-muted/70">
          Archivo no disponible
        </div>
      )}
    </div>
  )
}

function VerificationLinkCard({
  title,
  url,
}: {
  title: string
  url: string | null
}) {
  return (
    <div className="rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt p-4">
      <p className="intra-body-strong text-intra-blue">{title}</p>
      <p className="mt-1 intra-body text-intra-text-subtle">
        {url
          ? "Abre el archivo completo solo cuando lo necesites revisar."
          : "Archivo no disponible."}
      </p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="intra-btn intra-btn-secondary mt-4 min-h-11 border-intra-border-soft px-4 py-2.5 intra-body"
        >
          Abrir {title.toLowerCase()}
        </a>
      ) : null}
    </div>
  )
}

function ReviewedVerificationRow({
  verification,
  isPending,
  reason,
  onReasonChange,
  onReview,
}: {
  verification: AdminVerification
  isPending: boolean
  reason: string
  onReasonChange: (value: string) => void
  onReview: (verificationId: string, status: "verified" | "rejected") => void
}) {
  const badge = getVerificationBadge(verification.verificationStatus)
  const canApprove = verification.verificationStatus !== "verified"
  const canReject = verification.verificationStatus !== "rejected"

  return (
    <details className="intra-card rounded-3xl border border-intra-border-soft p-5 shadow-sm">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="intra-h4 text-intra-blue">
                {verification.fullName}
              </h3>
              <span
                className={`inline-flex rounded-full px-3 py-1 intra-caption-strong ${badge.classes}`}
              >
                {badge.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 intra-body text-intra-text-subtle">
              <span>
                Documento: {verification.documentNumber || "Sin dato"}
              </span>
              <span>Teléfono: {verification.phone || "Sin dato"}</span>
              <span>Revisada: {formatDateTime(verification.reviewedAt)}</span>
            </div>
          </div>

          <span className="intra-body-strong text-intra-text-muted/70">
            Ver detalle
          </span>
        </div>
      </summary>

      <div className="mt-5 space-y-4 border-t border-intra-border-soft pt-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <VerificationLinkCard
            title="Documento"
            url={verification.documentPhotoUrl}
          />
          <VerificationLinkCard title="Selfie" url={verification.selfieUrl} />
        </div>

        <div className="grid gap-3 intra-body text-intra-text-subtle sm:grid-cols-2">
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Enviada
            </p>
            <p className="mt-1 text-intra-blue">
              {formatDateTime(verification.createdAt)}
            </p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              ID usuario
            </p>
            <p className="mt-1 break-all text-intra-blue">
              {verification.userId}
            </p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="intra-body-strong text-intra-blue">
            Motivo de rechazo
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            className="intra-input min-h-[88px] w-full px-4 py-3 intra-body"
            placeholder="Ej: la selfie no coincide con el documento"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={isPending || !canApprove}
            onClick={() => onReview(verification.id, "verified")}
            className="intra-btn intra-btn-primary min-h-11 px-4 py-2.5 intra-body disabled:opacity-50"
          >
            Aprobar verificación
          </button>
          <button
            type="button"
            disabled={isPending || !canReject}
            onClick={() => onReview(verification.id, "rejected")}
            className="intra-btn intra-btn-secondary min-h-11 border-intra-danger-border px-4 py-2.5 intra-body text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
          >
            Rechazar verificación
          </button>
        </div>
      </div>
    </details>
  )
}

export default function VerificationReviewClient({
  verifications,
}: {
  verifications: AdminVerification[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [reasonsById, setReasonsById] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>("all")

  const pendingVerifications = useMemo(
    () =>
      verifications.filter(
        (verification) => verification.verificationStatus === "pending",
      ),
    [verifications],
  )

  const reviewedVerifications = useMemo(() => {
    return verifications.filter((verification) => {
      if (
        verification.verificationStatus !== "verified" &&
        verification.verificationStatus !== "rejected"
      ) {
        return false
      }

      if (!matchesSearch(verification, search)) {
        return false
      }

      if (reviewedFilter === "all") {
        return true
      }

      return verification.verificationStatus === reviewedFilter
    })
  }, [reviewedFilter, search, verifications])

  const reviewedCounts = useMemo(
    () => ({
      all: verifications.filter(
        (verification) =>
          verification.verificationStatus === "verified" ||
          verification.verificationStatus === "rejected",
      ).length,
      verified: verifications.filter(
        (verification) => verification.verificationStatus === "verified",
      ).length,
      rejected: verifications.filter(
        (verification) => verification.verificationStatus === "rejected",
      ).length,
    }),
    [verifications],
  )

  function handleReview(
    verificationId: string,
    status: "verified" | "rejected",
  ) {
    const rejectionReason = (reasonsById[verificationId] ?? "").trim()

    if (status === "rejected" && !rejectionReason) {
      setFeedback({
        type: "error",
        message: "Escribe un motivo antes de rechazar la verificación.",
      })
      return
    }

    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("verificationId", verificationId)
      formData.set("status", status)
      formData.set("rejectionReason", rejectionReason)

      const result = await reviewUserVerificationAction(formData)

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "No pudimos actualizar la verificación.",
        })
        return
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Verificación actualizada.",
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="intra-h2 text-intra-blue ">Verificaciones</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-intra-bg-app px-4 py-3 intra-body text-intra-text-subtle">
              <p className=" text-intra-blue">Pendientes</p>
              <p className="mt-1 intra-h2 text-intra-blue">
                {pendingVerifications.length}
              </p>
            </div>
            <div className="rounded-2xl bg-intra-bg-app px-4 py-3 intra-body text-intra-text-subtle">
              <p className=" text-intra-blue">Aprobadas</p>
              <p className="mt-1 intra-h2 text-intra-blue">
                {reviewedCounts.verified}
              </p>
            </div>
            <div className="rounded-2xl bg-intra-bg-app px-4 py-3 intra-body text-intra-text-subtle">
              <p className=" text-intra-blue">Rechazadas</p>
              <p className="mt-1 intra-h2 text-intra-blue">
                {reviewedCounts.rejected}
              </p>
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 intra-body ${
              feedback.type === "error"
                ? "border border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                : "border border-intra-success-border bg-intra-success-soft text-intra-text-success"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      {verifications.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 intra-body text-intra-text-subtle shadow-sm">
          No hay verificaciones cargadas todavía.
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="intra-h3 text-intra-blue">Pendientes</h3>
              </div>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 intra-body text-intra-text-subtle shadow-sm">
                No hay verificaciones pendientes ahora mismo.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVerifications.map((verification) => {
                  const badge = getVerificationBadge(
                    verification.verificationStatus,
                  )

                  return (
                    <article
                      key={verification.id}
                      className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-4 xl:max-w-sm">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="intra-h3 text-intra-blue">
                              {verification.fullName}
                            </h3>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 intra-caption-strong ${badge.classes}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <div className="grid gap-3 intra-body text-intra-text-subtle sm:grid-cols-2 xl:grid-cols-1">
                            <div>
                              <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
                                Documento
                              </p>
                              <p className="mt-1  text-intra-blue">
                                {verification.documentNumber || "Sin dato"}
                              </p>
                            </div>
                            <div>
                              <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
                                Teléfono
                              </p>
                              <p className="mt-1  text-intra-blue">
                                {verification.phone || "Sin dato"}
                              </p>
                            </div>
                            <div>
                              <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
                                Enviada
                              </p>
                              <p className="mt-1">
                                {formatDateTime(verification.createdAt)}
                              </p>
                            </div>
                            <div>
                              <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
                                ID usuario
                              </p>
                              <p className="mt-1 break-all">
                                {verification.userId}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <VerificationImage
                              title="Documento"
                              url={verification.documentPhotoUrl}
                            />
                            <VerificationImage
                              title="Selfie"
                              url={verification.selfieUrl}
                            />
                          </div>

                          <label className="block space-y-2">
                            <span className="intra-body-strong text-intra-blue">
                              Motivo de rechazo
                            </span>
                            <textarea
                              rows={3}
                              value={
                                reasonsById[verification.id] ??
                                verification.rejectionReason ??
                                ""
                              }
                              onChange={(event) =>
                                setReasonsById((current) => ({
                                  ...current,
                                  [verification.id]: event.target.value,
                                }))
                              }
                              className="intra-input min-h-[88px] w-full px-4 py-3 intra-body"
                              placeholder="Ej: la selfie no coincide con el documento"
                            />
                          </label>

                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleReview(verification.id, "verified")
                              }
                              className="intra-btn intra-btn-primary min-h-11 px-4 py-2.5 intra-body disabled:opacity-50"
                            >
                              Aprobar verificación
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleReview(verification.id, "rejected")
                              }
                              className="intra-btn intra-btn-secondary min-h-11 border-intra-danger-border px-4 py-2.5 intra-body text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
                            >
                              Rechazar verificación
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm xl:flex-row xl:items-center xl:justify-between">
              <div className="shrink-0">
                <h3 className="intra-h3 text-intra-blue">Revisadas</h3>
              </div>

              <div className="flex w-full flex-col gap-3 xl:max-w-4xl xl:flex-row xl:items-center xl:justify-end">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, teléfono o documento"
                  className="intra-input min-h-11 w-full px-4 py-3 intra-body xl:max-w-md"
                />

                <div className="flex flex-wrap gap-2 xl:flex-nowrap xl:justify-end">
                  {(
                    [
                      ["all", `Todas (${reviewedCounts.all})`],
                      ["verified", `Aprobadas (${reviewedCounts.verified})`],
                      ["rejected", `Rechazadas (${reviewedCounts.rejected})`],
                    ] as Array<[ReviewedFilter, string]>
                  ).map(([value, label]) => {
                    const isActive = reviewedFilter === value

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewedFilter(value)}
                        className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 intra-body-strong transition ${
                          isActive
                            ? "border-intra-blue bg-intra-blue text-intra-card"
                            : "border-intra-border-soft bg-intra-card text-intra-text-subtle hover:border-intra-blue hover:text-intra-blue"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {reviewedVerifications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 intra-body text-intra-text-subtle shadow-sm">
                No encontramos verificaciones revisadas con esos filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewedVerifications.map((verification) => (
                  <ReviewedVerificationRow
                    key={verification.id}
                    verification={verification}
                    isPending={isPending}
                    reason={
                      reasonsById[verification.id] ??
                      verification.rejectionReason ??
                      ""
                    }
                    onReasonChange={(value) =>
                      setReasonsById((current) => ({
                        ...current,
                        [verification.id]: value,
                      }))
                    }
                    onReview={handleReview}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
