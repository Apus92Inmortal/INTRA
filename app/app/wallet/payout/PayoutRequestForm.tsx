"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { ArrowRight, Building2, FileText, Plus, ShieldCheck, Wallet } from "lucide-react"
import { requestPayoutAction } from "@/app/app/wallet/actions"
import {
  formatCop,
  formatDateTime,
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

function SurfaceIcon({
  children,
  tone = "blue",
  shape = "square",
}: {
  children: ReactNode
  tone?: "blue" | "green" | "neutral"
  shape?: "square" | "circle"
}) {
  const toneClass =
    tone === "green"
      ? "bg-[#EFFBF4] text-[#2ECC71]"
      : tone === "neutral"
        ? "bg-[#F2F4F7] text-[#667085]"
        : "bg-[#0B2C4A]/8 text-[#0B2C4A]"

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-2xl"

  return (
    <div className={`flex h-12 w-12 items-center justify-center ${shapeClass} ${toneClass}`}>
      {children}
    </div>
  )
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
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const defaultAccount = useMemo(
    () => payoutAccounts.find((account) => account.is_default) ?? payoutAccounts[0] ?? null,
    [payoutAccounts]
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("amount", amount)
      formData.set("payoutAccountId", selectedAccount)

      const result = await requestPayoutAction(formData)

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "No pudimos enviar el retiro." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Solicitud enviada." })
      setAmount("")
      router.refresh()
    })
  }

  return (
    <div className="space-y-5 text-[#0B2C4A]">
      <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-[#0B2C4A]">Solicitar retiro</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085] sm:text-[14px]">
              Mueve el saldo disponible de tu wallet a una cuenta bancaria o billetera digital.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#EFFBF4] px-4 py-2 text-xs font-semibold text-[#1C7C45]">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.9} />
            Retiros seguros y manuales
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="rounded-[16px] border border-[#E4E7EC] bg-white p-6">
            <div className="flex items-center gap-4">
              <SurfaceIcon tone="blue" shape="circle">
                <Wallet className="h-5 w-5" strokeWidth={1.9} />
              </SurfaceIcon>
              <div>
                <p className="text-sm font-medium text-[#667085]">Disponible para retirar</p>
                <p className="mt-2 text-[30px] font-semibold leading-none text-[#0B2C4A]">
                  {formatCop(withdrawableBalance)}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[16px] border border-[#E4E7EC] bg-white p-6">
            <div className="flex items-center gap-4">
              <SurfaceIcon tone="neutral" shape="circle">
                <Building2 className="h-5 w-5" strokeWidth={1.9} />
              </SurfaceIcon>
              <div>
                <p className="text-sm font-medium text-[#667085]">Cuenta principal</p>
                <p className="mt-2 text-lg font-semibold leading-snug text-[#0B2C4A]">
                  {defaultAccount ? getPayoutAccountDisplayName(defaultAccount) : "Sin cuenta principal"}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {payoutAccounts.length === 0 ? (
        <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <SurfaceIcon tone="green">
                <Wallet className="h-6 w-6" strokeWidth={1.9} />
              </SurfaceIcon>

              <h2 className="mt-6 text-[22px] font-semibold leading-tight text-[#0B2C4A]">
                Aún no tienes un método de retiro registrado
              </h2>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EFFBF4] px-3 py-1.5 text-xs font-semibold text-[#1C7C45]">
                <span className="h-2 w-2 rounded-full bg-[#2ECC71]" />
                Retiro mínimo: {formatCop(minimumPayout)}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:mt-[68px] xl:shrink-0 xl:justify-end">
              <Link
                href="/app/wallet/payout/accounts"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27AE60] sm:w-auto whitespace-nowrap"
              >
                <Plus className="h-4 w-4" strokeWidth={1.9} />
                Agregar método de retiro
              </Link>
              <Link
                href="/app/wallet/payout/accounts"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F9FAFB] sm:w-auto whitespace-nowrap"
              >
                <Building2 className="h-4 w-4" strokeWidth={1.9} />
                Administrar cuentas
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),auto] lg:items-start">
            <div>
              <h2 className="text-[22px] font-semibold leading-tight text-[#0B2C4A]">Solicita tu retiro</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                Elige la cuenta de destino, define el monto y deja una nota opcional para revisión manual.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EFFBF4] px-3 py-1.5 text-xs font-semibold text-[#1C7C45]">
                <span className="h-2 w-2 rounded-full bg-[#2ECC71]" />
                Retiro mínimo: {formatCop(minimumPayout)}
              </div>
            </div>

            <Link
              href="/app/wallet/payout/accounts"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F9FAFB]"
            >
              Administrar cuentas
            </Link>
          </div>

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
                  className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#0B2C4A]">Cuenta de retiro</span>
                <select
                  value={selectedAccount}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
                >
                  {payoutAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {`${getPayoutAccountDisplayName(account)} · ${maskAccountNumber(account.account_number)}${account.is_default ? " · principal" : ""}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {feedback ? (
              <div
                className={`rounded-[16px] px-4 py-3 text-sm ${
                  feedback.type === "error"
                    ? "border border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                    : "border border-[#B7E4C7] bg-[#EFFBF4] text-[#1C7C45]"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                disabled={isPending || payoutAccounts.length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27AE60] disabled:opacity-60"
              >
                {isPending ? "Enviando..." : "Solicitar retiro"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setAmount(String(withdrawableBalance > 0 ? Math.floor(withdrawableBalance / 1000) * 1000 : 0))
                }
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F9FAFB]"
              >
                Usar saldo disponible
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold leading-tight text-[#0B2C4A]">Historial de retiros</h2>
            <p className="mt-2 hidden text-sm leading-6 text-[#667085] sm:block">
              Revisa el estado y detalle de cada solicitud de retiro.
            </p>
          </div>

          <Link
            href="/app/wallet/history"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B2C4A] transition hover:text-[#1C4C75]"
          >
            Ver movimientos
            <ArrowRight className="h-4 w-4" strokeWidth={1.9} />
          </Link>
        </div>

        {payouts.length === 0 ? (
          <div className="mt-6 rounded-[16px] border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F4F7] text-[#667085]">
              <FileText className="h-6 w-6" strokeWidth={1.9} />
            </div>
            <h3 className="mt-4 text-[18px] font-semibold text-[#0B2C4A]">Aún no tienes retiros solicitados</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Cuando hagas tu primer retiro, lo verás reflejado aquí.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {payouts.map((payout) => (
              <article key={payout.id} className="rounded-[16px] border border-[#E4E7EC] bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[18px] font-semibold text-[#0B2C4A]">{formatCop(payout.amount)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                      {payout.payout_code || "Sin referencia"}
                    </p>
                    <p className="mt-2 text-sm text-[#667085]">
                      Solicitado el {formatDateTime(payout.requested_at)}
                    </p>
                    {payout.review_notes ? (
                      <p className="mt-2 text-sm text-[#667085]">Nota: {payout.review_notes}</p>
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
