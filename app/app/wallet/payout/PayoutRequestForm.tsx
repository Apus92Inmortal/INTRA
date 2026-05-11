"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { requestPayoutAction } from "@/app/app/wallet/actions"
import {
  formatCop,
  getPayoutAccountDisplayName,
  getPayoutStatusClasses,
  getPayoutStatusLabel,
  maskAccountNumber,
} from "@/lib/payments/wallet"

type PayoutAccount = {
  id: string
  account_holder_name: string | null
  bank_name: string | null
  account_type: string | null
  account_number: string | null
  breb_key: string | null
  is_default: boolean | null
}

type Payout = {
  id: string
  payout_code: string | null
  amount: number | null
  status: string | null
  requested_at: string | null
  reviewed_at: string | null
  review_notes: string | null
}

export default function PayoutRequestForm({
  payoutAccounts,
  payouts,
  minimumPayout,
  withdrawableBalance,
}: {
  payoutAccounts: PayoutAccount[]
  payouts: Payout[]
  minimumPayout: number
  withdrawableBalance: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState("")
  const [selectedAccount, setSelectedAccount] = useState(
    payoutAccounts.find((account) => account.is_default)?.id ?? payoutAccounts[0]?.id ?? ""
  )
  const [note, setNote] = useState("")
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("amount", amount)
      formData.set("payoutAccountId", selectedAccount)
      formData.set("note", note)

      const result = await requestPayoutAction(formData)

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "No pudimos enviar el retiro." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Solicitud enviada." })
      setAmount("")
      setNote("")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="intra-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="intra-page-title text-2xl sm:text-3xl">Solicitar retiro</h1>
            <p className="mt-1 intra-body text-intra-text-muted sm:text-base">
              Mueve el saldo disponible de tu wallet a una cuenta bancaria o billetera digital.
            </p>
          </div>
          <Link
            href="/app/wallet/payout/accounts"
            className="intra-btn intra-btn-secondary min-h-11 rounded-2xl px-4 py-2.5 text-sm font-semibold"
          >
            Administrar cuentas
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="intra-dashboard-revenue-card rounded-2xl p-5">
            <p className="text-sm text-intra-card/65">Disponible para retirar</p>
            <p className="mt-2 text-3xl font-bold text-intra-card">{formatCop(withdrawableBalance)}</p>
            <p className="mt-2 text-xs text-intra-card/70">
              Ya descontamos solicitudes pendientes o aprobadas para evitar retiros duplicados.
            </p>
          </div>
          <div className="rounded-2xl border border-intra-success-border bg-intra-success-soft p-5">
            <p className="text-sm text-intra-text-success">Retiro mínimo</p>
            <p className="mt-2 text-3xl font-bold text-intra-blue">{formatCop(minimumPayout)}</p>
            <p className="mt-2 text-xs text-intra-text-subtle">Solo procesamos montos desde {formatCop(minimumPayout)}.</p>
          </div>
          <div className="rounded-2xl border border-intra-border-soft bg-intra-bg-app p-5">
            <p className="text-sm text-intra-text-muted">Cuenta principal</p>
            <p className="mt-2 text-base font-semibold text-intra-blue">
              {payoutAccounts.find((account) => account.is_default)
                ? getPayoutAccountDisplayName(payoutAccounts.find((account) => account.is_default)!)
                : "Sin cuenta principal"}
            </p>
              <p className="mt-2 text-xs text-intra-text-muted">
              Si quieres cambiarla, edítala desde Métodos de retiro.
              </p>
          </div>
        </div>

        {payoutAccounts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-intra-border-soft bg-intra-bg-app px-4 py-5 text-sm text-intra-text-subtle">
            Antes de solicitar un retiro debes registrar un método de retiro.
            <Link href="/app/wallet/payout/accounts" className="ml-1 font-semibold text-intra-blue hover:underline">
              Agregar método
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-intra-blue">Monto</span>
                <input
                  inputMode="numeric"
                  min={minimumPayout}
                  step="1000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="10000"
                  className="intra-input"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-intra-blue">Cuenta de retiro</span>
                <select
                  value={selectedAccount}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  className="intra-input"
                >
                  {payoutAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {`${getPayoutAccountDisplayName(account)} · ${maskAccountNumber(account.account_number)}${account.is_default ? " · principal" : ""}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-sm font-semibold text-intra-blue">Nota para revisión (opcional)</span>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ej: procesar esta semana"
                className="intra-input min-h-0"
              />
            </label>

            {feedback ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  feedback.type === "error"
                    ? "border border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                    : "border border-intra-success-border bg-intra-success-soft text-intra-text-success"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isPending || payoutAccounts.length === 0}
                className="intra-btn intra-btn-primary min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {isPending ? "Enviando..." : "Solicitar retiro"}
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(withdrawableBalance > 0 ? Math.floor(withdrawableBalance / 1000) * 1000 : 0))}
                className="intra-btn intra-btn-secondary min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                Usar saldo disponible
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="intra-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="intra-h4">Historial de retiros</h2>
            <p className="mt-1 text-sm text-intra-text-muted">Revisa el estado de cada solicitud.</p>
          </div>
          <Link href="/app/wallet/history" className="intra-link text-sm font-semibold">
            Ver movimientos
          </Link>
        </div>

        {payouts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-intra-border-soft bg-intra-bg-app px-4 py-5 text-sm text-intra-text-muted">
            Aún no has solicitado retiros.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {payouts.map((payout) => (
              <article key={payout.id} className="rounded-2xl border border-intra-border-soft p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-intra-blue">{formatCop(payout.amount)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-intra-text-muted/70">
                      {payout.payout_code || "Sin referencia"}
                    </p>
                    <p className="mt-1 text-sm text-intra-text-muted">
                      Solicitado el {payout.requested_at ? new Date(payout.requested_at).toLocaleDateString("es-CO") : "sin fecha"}
                    </p>
                    {payout.review_notes ? (
                      <p className="mt-2 text-sm text-intra-text-subtle">Nota: {payout.review_notes}</p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getPayoutStatusClasses(
                      payout.status
                    )}`}
                  >
                    {getPayoutStatusLabel(payout.status)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
