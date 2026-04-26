export type PaymentQuote = {
  success: boolean
  error?: string
  traveler_amount?: number
  gross_amount?: number
  amount?: number
  gateway_fee_estimated?: number
  intra_fee?: number
  net_amount_received?: number
  minimum_amount?: number
  minimum_payout?: number
  dispute_window_hours?: number
  dispute_sla_hours?: number
  auto_release_hours?: number
  currency?: string
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function parsePaymentQuote(data: unknown): PaymentQuote | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const raw = data as Record<string, unknown>

  return {
    success: raw.success === true,
    error: typeof raw.error === "string" ? raw.error : undefined,
    traveler_amount: toNumber(raw.traveler_amount),
    gross_amount: toNumber(raw.gross_amount),
    amount: toNumber(raw.amount),
    gateway_fee_estimated: toNumber(raw.gateway_fee_estimated),
    intra_fee: toNumber(raw.intra_fee),
    net_amount_received: toNumber(raw.net_amount_received),
    minimum_amount: toNumber(raw.minimum_amount),
    minimum_payout: toNumber(raw.minimum_payout),
    dispute_window_hours: toNumber(raw.dispute_window_hours),
    dispute_sla_hours: toNumber(raw.dispute_sla_hours),
    auto_release_hours: toNumber(raw.auto_release_hours),
    currency: typeof raw.currency === "string" ? raw.currency : undefined,
  }
}
