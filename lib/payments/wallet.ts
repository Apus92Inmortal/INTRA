export const VISIBLE_WALLET_MOVEMENT_TYPES = [
  "release_available_credit",
  "payout_paid_debit",
  "refund_pending_debit",
] as const

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
  switch (entryType) {
    case "payment_hold":
      return "Retención temporal creada"
    case "release_pending_debit":
      return "Salida de saldo pendiente"
    case "release_available_credit":
      return "Pago por entrega realizada"
    case "refund_pending_debit":
    case "refund_available_debit":
      return "Devolución al cliente"
    case "payout_paid_debit":
      return "Retiro"
    default:
      return description?.trim() || "Movimiento de wallet"
  }
}

export function getWalletMovementToneLabel(entryType: string | null) {
  switch (entryType) {
    case "release_available_credit":
      return "Pago"
    case "payout_paid_debit":
      return "Retiro"
    case "refund_pending_debit":
    case "refund_available_debit":
      return "Devolución"
    default:
      return "Movimiento"
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
      return "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text"
    case "approved":
      return "border-intra-border-soft bg-intra-info-soft text-intra-info"
    case "rejected":
      return "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
    case "paid":
      return "border-intra-success-border bg-intra-success-soft text-intra-text-success"
    default:
      return "border-intra-border-soft bg-intra-bg-app text-intra-text-subtle"
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
