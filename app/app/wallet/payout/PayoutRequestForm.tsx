"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { AlertCircle, ArrowRight, Building2, FileText, Plus, ShieldCheck, Wallet } from "lucide-react"
import { requestPayoutAction } from "@/app/app/wallet/actions"
import {
  formatCop,
  formatDateTime,
  getCompactPayoutAccountLabel,
  getPayoutInstitutionLabel,
  getPayoutAccountVerificationClasses,
  getPayoutAccountVerificationLabel,
  getPayoutStatusClasses,
  getPayoutStatusLabel,
} from "@/lib/payments/wallet"
import { PAYMENTS_POLICY_DOCUMENT } from "@/lib/legal/documents"
import { LegalDocumentModal } from "@/components/legal-document-modal"

type PayoutAccount = {
  id: string
  account_holder_name: string | null
  bank_name: string | null
  account_type: string | null
  account_number: string | null
  breb_key: string | null
  is_default: boolean | null
  verification_status?: string | null
  verification_notes?: string | null
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

type LegalModalKey = "payments-policy"

const legalDocuments = {
  "payments-policy": PAYMENTS_POLICY_DOCUMENT,
} satisfies Record<LegalModalKey, typeof PAYMENTS_POLICY_DOCUMENT>

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
  identityVerificationStatus,
  payoutVerificationLevel,
}: {
  payoutAccounts: PayoutAccount[]
  payouts: Payout[]
  minimumPayout: number
  withdrawableBalance: number
  identityVerificationStatus: string | null
  payoutVerificationLevel: string | null
}) {
  const router = useRouter()
  const initialPayoutAccount =
    payoutAccounts.find((account) => account.is_default && account.verification_status === "verified")?.id ??
    payoutAccounts.find((account) => account.verification_status === "verified")?.id ??
    ""
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState("")
  const [selectedAccount, setSelectedAccount] = useState(initialPayoutAccount)
  const [acceptedPaymentPolicy, setAcceptedPaymentPolicy] = useState(false)
  const [legalModalKey, setLegalModalKey] = useState<LegalModalKey | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const verifiedAccounts = useMemo(
    () => payoutAccounts.filter((account) => account.verification_status === "verified"),
    [payoutAccounts]
  )

  const defaultAccount = useMemo(
    () =>
      verifiedAccounts.find((account) => account.is_default) ??
      verifiedAccounts[0] ??
      payoutAccounts.find((account) => account.is_default) ??
      payoutAccounts[0] ??
      null,
    [payoutAccounts, verifiedAccounts]
  )
  const normalizedSelectedAccount = verifiedAccounts.some((account) => account.id === selectedAccount)
    ? selectedAccount
    : verifiedAccounts[0]?.id ?? ""
  const hasVerifiedIdentity = identityVerificationStatus === "verified"
  const isPayoutVerified = payoutVerificationLevel === "payout_verified"
  const hasVerifiedPayoutAccount = verifiedAccounts.length > 0
  const canRequestPayout =
    isPayoutVerified &&
    hasVerifiedPayoutAccount &&
    withdrawableBalance >= minimumPayout &&
    Boolean(normalizedSelectedAccount)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)

    if (!canRequestPayout) {
      setFeedback({
        type: "error",
        message: "Completa la verificacion para retiros y usa una cuenta verificada antes de solicitar el pago.",
      })
      return
    }

    if (!acceptedPaymentPolicy) {
      setFeedback({
        type: "error",
        message: "Debes aceptar la Política de Pagos para solicitar el retiro.",
      })
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set("amount", amount)
      formData.set("payoutAccountId", normalizedSelectedAccount)
      formData.set("paymentPolicyAccepted", String(acceptedPaymentPolicy))

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
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-[#667085] sm:block sm:text-[14px]">
              Una vez solicitado, el retiro puede tardar entre 24 y 72 horas hábiles.
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
                  {defaultAccount ? getPayoutInstitutionLabel(defaultAccount) : "Sin cuenta principal"}
                </p>
                {defaultAccount?.verification_status ? (
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getPayoutAccountVerificationClasses(
                      defaultAccount.verification_status
                    )}`}
                  >
                    {getPayoutAccountVerificationLabel(defaultAccount.verification_status)}
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </section>

      {!isPayoutVerified ? (
        <section className="rounded-[20px] border border-[#FDE7B2] bg-[#FFF9EC] px-5 py-4 text-sm leading-6 text-[#8A6C12]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-4 w-4 shrink-0" strokeWidth={1.9} />
            <div>
              <p className="font-semibold text-[#0B2C4A]">Tu retiro aun no esta habilitado.</p>
              <p>
                Necesitas identidad verificada y una cuenta de retiro aprobada por INTRA. Estado de identidad:{" "}
                {hasVerifiedIdentity ? "verificada" : "pendiente"}.
              </p>
            </div>
          </div>
        </section>
      ) : null}

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
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold leading-tight text-[#0B2C4A]">Solicita tu retiro</h2>
              <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-[#667085] sm:block">
                Elige la cuenta de destino, define el monto y deja una nota opcional para revisión manual.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EFFBF4] px-3 py-1.5 text-xs font-semibold text-[#1C7C45]">
                <span className="h-2 w-2 rounded-full bg-[#2ECC71]" />
                Retiro mínimo: {formatCop(minimumPayout)}
              </div>
            </div>

            <Link
              href="/app/wallet/payout/accounts"
              className="intra-btn intra-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-2xl border-[var(--intra-border)] bg-[var(--intra-bg-app)] px-4 py-2.5 text-sm font-semibold text-[var(--intra-blue)] shadow-sm transition hover:bg-[var(--intra-card)] lg:mt-0 lg:self-start"
            >
              <Building2 className="h-4 w-4" strokeWidth={1.9} />
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
                  value={normalizedSelectedAccount}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  disabled={!hasVerifiedPayoutAccount}
                  className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
                >
                  {verifiedAccounts.length === 0 ? (
                    <option value="">No tienes cuentas verificadas</option>
                  ) : null}
                  {verifiedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {getCompactPayoutAccountLabel(account)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-start gap-3 rounded-[16px] border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-sm leading-6 text-[#667085]">
              <input
                id="payout-payment-policy-acceptance"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[#D0D5DD] text-[#1C7C45] focus:ring-[#1C7C45]"
                checked={acceptedPaymentPolicy}
                onChange={(event) => setAcceptedPaymentPolicy(event.target.checked)}
                aria-describedby="payout-payment-policy-label"
              />
              <span id="payout-payment-policy-label">
                <label htmlFor="payout-payment-policy-acceptance">Acepto la </label>
                <button
                  type="button"
                  onClick={() => setLegalModalKey("payments-policy")}
                  className="font-semibold text-[#1C7C45] underline underline-offset-4"
                >
                  Política de Pagos, Retenciones, Reembolsos y Disputas
                </button>
                .
              </span>
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
                disabled={isPending || !canRequestPayout || !acceptedPaymentPolicy}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27AE60] disabled:opacity-60"
              >
                {isPending ? "Enviando..." : "Solicitar retiro"}
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

      <LegalDocumentModal
        documentKey={legalModalKey}
        documents={legalDocuments}
        titleId="payout-legal-modal-title"
        onClose={() => setLegalModalKey(null)}
        onAcceptAndContinue={() => {
          setAcceptedPaymentPolicy(true)
          setLegalModalKey(null)
        }}
      />
    </div>
  )
}
