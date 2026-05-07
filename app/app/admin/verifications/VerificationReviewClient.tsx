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

function VerificationImage({ title, url }: { title: string; url: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0B2C4A]">{title}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#0B2C4A] hover:underline"
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
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-400">
          Archivo no disponible
        </div>
      )}
    </div>
  )
}

function VerificationLinkCard({ title, url }: { title: string; url: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-[#0B2C4A]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">
        {url ? "Abre el archivo completo solo cuando lo necesites revisar." : "Archivo no disponible."}
      </p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#0B2C4A]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#EEF2F7]"
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
    <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-[#0B2C4A]">{verification.fullName}</h3>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.classes}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              <span>Documento: {verification.documentNumber || "Sin dato"}</span>
              <span>Teléfono: {verification.phone || "Sin dato"}</span>
              <span>Revisada: {formatDateTime(verification.reviewedAt)}</span>
            </div>
          </div>

          <span className="text-sm font-medium text-slate-400">Ver detalle</span>
        </div>
      </summary>

      <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <VerificationLinkCard title="Documento" url={verification.documentPhotoUrl} />
          <VerificationLinkCard title="Selfie" url={verification.selfieUrl} />
        </div>

        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Enviada</p>
            <p className="mt-1 text-[#0B2C4A]">{formatDateTime(verification.createdAt)}</p>
          </div>
          <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ID usuario</p>
            <p className="mt-1 break-all text-[#0B2C4A]">{verification.userId}</p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#0B2C4A]">Motivo de rechazo</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
            placeholder="Ej: la selfie no coincide con el documento"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={isPending || !canApprove}
            onClick={() => onReview(verification.id, "verified")}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
          >
            Aprobar verificación
          </button>
          <button
            type="button"
            disabled={isPending || !canReject}
            onClick={() => onReview(verification.id, "rejected")}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            Rechazar verificación
          </button>
        </div>
      </div>
    </details>
  )
}

export default function VerificationReviewClient({ verifications }: { verifications: AdminVerification[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [reasonsById, setReasonsById] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>("all")

  const pendingVerifications = useMemo(
    () => verifications.filter((verification) => verification.verificationStatus === "pending"),
    [verifications]
  )

  const reviewedVerifications = useMemo(() => {
    return verifications.filter((verification) => {
      if (verification.verificationStatus !== "verified" && verification.verificationStatus !== "rejected") {
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
        (verification) => verification.verificationStatus === "verified" || verification.verificationStatus === "rejected"
      ).length,
      verified: verifications.filter((verification) => verification.verificationStatus === "verified").length,
      rejected: verifications.filter((verification) => verification.verificationStatus === "rejected").length,
    }),
    [verifications]
  )

  function handleReview(verificationId: string, status: "verified" | "rejected") {
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
        setFeedback({ type: "error", message: result.error ?? "No pudimos actualizar la verificación." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Verificación actualizada." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0B2C4A] sm:text-3xl">Verificaciones</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-[#0B2C4A]">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{pendingVerifications.length}</p>
            </div>
            <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-[#0B2C4A]">Aprobadas</p>
              <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{reviewedCounts.verified}</p>
            </div>
            <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-[#0B2C4A]">Rechazadas</p>
              <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{reviewedCounts.rejected}</p>
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-[#A3E4BF] bg-[#EFFBF4] text-[#1e8c4e]"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      {verifications.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
          No hay verificaciones cargadas todavía.
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[#0B2C4A]">Pendientes</h3>
              </div>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
                No hay verificaciones pendientes ahora mismo.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVerifications.map((verification) => {
                  const badge = getVerificationBadge(verification.verificationStatus)

                  return (
                    <article key={verification.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-4 xl:max-w-sm">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-[#0B2C4A]">{verification.fullName}</h3>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.classes}`}>
                              {badge.label}
                            </span>
                          </div>

                          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-1">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documento</p>
                              <p className="mt-1 font-medium text-[#0B2C4A]">{verification.documentNumber || "Sin dato"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Teléfono</p>
                              <p className="mt-1 font-medium text-[#0B2C4A]">{verification.phone || "Sin dato"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Enviada</p>
                              <p className="mt-1">{formatDateTime(verification.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ID usuario</p>
                              <p className="mt-1 break-all">{verification.userId}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <VerificationImage title="Documento" url={verification.documentPhotoUrl} />
                            <VerificationImage title="Selfie" url={verification.selfieUrl} />
                          </div>

                          <label className="block space-y-2">
                            <span className="text-sm font-semibold text-[#0B2C4A]">Motivo de rechazo</span>
                            <textarea
                              rows={3}
                              value={reasonsById[verification.id] ?? verification.rejectionReason ?? ""}
                              onChange={(event) =>
                                setReasonsById((current) => ({
                                  ...current,
                                  [verification.id]: event.target.value,
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
                              placeholder="Ej: la selfie no coincide con el documento"
                            />
                          </label>

                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleReview(verification.id, "verified")}
                              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                            >
                              Aprobar verificación
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleReview(verification.id, "rejected")}
                              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
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
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[#0B2C4A]">Revisadas</h3>
              </div>

              <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:items-end">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, teléfono o documento"
                  className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A] lg:max-w-md"
                />

                <div className="flex w-full flex-wrap gap-2 lg:justify-end">
                  {([
                    ["all", `Todas (${reviewedCounts.all})`],
                    ["verified", `Aprobadas (${reviewedCounts.verified})`],
                    ["rejected", `Rechazadas (${reviewedCounts.rejected})`],
                  ] as Array<[ReviewedFilter, string]>).map(([value, label]) => {
                    const isActive = reviewedFilter === value

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewedFilter(value)}
                        className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-[#0B2C4A]/20 hover:text-[#0B2C4A]"
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
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
                No encontramos verificaciones revisadas con esos filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewedVerifications.map((verification) => (
                  <ReviewedVerificationRow
                    key={verification.id}
                    verification={verification}
                    isPending={isPending}
                    reason={reasonsById[verification.id] ?? verification.rejectionReason ?? ""}
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
