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
  payoutCode: string | null
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
    payout.payoutCode ?? "",
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
    <details className="intra-card rounded-3xl border border-intra-border-soft p-5 shadow-sm">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-intra-blue">{payout.travelerName}</h3>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPayoutStatusClasses(
                  payout.status
                )}`}
              >
                {getPayoutStatusLabel(payout.status)}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-intra-text-subtle">
              <span>Ref: {payout.payoutCode || "Sin código"}</span>
              <span>Monto: {formatCop(payout.amount ?? 0)}</span>
              <span>Cuenta: {payout.accountLabel}</span>
              <span>Revisión: {formatDateTime(payout.reviewed_at)}</span>
            </div>
          </div>

          <span className="text-sm font-medium text-intra-text-muted/70">Ver detalle</span>
        </div>
      </summary>

      <div className="mt-5 space-y-4 border-t border-intra-border-soft pt-5">
        <div className="grid gap-3 text-sm text-intra-text-subtle sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Referencia</p>
            <p className="mt-1 break-all text-intra-blue">{payout.payoutCode || "Sin código"}</p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Cuenta</p>
            <p className="mt-1 font-medium text-intra-blue">{payout.accountLabel}</p>
            <p className="text-intra-text-subtle">{payout.accountMask}</p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Solicitado</p>
            <p className="mt-1 text-intra-blue">{formatDateTime(payout.requested_at)}</p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Pagado</p>
            <p className="mt-1 text-intra-blue">{formatDateTime(payout.paid_at)}</p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Ref. pago</p>
            <p className="mt-1 break-all text-intra-blue">{payout.paid_reference || "Sin referencia"}</p>
          </div>
        </div>

        {payout.brebKey ? (
          <div className="rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt px-4 py-3 text-sm text-intra-text-subtle">
            <span className="font-semibold text-intra-blue">Llave BRE-B:</span> {payout.brebKey}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-intra-blue">Notas de revisión</span>
          <textarea
            rows={3}
            value={notes}
            readOnly={isReadOnly}
            onChange={(event) => onNotesChange(event.target.value)}
            className="intra-input min-h-[88px] w-full px-4 py-3 text-sm"
            placeholder="Ej: validar cuenta antes de pagar"
          />
        </label>

        {!isReadOnly ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-intra-blue">Referencia de pago</span>
            <input
              value={reference}
              readOnly={isReadOnly}
              onChange={(event) => onReferenceChange(event.target.value)}
              className="intra-input min-h-11 w-full px-4 py-3 text-sm"
              placeholder="Transferencia 123456"
            />
          </label>
        ) : null}

        {showActions ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={isPending || !canApprove}
              onClick={() => onStatusChange(payout.id, "approved")}
              className="intra-btn intra-btn-primary min-h-11 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={isPending || !canReject}
              onClick={() => onStatusChange(payout.id, "rejected")}
              className="intra-btn intra-btn-secondary min-h-11 border-intra-danger-border px-4 py-2.5 text-sm text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              type="button"
              disabled={isPending || !canMarkPaid}
              onClick={() => onStatusChange(payout.id, "paid")}
              className="intra-btn min-h-11 rounded-2xl border border-intra-success-border bg-intra-card px-4 py-2.5 text-sm font-semibold text-intra-text-success transition hover:bg-intra-success-soft disabled:opacity-50"
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
      <section className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-intra-blue sm:text-3xl">Retiros</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-intra-bg-app px-4 py-3 text-sm text-intra-text-subtle">
              <p className="font-semibold text-intra-blue">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-intra-blue">{pendingPayouts.length}</p>
            </div>
            <div className="rounded-2xl bg-intra-bg-app px-4 py-3 text-sm text-intra-text-subtle">
              <p className="font-semibold text-intra-blue">Aprobados</p>
              <p className="mt-1 text-2xl font-bold text-intra-blue">{reviewedCounts.approved}</p>
            </div>
            <div className="rounded-2xl bg-intra-bg-app px-4 py-3 text-sm text-intra-text-subtle">
              <p className="font-semibold text-intra-blue">Rechazados</p>
              <p className="mt-1 text-2xl font-bold text-intra-blue">{reviewedCounts.rejected}</p>
            </div>
            <div className="rounded-2xl bg-intra-bg-app px-4 py-3 text-sm text-intra-text-subtle">
              <p className="font-semibold text-intra-blue">Pagados</p>
              <p className="mt-1 text-2xl font-bold text-intra-blue">{reviewedCounts.paid}</p>
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                : "border border-intra-success-border bg-intra-success-soft text-intra-text-success"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      {payouts.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 text-sm text-intra-text-subtle shadow-sm">
          No hay retiros cargados todavía.
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-intra-blue">Pendientes</h3>
            </div>

            {pendingPayouts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 text-sm text-intra-text-subtle shadow-sm">
                No hay retiros pendientes ahora mismo.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPayouts.map((payout) => (
                  <article key={payout.id} className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-intra-blue">{formatCop(payout.amount ?? 0)}</h3>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPayoutStatusClasses(
                              payout.status
                            )}`}
                          >
                            {getPayoutStatusLabel(payout.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm text-intra-text-subtle sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Referencia</p>
                            <p className="mt-1 font-medium text-intra-blue">{payout.payoutCode || "Sin código"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Viajero</p>
                            <p className="mt-1 font-medium text-intra-blue">{payout.travelerName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Cuenta</p>
                            <p className="mt-1 font-medium text-intra-blue">{payout.accountLabel}</p>
                            <p className="text-intra-text-subtle">{payout.accountMask}</p>
                            {payout.brebKey ? <p className="text-intra-text-subtle">Llave BRE-B: {payout.brebKey}</p> : null}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Solicitado</p>
                            <p className="mt-1">{formatDateTime(payout.requested_at)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">Revisión</p>
                            <p className="mt-1">{formatDateTime(payout.reviewed_at)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full max-w-xl space-y-3">
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-intra-blue">Notas de revisión</span>
                          <textarea
                            rows={3}
                            value={notesById[payout.id] ?? payout.review_notes ?? ""}
                            onChange={(event) =>
                              setNotesById((current) => ({
                                ...current,
                                [payout.id]: event.target.value,
                              }))
                            }
                            className="intra-input min-h-[88px] w-full px-4 py-3 text-sm"
                            placeholder="Ej: validar cuenta antes de pagar"
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-intra-blue">Referencia de pago</span>
                          <input
                            value={referenceById[payout.id] ?? payout.paid_reference ?? ""}
                            onChange={(event) =>
                              setReferenceById((current) => ({
                                ...current,
                                [payout.id]: event.target.value,
                              }))
                            }
                            className="intra-input min-h-11 w-full px-4 py-3 text-sm"
                            placeholder="Transferencia 123456"
                          />
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusChange(payout.id, "approved")}
                            className="intra-btn intra-btn-primary min-h-11 px-4 py-2.5 text-sm disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusChange(payout.id, "rejected")}
                            className="intra-btn intra-btn-secondary min-h-11 border-intra-danger-border px-4 py-2.5 text-sm text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
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
            <div className="flex flex-col gap-4 intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm xl:flex-row xl:items-center xl:justify-between">
              <div className="shrink-0">
                <h3 className="text-xl font-semibold text-intra-blue">Historial</h3>
              </div>

              <div className="flex w-full flex-col gap-3 xl:max-w-4xl xl:flex-row xl:items-center xl:justify-end">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por viajero, cuenta, llave o referencia"
                  className="intra-input min-h-11 w-full px-4 py-3 text-sm xl:max-w-md"
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
                            ? "border-intra-blue bg-intra-blue text-intra-card"
                            : "border-intra-border-soft bg-intra-card text-intra-text-subtle hover:border-intra-blue/20 hover:text-intra-blue"
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
              <div className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 text-sm text-intra-text-subtle shadow-sm">
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
