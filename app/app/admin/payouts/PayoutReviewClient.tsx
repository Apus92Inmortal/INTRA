"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { updatePayoutStatusAction } from "@/app/app/wallet/actions"
import {
  formatCop,
  formatDateTime,
  getPayoutStatusClasses,
  getPayoutStatusLabel,
} from "@/lib/payments/wallet"

type AdminPayout = {
  id: string
  amount: number | null
  status: string | null
  requested_at: string | null
  reviewed_at: string | null
  paid_at: string | null
  review_notes: string | null
  paid_reference: string | null
  travelerName: string
  accountLabel: string
  accountMask: string
  brebKey: string | null
}

type ReviewedFilter = "all" | "approved" | "rejected" | "paid"

function matchesSearch(payout: AdminPayout, search: string) {
  if (!search) {
    return true
  }

  const haystack = [
    payout.travelerName,
    payout.accountLabel,
    payout.accountMask,
    payout.brebKey ?? "",
    payout.paid_reference ?? "",
    formatCop(payout.amount ?? 0),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(search.toLowerCase())
}

function ReviewedPayoutRow({
  payout,
  isPending,
  notes,
  reference,
  onNotesChange,
  onReferenceChange,
  onStatusChange,
}: {
  payout: AdminPayout
  isPending: boolean
  notes: string
  reference: string
  onNotesChange: (value: string) => void
  onReferenceChange: (value: string) => void
  onStatusChange: (payoutId: string, status: "approved" | "rejected" | "paid") => void
}) {
  const canApprove = payout.status === "pending"
  const canReject = payout.status === "pending" || payout.status === "approved"
  const canMarkPaid = payout.status === "approved"
  const isReadOnly = payout.status === "paid"
  const showActions = canApprove || canReject || canMarkPaid

  return (
    <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-[#0B2C4A]">{payout.travelerName}</h3>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPayoutStatusClasses(
                  payout.status
                )}`}
              >
                {getPayoutStatusLabel(payout.status)}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              <span>Monto: {formatCop(payout.amount ?? 0)}</span>
              <span>Cuenta: {payout.accountLabel}</span>
              <span>Revisión: {formatDateTime(payout.reviewed_at)}</span>
            </div>
          </div>

          <span className="text-sm font-medium text-slate-400">Ver detalle</span>
        </div>
      </summary>

      <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cuenta</p>
            <p className="mt-1 font-medium text-[#0B2C4A]">{payout.accountLabel}</p>
            <p className="text-slate-500">{payout.accountMask}</p>
          </div>
          <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Solicitado</p>
            <p className="mt-1 text-[#0B2C4A]">{formatDateTime(payout.requested_at)}</p>
          </div>
          <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pagado</p>
            <p className="mt-1 text-[#0B2C4A]">{formatDateTime(payout.paid_at)}</p>
          </div>
          <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ref. pago</p>
            <p className="mt-1 break-all text-[#0B2C4A]">{payout.paid_reference || "Sin referencia"}</p>
          </div>
        </div>

        {payout.brebKey ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-[#0B2C4A]">Llave BRE-B:</span> {payout.brebKey}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#0B2C4A]">Notas de revisión</span>
          <textarea
            rows={3}
            value={notes}
            readOnly={isReadOnly}
            onChange={(event) => onNotesChange(event.target.value)}
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition ${
              isReadOnly ? "bg-slate-50 text-slate-500" : "focus:border-[#0B2C4A]"
            }`}
            placeholder="Ej: validar cuenta antes de pagar"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#0B2C4A]">Referencia de pago</span>
          <input
            value={reference}
            readOnly={isReadOnly}
            onChange={(event) => onReferenceChange(event.target.value)}
            className={`min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition ${
              isReadOnly ? "bg-slate-50 text-slate-500" : "focus:border-[#0B2C4A]"
            }`}
            placeholder="Transferencia 123456"
          />
        </label>

        {showActions ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={isPending || !canApprove}
              onClick={() => onStatusChange(payout.id, "approved")}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={isPending || !canReject}
              onClick={() => onStatusChange(payout.id, "rejected")}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              type="button"
              disabled={isPending || !canMarkPaid}
              onClick={() => onStatusChange(payout.id, "paid")}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#A3E4BF] px-4 py-2.5 text-sm font-semibold text-[#1e8c4e] transition hover:bg-[#EFFBF4] disabled:opacity-50"
            >
              Marcar pagado
            </button>
          </div>
        ) : null}
      </div>
    </details>
  )
}

export default function PayoutReviewClient({ payouts }: { payouts: AdminPayout[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [referenceById, setReferenceById] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>("all")

  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === "pending"),
    [payouts]
  )

  const reviewedCounts = useMemo(
    () => ({
      approved: payouts.filter((payout) => payout.status === "approved").length,
      rejected: payouts.filter((payout) => payout.status === "rejected").length,
      paid: payouts.filter((payout) => payout.status === "paid").length,
      all: payouts.filter((payout) => payout.status && payout.status !== "pending").length,
    }),
    [payouts]
  )

  const reviewedPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      if (!payout.status || payout.status === "pending") {
        return false
      }

      if (!matchesSearch(payout, search)) {
        return false
      }

      if (reviewedFilter === "all") {
        return true
      }

      return payout.status === reviewedFilter
    })
  }, [payouts, reviewedFilter, search])

  function handleStatusChange(payoutId: string, status: "approved" | "rejected" | "paid") {
    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("payoutId", payoutId)
      formData.set("status", status)
      formData.set("reviewNotes", notesById[payoutId] ?? "")
      formData.set("paidReference", referenceById[payoutId] ?? "")

      const result = await updatePayoutStatusAction(formData)

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "No pudimos actualizar el retiro." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Retiro actualizado." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0B2C4A] sm:text-3xl">Retiros</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-[#0B2C4A]">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{pendingPayouts.length}</p>
            </div>
            <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-[#0B2C4A]">Aprobados</p>
              <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{reviewedCounts.approved}</p>
            </div>
            <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-[#0B2C4A]">Rechazados</p>
              <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{reviewedCounts.rejected}</p>
            </div>
            <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-[#0B2C4A]">Pagados</p>
              <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{reviewedCounts.paid}</p>
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

      {payouts.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
          No hay retiros cargados todavía.
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#0B2C4A]">Pendientes</h3>
            </div>

            {pendingPayouts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
                No hay retiros pendientes ahora mismo.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPayouts.map((payout) => (
                  <article key={payout.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-[#0B2C4A]">{formatCop(payout.amount ?? 0)}</h3>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPayoutStatusClasses(
                              payout.status
                            )}`}
                          >
                            {getPayoutStatusLabel(payout.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Viajero</p>
                            <p className="mt-1 font-medium text-[#0B2C4A]">{payout.travelerName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cuenta</p>
                            <p className="mt-1 font-medium text-[#0B2C4A]">{payout.accountLabel}</p>
                            <p className="text-slate-500">{payout.accountMask}</p>
                            {payout.brebKey ? <p className="text-slate-500">Llave BRE-B: {payout.brebKey}</p> : null}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Solicitado</p>
                            <p className="mt-1">{formatDateTime(payout.requested_at)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revisión</p>
                            <p className="mt-1">{formatDateTime(payout.reviewed_at)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full max-w-xl space-y-3">
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-[#0B2C4A]">Notas de revisión</span>
                          <textarea
                            rows={3}
                            value={notesById[payout.id] ?? payout.review_notes ?? ""}
                            onChange={(event) =>
                              setNotesById((current) => ({
                                ...current,
                                [payout.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
                            placeholder="Ej: validar cuenta antes de pagar"
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-[#0B2C4A]">Referencia de pago</span>
                          <input
                            value={referenceById[payout.id] ?? payout.paid_reference ?? ""}
                            onChange={(event) =>
                              setReferenceById((current) => ({
                                ...current,
                                [payout.id]: event.target.value,
                              }))
                            }
                            className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
                            placeholder="Transferencia 123456"
                          />
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusChange(payout.id, "approved")}
                            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusChange(payout.id, "rejected")}
                            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:flex-row xl:items-center xl:justify-between">
              <div className="shrink-0">
                <h3 className="text-xl font-semibold text-[#0B2C4A]">Historial</h3>
              </div>

              <div className="flex w-full flex-col gap-3 xl:max-w-4xl xl:flex-row xl:items-center xl:justify-end">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por viajero, cuenta, llave o referencia"
                  className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A] xl:max-w-md"
                />

                <div className="flex flex-wrap gap-2 xl:flex-nowrap xl:justify-end">
                  {([
                    ["all", `Todos (${reviewedCounts.all})`],
                    ["approved", `Aprobados (${reviewedCounts.approved})`],
                    ["rejected", `Rechazados (${reviewedCounts.rejected})`],
                    ["paid", `Pagados (${reviewedCounts.paid})`],
                  ] as Array<[ReviewedFilter, string]>).map(([value, label]) => {
                    const isActive = reviewedFilter === value

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewedFilter(value)}
                        className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
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

            {reviewedPayouts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
                No encontramos retiros con esos filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewedPayouts.map((payout) => (
                  <ReviewedPayoutRow
                    key={payout.id}
                    payout={payout}
                    isPending={isPending}
                    notes={notesById[payout.id] ?? payout.review_notes ?? ""}
                    reference={referenceById[payout.id] ?? payout.paid_reference ?? ""}
                    onNotesChange={(value) =>
                      setNotesById((current) => ({
                        ...current,
                        [payout.id]: value,
                      }))
                    }
                    onReferenceChange={(value) =>
                      setReferenceById((current) => ({
                        ...current,
                        [payout.id]: value,
                      }))
                    }
                    onStatusChange={handleStatusChange}
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
