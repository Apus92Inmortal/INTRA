"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import {
  deletePayoutAccountAction,
  savePayoutAccountAction,
} from "@/app/app/wallet/actions"
import {
  getPayoutAccountDisplayName,
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
  bankName: string
  accountType: string
  accountNumber: string
  brebKey: string
  isDefault: boolean
}

const EMPTY_FORM: FormState = {
  accountHolderName: "",
  documentNumber: "",
  bankName: "",
  accountType: "nequi",
  accountNumber: "",
  brebKey: "",
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
      formData.set("brebKey", form.brebKey)
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
      <section className="intra-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="intra-page-title text-2xl sm:text-3xl">
              Métodos de retiro
            </h1>
            <p className="mt-1 intra-body text-intra-text-muted sm:text-base">
              Guarda tus métodos para recibir retiros por Nequi, Daviplata o transferencia bancaria.
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="intra-btn intra-btn-secondary min-h-11 rounded-2xl px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar edición
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-intra-blue">Tipo de cuenta</span>
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
              className="intra-input"
            >
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="ahorros">Cuenta de ahorros</option>
              <option value="corriente">Cuenta corriente</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-intra-blue">Titular</span>
            <input
              value={form.accountHolderName}
              onChange={(event) => setForm((current) => ({ ...current, accountHolderName: event.target.value }))}
              className="intra-input"
              placeholder="Nombre completo"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-intra-blue">Documento</span>
            <input
              value={form.documentNumber}
              onChange={(event) => setForm((current) => ({ ...current, documentNumber: event.target.value }))}
              className="intra-input"
              placeholder="Cédula o NIT"
            />
          </label>

          {isBankAccount ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-intra-blue">Banco</span>
              <input
                value={form.bankName}
                onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
                className="intra-input"
                placeholder="Bancolombia, Davivienda..."
              />
            </label>
          ) : (
            <div className="rounded-2xl border border-dashed border-intra-success-border bg-intra-success-soft px-4 py-3 text-sm text-intra-text-success">
              Para {getAccountTypeLabel(form.accountType)}, usaremos el número de celular asociado.
            </div>
          )}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-intra-blue">
              {isBankAccount ? "Número de cuenta" : "Celular asociado"}
            </span>
            <input
              value={form.accountNumber}
              onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))}
              className="intra-input"
              placeholder={isBankAccount ? "000123456789" : "3001234567"}
            />
          </label>

          {isBankAccount ? (
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-intra-blue">Llave BRE-B</span>
              <input
                value={form.brebKey}
                onChange={(event) => setForm((current) => ({ ...current, brebKey: event.target.value }))}
                className="intra-input"
                placeholder="Ej: correo, celular o identificador BRE-B"
              />
              <p className="text-xs text-intra-text-muted">
                Obligatoria para cuentas bancarias. Es la llave que usarán en operación para enviar el retiro.
              </p>
            </label>
          ) : null}

          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-intra-border-soft bg-intra-bg-app px-4 py-3 text-sm text-intra-text-subtle">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
              className="h-4 w-4 rounded border-intra-border text-intra-blue"
            />
            Dejar como método principal para próximos retiros.
          </label>

          {feedback ? (
            <div
              className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                feedback.type === "error"
                  ? "border border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                  : "border border-intra-success-border bg-intra-success-soft text-intra-text-success"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="intra-btn intra-btn-primary min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {isPending ? "Guardando..." : form.id ? "Actualizar cuenta" : "Guardar cuenta"}
            </button>
            <Link
              href="/app/wallet/payout"
              className="intra-btn intra-btn-secondary min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              Ir a retiros
            </Link>
          </div>
        </form>
      </section>

      <section className="intra-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="intra-h4">Métodos guardados</h2>
            <p className="mt-1 text-sm text-intra-text-muted">
              Elige cuál usarás por defecto cuando solicites retiros.
            </p>
          </div>
          <span className="rounded-full bg-intra-bg-app px-3 py-1 text-xs font-semibold text-intra-text-subtle">
            {accounts.length} guardadas
          </span>
        </div>

        {accounts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-intra-border-soft bg-intra-bg-app px-4 py-5 text-sm text-intra-text-muted">
            Aún no tienes cuentas de retiro. Agrega la primera para habilitar solicitudes de pago.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="rounded-2xl border border-intra-border-soft bg-intra-card p-4 transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-intra-blue">
                        {getAccountTypeLabel(account.account_type)}
                      </p>
                      {account.is_default ? (
                        <span className="rounded-full bg-intra-success-soft px-2.5 py-1 text-xs font-semibold text-intra-text-success">
                          Principal
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-intra-text-subtle">
                      {account.account_holder_name || "Sin titular"}
                    </p>
                    <p className="text-sm text-intra-text-muted">
                      {getPayoutAccountDisplayName(account)} · {maskAccountNumber(account.account_number)}
                    </p>
                    {account.breb_key ? (
                      <p className="text-xs text-intra-text-muted">Llave BRE-B: {account.breb_key}</p>
                    ) : null}
                    <p className="text-xs text-intra-text-muted/70">Documento: {account.document_number || "Sin documento"}</p>
                  </div>

                  <div className="flex gap-2 sm:flex-col md:flex-row">
                    <button
                      type="button"
                      onClick={() => handleEdit(account)}
                      className="intra-btn intra-btn-secondary min-h-11 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(account.id)}
                      className="intra-btn min-h-11 rounded-2xl border border-intra-danger-border px-4 py-2.5 text-sm font-semibold text-intra-danger hover:bg-intra-danger-soft"
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
