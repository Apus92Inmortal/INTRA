export function formatCop(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value

  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) {
    return "$0"
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numeric)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Fecha inválida"
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function getLedgerEntryLabel(entryType: string | null, description?: string | null) {
  if (description?.trim()) {
    return description
  }

  switch (entryType) {
    case "payment_hold":
      return "Retención temporal creada"
    case "release_pending_debit":
      return "Salida de saldo pendiente"
    case "release_available_credit":
      return "Saldo disponible por entrega completada"
    case "refund_pending_debit":
      return "Ajuste por reembolso en saldo pendiente"
    case "refund_available_debit":
      return "Ajuste por reembolso en saldo disponible"
    case "payout_paid_debit":
      return "Retiro pagado"
    default:
      return "Movimiento de wallet"
  }
}

export function getLedgerTypeLabel(balanceType: string | null) {
  switch (balanceType) {
    case "available":
      return "Disponible"
    case "pending":
      return "Pendiente"
    default:
      return "Saldo"
  }
}

export function getDirectionLabel(direction: string | null) {
  switch (direction) {
    case "credit":
      return "Entrada"
    case "debit":
      return "Salida"
    default:
      return "Movimiento"
  }
}

export function getPayoutStatusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "Pendiente"
    case "approved":
      return "Aprobado"
    case "rejected":
      return "Rechazado"
    case "paid":
      return "Pagado"
    default:
      return status ?? "Sin estado"
  }
}

export function getPayoutStatusClasses(status: string | null) {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "approved":
      return "border-sky-200 bg-sky-50 text-sky-700"
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700"
    case "paid":
      return "border-[#A3E4BF] bg-[#EFFBF4] text-[#1e8c4e]"
    default:
      return "border-slate-200 bg-slate-50 text-slate-700"
  }
}

export function getAccountTypeLabel(accountType: string | null) {
  switch (accountType) {
    case "ahorros":
      return "Cuenta de ahorros"
    case "corriente":
      return "Cuenta corriente"
    case "nequi":
      return "Nequi"
    case "daviplata":
      return "Daviplata"
    default:
      return "Cuenta bancaria"
  }
}

export function getPayoutAccountDisplayName(input: {
  bank_name?: string | null
  account_type?: string | null
}) {
  const accountTypeLabel = getAccountTypeLabel(input.account_type ?? null)

  if (input.account_type === "nequi" || input.account_type === "daviplata") {
    return input.bank_name || accountTypeLabel
  }

  if (input.bank_name?.trim()) {
    return `${input.bank_name.trim()} · ${accountTypeLabel}`
  }

  return accountTypeLabel
}

export function maskAccountNumber(accountNumber: string | null | undefined) {
  const cleaned = (accountNumber ?? "").replace(/\s+/g, "")

  if (!cleaned) {
    return "Sin número"
  }

  if (cleaned.length <= 4) {
    return cleaned
  }

  return `${"•".repeat(Math.max(cleaned.length - 4, 2))}${cleaned.slice(-4)}`
}

export function getPaymentResultLabel(status: string | null) {
  switch (status) {
    case "held":
      return "Pago retenido"
    case "released":
      return "Pago liberado"
    case "processing":
      return "Pago en proceso"
    case "failed":
      return "Pago fallido"
    case "cancelled":
      return "Pago cancelado"
    default:
      return status ?? "Estado no disponible"
  }
}

export function getOpenPayoutAmount(items: Array<{ status: string | null; amount: number | null }> | null | undefined) {
  return (items ?? []).reduce((sum, item) => {
    if (item.status === "pending" || item.status === "approved") {
      return sum + Number(item.amount ?? 0)
    }

    return sum
  }, 0)
}
