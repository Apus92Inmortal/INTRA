"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition, type ReactNode } from "react"
import {
  Check,
  ChevronLeft,
  CreditCard,
  Info,
  PencilLine,
  Trash2,
  Wallet,
} from "lucide-react"
import {
  deletePayoutAccountAction,
  savePayoutAccountAction,
} from "@/app/app/wallet/actions"
import {
  getAccountTypeLabel,
  maskAccountNumber,
} from "@/lib/payments/wallet"

type PayoutAccount = {
  id: string
  account_holder_name: string | null
  document_number: string | null
  bank_name: string | null
  account_type: string | null
  account_number: string | null
  breb_key: string | null
  is_default: boolean | null
}

type FormState = {
  id?: string
  accountHolderName: string
  documentNumber: string
  accountType: string
  accountNumber: string
  brebKey: string
  isDefault: boolean
}

const ACCOUNT_OPTIONS = [
  { value: "nequi", label: "Nequi" },
  { value: "daviplata", label: "Daviplata" },
  { value: "ahorros", label: "Cuenta de ahorros" },
  { value: "corriente", label: "Cuenta corriente" },
] as const

const EMPTY_FORM: FormState = {
  accountHolderName: "",
  documentNumber: "",
  accountType: "",
  accountNumber: "",
  brebKey: "",
  isDefault: true,
}

function SurfaceIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFFBF4] text-[#2ECC71]">
      {children}
    </div>
  )
}

function getAccountsBadgeLabel(count: number) {
  if (count === 0) {
    return "0 guardados"
  }

  if (count === 1) {
    return "1 guardado"
  }

  return `${count} guardados`
}

export default function PayoutAccountsManager({
  accounts,
}: {
  accounts: PayoutAccount[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    isDefault: accounts.length === 0,
  }))

  const accountsBadgeLabel = useMemo(() => getAccountsBadgeLabel(accounts.length), [accounts.length])

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      isDefault: accounts.length === 0,
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      if (form.id) {
        formData.set("id", form.id)
      }

      const derivedBankName =
        form.accountType === "nequi"
          ? "Nequi"
          : form.accountType === "daviplata"
            ? "Daviplata"
            : ""

      formData.set("accountHolderName", form.accountHolderName)
      formData.set("documentNumber", form.documentNumber)
      formData.set("bankName", derivedBankName)
      formData.set("accountType", form.accountType)
      formData.set("accountNumber", form.accountNumber)
      formData.set("brebKey", form.brebKey)
      formData.set("isDefault", String(form.isDefault))

      const result = await savePayoutAccountAction(formData)

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "No pudimos guardar el método." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Método guardado." })
      resetForm()
      router.refresh()
    })
  }

  function handleEdit(account: PayoutAccount) {
    setFeedback(null)
    setForm({
      id: account.id,
      accountHolderName: account.account_holder_name ?? "",
      documentNumber: account.document_number ?? "",
      accountType: account.account_type ?? "",
      accountNumber: account.account_number ?? "",
      brebKey: account.breb_key ?? "",
      isDefault: Boolean(account.is_default),
    })
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este método de retiro?")) {
      return
    }

    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("id", id)

      const result = await deletePayoutAccountAction(formData)

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "No pudimos eliminar el método." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Método eliminado." })
      if (form.id === id) {
        resetForm()
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-5 text-[#0B2C4A]">
      <header>
        <h1 className="text-[28px] font-semibold leading-tight text-[#0B2C4A]">Métodos de retiro</h1>
        <p className="mt-1 text-sm leading-6 text-[#667085] sm:text-[14px]">
          Agrega tu cuenta para recibir tus retiros cuando tengas saldo disponible.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-start">
        <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <SurfaceIcon>
                <Wallet className="h-5 w-5" strokeWidth={1.9} />
              </SurfaceIcon>
              <div>
                <h2 className="text-[18px] font-semibold leading-tight text-[#0B2C4A]">Agregar método de retiro</h2>
                {form.id ? (
                  <p className="mt-1 text-sm text-[#667085]">Estás editando un método guardado.</p>
                ) : null}
              </div>
            </div>

            {form.id ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F9FAFB]"
              >
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#0B2C4A]">Tipo de cuenta</span>
              <select
                value={form.accountType}
                onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value }))}
                className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
              >
                <option value="">Selecciona una opción</option>
                {ACCOUNT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#0B2C4A]">Titular</span>
                <input
                  value={form.accountHolderName}
                  onChange={(event) => setForm((current) => ({ ...current, accountHolderName: event.target.value }))}
                  className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
                  placeholder="Nombre completo"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#0B2C4A]">Documento</span>
                <input
                  value={form.documentNumber}
                  onChange={(event) => setForm((current) => ({ ...current, documentNumber: event.target.value }))}
                  className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
                  placeholder="Cédula o NIT"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#0B2C4A]">Número de cuenta o celular</span>
                <input
                  value={form.accountNumber}
                  onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))}
                  className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
                  placeholder="Ej. 300 123 4567"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#0B2C4A]">Llave Bre-B</span>
                <input
                  value={form.brebKey}
                  onChange={(event) => setForm((current) => ({ ...current, brebKey: event.target.value }))}
                  className="intra-input min-h-11 rounded-2xl border-[#E4E7EC] px-4"
                  placeholder="Correo, celular o identificador"
                />
              </label>
            </div>

            <div className="flex items-start gap-2 rounded-[16px] text-sm text-[#667085]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#667085]" strokeWidth={1.9} />
              <p>Usaremos esta información para enviarte tus retiros.</p>
            </div>

            <label className="flex items-start gap-3 rounded-[18px] border border-[#E4E7EC] bg-[#F9FCFA] px-4 py-3.5">
              <button
                type="button"
                role="switch"
                aria-checked={form.isDefault}
                onClick={() => setForm((current) => ({ ...current, isDefault: !current.isDefault }))}
                className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                  form.isDefault ? "bg-[#2ECC71]" : "bg-[#D0D5DD]"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    form.isDefault ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-semibold text-[#0B2C4A]">Usar como método principal</p>
                <p className="mt-1 text-sm text-[#667085]">Será el método predeterminado para tus retiros.</p>
              </div>
            </label>

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

            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
              <Link
                href="/app/wallet/payout"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F9FAFB]"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.9} />
                Volver a retiros
              </Link>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27AE60] disabled:opacity-60"
              >
                {isPending ? null : <Check className="h-4 w-4" strokeWidth={2} />}
                {isPending ? "Guardando..." : "Guardar método"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold leading-tight text-[#0B2C4A]">Métodos guardados</h2>
            <span className="inline-flex rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-bold text-[#667085]">
              {accountsBadgeLabel}
            </span>
          </div>

          {accounts.length === 0 ? (
            <div className="mt-5 flex min-h-[320px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#E4E7EC] bg-[#FCFDFD] px-6 py-10 text-center">
              <SurfaceIcon>
                <CreditCard className="h-5 w-5" strokeWidth={1.9} />
              </SurfaceIcon>
              <h3 className="mt-5 text-[18px] font-semibold leading-tight text-[#0B2C4A]">
                Aún no tienes métodos guardados
              </h3>
              <p className="mt-3 max-w-[280px] text-sm leading-6 text-[#667085]">
                Agrega tu primer método de retiro para poder solicitar pagos cuando tengas saldo disponible.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {accounts.map((account) => (
                <article key={account.id} className="rounded-[20px] border border-[#E4E7EC] bg-white p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#0B2C4A]">
                            {getAccountTypeLabel(account.account_type)}
                          </p>
                          {account.is_default ? (
                            <span className="inline-flex rounded-full bg-[#EFFBF4] px-2.5 py-1 text-xs font-bold text-[#1C7C45]">
                              Principal
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-[#667085]">{account.account_holder_name || "Sin titular"}</p>
                        <p className="mt-1 text-sm text-[#667085]">
                          {account.document_number || "Sin documento"} · {maskAccountNumber(account.account_number)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleEdit(account)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F9FAFB]"
                      >
                        <PencilLine className="h-4 w-4" strokeWidth={1.9} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(account.id)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-intra-danger-border bg-white px-4 py-2.5 text-sm font-semibold text-intra-danger transition hover:bg-intra-danger-soft"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
