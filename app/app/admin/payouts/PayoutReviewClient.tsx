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

export default function PayoutReviewClient({ payouts }: { payouts: AdminPayout[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [referenceById, setReferenceById] = useState<Record<string, string>>({})

  const pendingCount = useMemo(
    () => payouts.filter((payout) => payout.status === "pending").length,
    [payouts]
  )

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2C4A] sm:text-3xl">Admin de retiros</h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Revisa solicitudes pendientes y decide si se aprueban, rechazan o ya fueron pagadas.
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

      {payouts.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
          No hay retiros cargados todavía.
        </section>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => {
            const canApprove = payout.status === "pending"
            const canReject = payout.status === "pending" || payout.status === "approved"
            const canMarkPaid = payout.status === "approved"

            return (
              <article key={payout.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-[#0B2C4A]">{formatCop(payout.amount ?? 0)}</h2>
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
                        {payout.brebKey ? (
                          <p className="text-slate-500">Llave BRE-B: {payout.brebKey}</p>
                        ) : null}
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

                    {payout.paid_at ? (
                      <div className="rounded-2xl border border-[#A3E4BF] bg-[#EFFBF4] px-4 py-3 text-sm text-[#1e8c4e]">
                        Pagado el {formatDateTime(payout.paid_at)}
                        {payout.paid_reference ? ` · Ref: ${payout.paid_reference}` : ""}
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full max-w-xl space-y-3">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[#0B2C4A]">Notas de revisión</span>
                      <textarea
                        rows={3}
                        defaultValue={payout.review_notes ?? ""}
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
                        defaultValue={payout.paid_reference ?? ""}
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
                        disabled={isPending || !canApprove}
                        onClick={() => handleStatusChange(payout.id, "approved")}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !canReject}
                        onClick={() => handleStatusChange(payout.id, "rejected")}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !canMarkPaid}
                        onClick={() => handleStatusChange(payout.id, "paid")}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#A3E4BF] px-4 py-2.5 text-sm font-semibold text-[#1e8c4e] transition hover:bg-[#EFFBF4] disabled:opacity-50"
                      >
                        Marcar pagado
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
