const READY_PAYMENT_STATUSES = new Set(["held", "released"])
const RETRYABLE_PAYMENT_STATUSES = new Set(["failed", "cancelled", "canceled"])

function normalizeStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() ?? ""
}

export function isShipmentPaymentReady(status: string | null | undefined) {
  return READY_PAYMENT_STATUSES.has(normalizeStatus(status))
}

export function isShipmentPaymentRetryable(status: string | null | undefined) {
  return RETRYABLE_PAYMENT_STATUSES.has(normalizeStatus(status))
}

export function getPendingPaymentLabel(status: string | null | undefined) {
  const normalized = normalizeStatus(status)

  if (!normalized || normalized === "pending") {
    return "Pendiente de pago"
  }

  if (normalized === "failed") {
    return "Pago fallido"
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "Pago cancelado"
  }

  return "Pendiente de pago"
}
