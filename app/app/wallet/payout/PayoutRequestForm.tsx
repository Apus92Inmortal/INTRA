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
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2C4A] sm:text-3xl">Solicitar retiro</h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Mueve tu saldo disponible a una cuenta bancaria o billetera digital.
            </p>
          </div>
          <Link
            href="/app/wallet/payout/accounts"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Administrar cuentas
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-[#0B2C4A] p-5 text-white">
            <p className="text-sm text-white/65">Disponible para retirar</p>
            <p className="mt-2 text-3xl font-bold">{formatCop(withdrawableBalance)}</p>
            <p className="mt-2 text-xs text-white/70">
              Ya descontamos solicitudes pendientes o aprobadas para evitar retiros duplicados.
            </p>
          </div>
          <div className="rounded-2xl border border-[#A3E4BF] bg-[#EFFBF4] p-5">
            <p className="text-sm text-[#1e8c4e]">Retiro mínimo</p>
            <p className="mt-2 text-3xl font-bold text-[#0B2C4A]">{formatCop(minimumPayout)}</p>
            <p className="mt-2 text-xs text-slate-600">Solo procesamos montos desde {formatCop(minimumPayout)}.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Cuenta principal</p>
            <p className="mt-2 text-base font-semibold text-[#0B2C4A]">
              {payoutAccounts.find((account) => account.is_default)
                ? getPayoutAccountDisplayName(payoutAccounts.find((account) => account.is_default)!)
                : "Sin cuenta principal"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Si quieres cambiarla, edítala desde Cuentas de retiro.
            </p>
          </div>
        </div>

        {payoutAccounts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            Antes de solicitar un retiro debes registrar una cuenta.
            <Link href="/app/wallet/payout/accounts" className="ml-1 font-semibold text-[#0B2C4A] hover:underline">
              Agregar cuenta
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#0B2C4A]">Monto</span>
                <input
                  inputMode="numeric"
                  min={minimumPayout}
                  step="1000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="10000"
                  className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#0B2C4A]">Cuenta de retiro</span>
                <select
                  value={selectedAccount}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
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
              <span className="text-sm font-semibold text-[#0B2C4A]">Nota para revisión (opcional)</span>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ej: pagar esta semana"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
              />
            </label>

            {feedback ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  feedback.type === "error"
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-[#A3E4BF] bg-[#EFFBF4] text-[#1e8c4e]"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isPending || payoutAccounts.length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {isPending ? "Enviando..." : "Solicitar retiro"}
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(withdrawableBalance > 0 ? Math.floor(withdrawableBalance / 1000) * 1000 : 0))}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Usar saldo disponible
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0B2C4A]">Historial de retiros</h2>
            <p className="mt-1 text-sm text-slate-500">Revisa el estado de cada solicitud.</p>
          </div>
          <Link href="/app/wallet/history" className="text-sm font-semibold text-[#0B2C4A] hover:underline">
            Ver movimientos
          </Link>
        </div>

        {payouts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Aún no has solicitado retiros.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {payouts.map((payout) => (
              <article key={payout.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#0B2C4A]">{formatCop(payout.amount)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Solicitado el {payout.requested_at ? new Date(payout.requested_at).toLocaleDateString("es-CO") : "sin fecha"}
                    </p>
                    {payout.review_notes ? (
                      <p className="mt-2 text-sm text-slate-600">Nota: {payout.review_notes}</p>
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
