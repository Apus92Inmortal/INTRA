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

function formatDateTime(dateString: string | null) {
  if (!dateString) {
    return "Sin fecha"
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString))
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

export default function VerificationReviewClient({ verifications }: { verifications: AdminVerification[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [reasonsById, setReasonsById] = useState<Record<string, string>>({})

  const pendingCount = useMemo(
    () => verifications.filter((verification) => verification.verificationStatus === "pending").length,
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0B2C4A] sm:text-3xl">Verificaciones</h2>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Revisa documento y selfie para aprobar o rechazar manualmente cada cuenta.
            </p>
          </div>
          <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-[#0B2C4A]">Pendientes</p>
            <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{pendingCount}</p>
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
        <div className="space-y-4">
          {verifications.map((verification) => {
            const badge = getVerificationBadge(verification.verificationStatus)
            const canApprove = verification.verificationStatus !== "verified"
            const canReject = verification.verificationStatus !== "rejected"

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
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Última revisión</p>
                        <p className="mt-1">{formatDateTime(verification.reviewedAt)}</p>
                      </div>
                    </div>

                    {verification.rejectionReason ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <p className="font-semibold">Motivo actual</p>
                        <p className="mt-1">{verification.rejectionReason}</p>
                      </div>
                    ) : null}

                    <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
                      <p className="font-semibold text-[#0B2C4A]">ID usuario</p>
                      <p className="mt-1 break-all">{verification.userId}</p>
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
                        defaultValue={verification.rejectionReason ?? ""}
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
                        disabled={isPending || !canApprove}
                        onClick={() => handleReview(verification.id, "verified")}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                      >
                        Aprobar verificación
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !canReject}
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
    </div>
  )
}

