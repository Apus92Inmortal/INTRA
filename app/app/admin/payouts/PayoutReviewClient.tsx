"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import {
  AdminEmptyState,
  AdminFeedback,
  AdminField,
  AdminInboxTabs,
  AdminMetricCard,
} from "@/app/app/admin/AdminUi"
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
  accountNumber: string
  brebKey: string | null
}

type PayoutInboxTab = "pending" | "managed"

function matchesSearch(payout: AdminPayout, search: string) {
  if (!search) {
    return true
  }

  const haystack = [
    payout.travelerName,
    payout.accountLabel,
    payout.accountNumber,
    payout.brebKey ?? "",
    payout.payoutCode ?? "",
    payout.paid_reference ?? "",
    formatCop(payout.amount ?? 0),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(search.toLowerCase())
}

function PayoutBadge({ status }: { status: string | null }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 intra-badge-text ${getPayoutStatusClasses(status)}`}
    >
      {getPayoutStatusLabel(status)}
    </span>
  )
}

function PayoutDetails({
  payout,
  notes,
  reference,
  isReadOnly,
  onNotesChange,
  onReferenceChange,
}: {
  payout: AdminPayout
  notes: string
  reference: string
  isReadOnly: boolean
  onNotesChange: (value: string) => void
  onReferenceChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
          <AdminField label="Referencia">
            {payout.payoutCode || "Sin código"}
          </AdminField>
        </div>
        <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
          <AdminField label="Cuenta">
            <span>{payout.accountLabel}</span>
            <span className="block intra-body text-intra-text-subtle">
              {payout.accountNumber}
            </span>
          </AdminField>
        </div>
        <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
          <AdminField label="Solicitado">
            {formatDateTime(payout.requested_at)}
          </AdminField>
        </div>
        <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
          <AdminField label="Revisión">
            {formatDateTime(payout.reviewed_at)}
          </AdminField>
        </div>
        <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
          <AdminField label="Pago">
            {payout.paid_reference || "Sin referencia"}
          </AdminField>
        </div>
      </div>

      {payout.brebKey ? (
        <div className="rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt px-4 py-3 intra-body text-intra-text-subtle">
          <span className="intra-body-strong text-intra-blue">
            Llave BRE-B:
          </span>{" "}
          {payout.brebKey}
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="intra-body-strong text-intra-blue">
          Notas de revisión
        </span>
        <textarea
          rows={3}
          value={notes}
          readOnly={isReadOnly}
          onChange={(event) => onNotesChange(event.target.value)}
          className="intra-input min-h-[88px] w-full px-4 py-3 intra-body"
          placeholder="Nota"
        />
      </label>

      {!isReadOnly ? (
        <label className="block space-y-2">
          <span className="intra-body-strong text-intra-blue">
            Referencia de pago
          </span>
          <input
            value={reference}
            readOnly={isReadOnly}
            onChange={(event) => onReferenceChange(event.target.value)}
            className="intra-input min-h-11 w-full px-4 py-3 intra-body"
            placeholder="Referencia"
          />
        </label>
      ) : null}
    </div>
  )
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
  onStatusChange: (
    payoutId: string,
    status: "approved" | "rejected" | "paid",
  ) => void
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
              <h3 className="intra-h4">{payout.travelerName}</h3>
              <PayoutBadge status={payout.status} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 intra-body text-intra-text-subtle">
              <span>Ref: {payout.payoutCode || "Sin código"}</span>
              <span>Monto: {formatCop(payout.amount ?? 0)}</span>
              <span>Cuenta: {payout.accountLabel}</span>
            </div>
          </div>

          <span className="intra-caption-strong text-intra-text-muted">
            Ver detalle
          </span>
        </div>
      </summary>

      <div className="mt-5 space-y-4 border-t border-intra-border-soft pt-5">
        <PayoutDetails
          payout={payout}
          notes={notes}
          reference={reference}
          isReadOnly={isReadOnly}
          onNotesChange={onNotesChange}
          onReferenceChange={onReferenceChange}
        />

        {showActions ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={isPending || !canApprove}
              onClick={() => onStatusChange(payout.id, "approved")}
              className="intra-btn intra-btn-primary disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={isPending || !canReject}
              onClick={() => onStatusChange(payout.id, "rejected")}
              className="intra-btn intra-btn-secondary border-intra-danger-border text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              type="button"
              disabled={isPending || !canMarkPaid}
              onClick={() => onStatusChange(payout.id, "paid")}
              className="intra-btn border border-intra-success-border bg-intra-card text-intra-text-success hover:bg-intra-success-soft disabled:opacity-50"
            >
              Marcar pagado
            </button>
          </div>
        ) : null}
      </div>
    </details>
  )
}

export default function PayoutReviewClient({
  payouts,
}: {
  payouts: AdminPayout[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [referenceById, setReferenceById] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<PayoutInboxTab>("pending")

  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === "pending"),
    [payouts],
  )

  const reviewedCounts = useMemo(
    () => ({
      approved: payouts.filter((payout) => payout.status === "approved").length,
      rejected: payouts.filter((payout) => payout.status === "rejected").length,
      paid: payouts.filter((payout) => payout.status === "paid").length,
      all: payouts.filter(
        (payout) => payout.status && payout.status !== "pending",
      ).length,
    }),
    [payouts],
  )

  const inboxTabs = useMemo(
    () => [
      {
        key: "pending",
        label: "Pendientes",
        count: pendingPayouts.length,
      },
      {
        key: "managed",
        label: "Gestionados",
        count: reviewedCounts.all,
      },
    ],
    [pendingPayouts.length, reviewedCounts.all],
  )

  const reviewedPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      if (!payout.status || payout.status === "pending") {
        return false
      }

      if (!matchesSearch(payout, search)) {
        return false
      }

      return true
    })
  }, [payouts, search])

  function handleStatusChange(
    payoutId: string,
    status: "approved" | "rejected" | "paid",
  ) {
    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("payoutId", payoutId)
      formData.set("status", status)
      formData.set("reviewNotes", notesById[payoutId] ?? "")
      formData.set("paidReference", referenceById[payoutId] ?? "")

      const result = await updatePayoutStatusAction(formData)

      if (!result.success) {
        setFeedback({
          type: "error",
          message: "Error al actualizar.",
        })
        return
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Retiro actualizado.",
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <h2 className="intra-h2">Retiros</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminMetricCard label="Pendientes" value={pendingPayouts.length} />
            <AdminMetricCard
              label="Gestionados"
              value={reviewedCounts.all}
            />
          </div>
        </div>

        <div className="mt-5">
          <AdminInboxTabs
            tabs={inboxTabs}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as PayoutInboxTab)}
          />
        </div>

        {feedback ? (
          <div className="mt-5">
            <AdminFeedback type={feedback.type}>
              {feedback.message}
            </AdminFeedback>
          </div>
        ) : null}
      </section>

      {payouts.length === 0 ? (
        <AdminEmptyState>Sin registros.</AdminEmptyState>
      ) : (
        <>
          {activeTab === "pending" ? (
          <section className="space-y-4">
            <h3 className="intra-h3">Pendientes</h3>

            {pendingPayouts.length === 0 ? (
              <AdminEmptyState>Sin pendientes.</AdminEmptyState>
            ) : (
              <div className="space-y-4">
                {pendingPayouts.map((payout) => (
                  <article
                    key={payout.id}
                    className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="intra-h3">
                            {formatCop(payout.amount ?? 0)}
                          </h3>
                          <PayoutBadge status={payout.status} />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <AdminField label="Referencia">
                            {payout.payoutCode || "Sin código"}
                          </AdminField>
                          <AdminField label="Viajero">
                            {payout.travelerName}
                          </AdminField>
                          <AdminField label="Cuenta">
                            <span>{payout.accountLabel}</span>
                            <span className="block intra-body text-intra-text-subtle">
                              {payout.accountNumber}
                            </span>
                            {payout.brebKey ? (
                              <span className="block intra-body text-intra-text-subtle">
                                Llave BRE-B: {payout.brebKey}
                              </span>
                            ) : null}
                          </AdminField>
                          <AdminField label="Solicitado">
                            {formatDateTime(payout.requested_at)}
                          </AdminField>
                        </div>
                      </div>

                      <div className="w-full max-w-xl space-y-3">
                        <PayoutDetails
                          payout={payout}
                          notes={
                            notesById[payout.id] ?? payout.review_notes ?? ""
                          }
                          reference={
                            referenceById[payout.id] ??
                            payout.paid_reference ??
                            ""
                          }
                          isReadOnly={false}
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
                        />

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleStatusChange(payout.id, "approved")
                            }
                            className="intra-btn intra-btn-primary disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleStatusChange(payout.id, "rejected")
                            }
                            className="intra-btn intra-btn-secondary border-intra-danger-border text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
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
          ) : null}

          {activeTab === "managed" ? (
          <section className="space-y-4">
            <div className="intra-card flex flex-col gap-4 rounded-3xl border border-intra-border-soft p-6 shadow-sm xl:flex-row xl:items-center xl:justify-between">
              <h3 className="intra-h3 shrink-0">Gestionados</h3>

              <div className="flex w-full flex-col gap-3 xl:max-w-md">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar"
                  className="intra-input min-h-11 w-full px-4 py-3 intra-body xl:max-w-md"
                />
              </div>
            </div>

            {reviewedPayouts.length === 0 ? (
              <AdminEmptyState>Sin resultados.</AdminEmptyState>
            ) : (
              <div className="space-y-3">
                {reviewedPayouts.map((payout) => (
                  <ReviewedPayoutRow
                    key={payout.id}
                    payout={payout}
                    isPending={isPending}
                    notes={notesById[payout.id] ?? payout.review_notes ?? ""}
                    reference={
                      referenceById[payout.id] ?? payout.paid_reference ?? ""
                    }
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
          ) : null}
        </>
      )}
    </div>
  )
}
