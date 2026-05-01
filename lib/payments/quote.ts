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

export type RouteCategory = "short" | "medium" | "long"

export const ROUTE_PRICING_BY_CATEGORY: Record<
  RouteCategory,
  { travelerAmount: number; customerAmount: number }
> = {
  short: { travelerAmount: 16000, customerAmount: 20000 },
  medium: { travelerAmount: 20000, customerAmount: 25000 },
  long: { travelerAmount: 28000, customerAmount: 35000 },
}

const WOMPI_EFFECTIVE_PERCENT = 3.1535
const WOMPI_FIXED_FEE = 833
const DEFAULT_MINIMUM_AMOUNT = 20000
const DEFAULT_MINIMUM_PAYOUT = 10000
const DEFAULT_DISPUTE_WINDOW_HOURS = 24
const DEFAULT_DISPUTE_SLA_HOURS = 72
const DEFAULT_AUTO_RELEASE_HOURS = 48

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

export function isRouteCategory(value: string | null | undefined): value is RouteCategory {
  return value === "short" || value === "medium" || value === "long"
}

export function buildFixedRouteQuote(routeCategory: RouteCategory): PaymentQuote {
  const pricing = ROUTE_PRICING_BY_CATEGORY[routeCategory]
  const gatewayFee = Math.ceil(
    pricing.customerAmount * (WOMPI_EFFECTIVE_PERCENT / 100) + WOMPI_FIXED_FEE
  )
  const intraFee = pricing.customerAmount - pricing.travelerAmount - gatewayFee

  return {
    success: intraFee >= 0,
    error: intraFee >= 0 ? undefined : "invalid_route_margin",
    traveler_amount: pricing.travelerAmount,
    gross_amount: pricing.customerAmount,
    amount: pricing.customerAmount,
    gateway_fee_estimated: gatewayFee,
    intra_fee: intraFee,
    net_amount_received: pricing.customerAmount - gatewayFee,
    minimum_amount: DEFAULT_MINIMUM_AMOUNT,
    minimum_payout: DEFAULT_MINIMUM_PAYOUT,
    dispute_window_hours: DEFAULT_DISPUTE_WINDOW_HOURS,
    dispute_sla_hours: DEFAULT_DISPUTE_SLA_HOURS,
    auto_release_hours: DEFAULT_AUTO_RELEASE_HOURS,
    currency: "COP",
  }
}
