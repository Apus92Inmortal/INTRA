"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
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
  is_default: boolean | null
}

type FormState = {
  id?: string
  accountHolderName: string
  documentNumber: string
  bankName: string
  accountType: string
  accountNumber: string
  isDefault: boolean
}

const EMPTY_FORM: FormState = {
  accountHolderName: "",
  documentNumber: "",
  bankName: "",
  accountType: "nequi",
  accountNumber: "",
  isDefault: true,
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

  const isBankAccount = useMemo(
    () => form.accountType === "ahorros" || form.accountType === "corriente",
    [form.accountType]
  )

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
      formData.set("accountHolderName", form.accountHolderName)
      formData.set("documentNumber", form.documentNumber)
      formData.set("bankName", form.bankName)
      formData.set("accountType", form.accountType)
      formData.set("accountNumber", form.accountNumber)
      formData.set("isDefault", String(form.isDefault))

      const result = await savePayoutAccountAction(formData)

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "No pudimos guardar la cuenta." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Cuenta guardada." })
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
      bankName: account.bank_name ?? "",
      accountType: account.account_type ?? "nequi",
      accountNumber: account.account_number ?? "",
      isDefault: Boolean(account.is_default),
    })
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta cuenta de retiro?")) {
      return
    }

    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("id", id)

      const result = await deletePayoutAccountAction(formData)

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "No pudimos eliminar la cuenta." })
        return
      }

      setFeedback({ type: "success", message: result.message ?? "Cuenta eliminada." })
      if (form.id === id) {
        resetForm()
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2C4A] sm:text-3xl">
              Cuentas de retiro
            </h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Guarda tus métodos para recibir pagos por Nequi, Daviplata o transferencia bancaria.
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar edición
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[#0B2C4A]">Tipo de cuenta</span>
            <select
              value={form.accountType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  accountType: event.target.value,
                  bankName:
                    event.target.value === "nequi"
                      ? "Nequi"
                      : event.target.value === "daviplata"
                        ? "Daviplata"
                        : current.bankName,
                }))
              }
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
            >
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="ahorros">Cuenta de ahorros</option>
              <option value="corriente">Cuenta corriente</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#0B2C4A]">Titular</span>
            <input
              value={form.accountHolderName}
              onChange={(event) => setForm((current) => ({ ...current, accountHolderName: event.target.value }))}
              className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
              placeholder="Nombre completo"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#0B2C4A]">Documento</span>
            <input
              value={form.documentNumber}
              onChange={(event) => setForm((current) => ({ ...current, documentNumber: event.target.value }))}
              className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
              placeholder="Cédula o NIT"
            />
          </label>

          {isBankAccount ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#0B2C4A]">Banco</span>
              <input
                value={form.bankName}
                onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
                className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
                placeholder="Bancolombia, Davivienda..."
              />
            </label>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#A3E4BF] bg-[#EFFBF4] px-4 py-3 text-sm text-[#1e8c4e]">
              Para {getAccountTypeLabel(form.accountType)}, usaremos el número de celular asociado.
            </div>
          )}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#0B2C4A]">
              {isBankAccount ? "Número de cuenta" : "Celular asociado"}
            </span>
            <input
              value={form.accountNumber}
              onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))}
              className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0B2C4A]"
              placeholder={isBankAccount ? "000123456789" : "3001234567"}
            />
          </label>

          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-[#0B2C4A]"
            />
            Dejar como cuenta principal para próximos retiros.
          </label>

          {feedback ? (
            <div
              className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                feedback.type === "error"
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-[#A3E4BF] bg-[#EFFBF4] text-[#1e8c4e]"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {isPending ? "Guardando..." : form.id ? "Actualizar cuenta" : "Guardar cuenta"}
            </button>
            <Link
              href="/app/wallet/payout"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ir a retiros
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0B2C4A]">Métodos guardados</h2>
            <p className="mt-1 text-sm text-slate-500">
              Elige cuál usarás por defecto cuando solicites retiros.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {accounts.length} guardadas
          </span>
        </div>

        {accounts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Aún no tienes cuentas de retiro. Agrega la primera para habilitar solicitudes de pago.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#0B2C4A]">
                        {getAccountTypeLabel(account.account_type)}
                      </p>
                      {account.is_default ? (
                        <span className="rounded-full bg-[#EFFBF4] px-2.5 py-1 text-xs font-semibold text-[#1e8c4e]">
                          Principal
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-600">
                      {account.account_holder_name || "Sin titular"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {account.bank_name || getAccountTypeLabel(account.account_type)} · {maskAccountNumber(account.account_number)}
                    </p>
                    <p className="text-xs text-slate-400">Documento: {account.document_number || "Sin documento"}</p>
                  </div>

                  <div className="flex gap-2 sm:flex-col md:flex-row">
                    <button
                      type="button"
                      onClick={() => handleEdit(account)}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(account.id)}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
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
  )
}
