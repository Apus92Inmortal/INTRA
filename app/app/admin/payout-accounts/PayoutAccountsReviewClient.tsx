"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import {
  AdminEmptyState,
  AdminFeedback,
  AdminField,
  AdminMetricCard,
} from "@/app/app/admin/AdminUi"
import { reviewPayoutAccountAction } from "@/app/app/admin/actions"
import {
  formatDateTime,
  getPayoutAccountVerificationClasses,
  getPayoutAccountVerificationLabel,
} from "@/lib/payments/wallet"

type AdminPayoutAccount = {
  id: string
  travelerUserId: string
  travelerName: string
  accountHolderName: string
  documentNumber: string
  accountLabel: string
  accountNumber: string
  brebKey: string | null
  isDefault: boolean | null
  verificationStatus: string | null
  verificationNotes: string | null
  verifiedAt: string | null
  createdAt: string | null
}

function AccountBadge({ status }: { status: string | null }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 intra-badge-text ${getPayoutAccountVerificationClasses(status)}`}
    >
      {getPayoutAccountVerificationLabel(status)}
    </span>
  )
}

export default function PayoutAccountsReviewClient({
  payoutAccounts,
}: {
  payoutAccounts: AdminPayoutAccount[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [accountNotesById, setAccountNotesById] = useState<
    Record<string, string>
  >({})

  const counts = useMemo(
    () => ({
      pending: payoutAccounts.filter(
        (account) => account.verificationStatus === "pending",
      ).length,
      verified: payoutAccounts.filter(
        (account) => account.verificationStatus === "verified",
      ).length,
      rejected: payoutAccounts.filter(
        (account) => account.verificationStatus === "rejected",
      ).length,
    }),
    [payoutAccounts],
  )

  const reviewableAccounts = useMemo(
    () =>
      payoutAccounts.filter(
        (account) => account.verificationStatus !== "verified",
      ),
    [payoutAccounts],
  )

  function handleReview(accountId: string, status: "verified" | "rejected") {
    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("accountId", accountId)
      formData.set("status", status)
      formData.set("verificationNotes", accountNotesById[accountId] ?? "")

      const result = await reviewPayoutAccountAction(formData)

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "No pudimos revisar la cuenta.",
        })
        return
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Cuenta revisada.",
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <h2 className="intra-h2">Cuentas</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <AdminMetricCard label="En revisión" value={counts.pending} />
            <AdminMetricCard label="Verificadas" value={counts.verified} />
            <AdminMetricCard label="Rechazadas" value={counts.rejected} />
          </div>
        </div>

        {feedback ? (
          <div className="mt-5">
            <AdminFeedback type={feedback.type}>
              {feedback.message}
            </AdminFeedback>
          </div>
        ) : null}
      </section>

      {reviewableAccounts.length === 0 ? (
        <AdminEmptyState>
          No hay cuentas pendientes de revisión.
        </AdminEmptyState>
      ) : (
        <section className="space-y-4">
          {reviewableAccounts.map((account) => (
            <article
              key={account.id}
              className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="intra-h4">{account.accountHolderName}</h3>
                    <AccountBadge status={account.verificationStatus} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <AdminField label="Usuario">
                      {account.travelerName}
                    </AdminField>
                    <AdminField label="Documento">
                      {account.documentNumber}
                    </AdminField>
                    <AdminField label="Cuenta">
                      <span>{account.accountLabel}</span>
                      <span className="block intra-body text-intra-text-subtle">
                        {account.accountNumber}
                      </span>
                      {account.brebKey ? (
                        <span className="block intra-body text-intra-text-subtle">
                          Llave BRE-B: {account.brebKey}
                        </span>
                      ) : null}
                    </AdminField>
                    <AdminField label="Registrada">
                      {formatDateTime(account.createdAt)}
                    </AdminField>
                  </div>
                </div>

                <div className="w-full max-w-xl space-y-3">
                  <label className="block space-y-2">
                    <span className="intra-body-strong text-intra-blue">
                      Notas de revisión
                    </span>
                    <textarea
                      rows={3}
                      value={
                        accountNotesById[account.id] ??
                        account.verificationNotes ??
                        ""
                      }
                      onChange={(event) =>
                        setAccountNotesById((current) => ({
                          ...current,
                          [account.id]: event.target.value,
                        }))
                      }
                      className="intra-input min-h-[88px] w-full px-4 py-3 intra-body"
                      placeholder="Ej: titular coincide con documento"
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReview(account.id, "verified")}
                      className="intra-btn intra-btn-primary disabled:opacity-50"
                    >
                      Verificar cuenta
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReview(account.id, "rejected")}
                      className="intra-btn intra-btn-secondary border-intra-danger-border text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
