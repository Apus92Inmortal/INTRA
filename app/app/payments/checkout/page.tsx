import { Suspense } from "react"
import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import { isRouteCategory, type RouteCategory } from "@/lib/payments/quote"
import CheckoutClient, { type RetryCheckoutData } from "./CheckoutClient"

type CheckoutPageProps = {
  searchParams?: Promise<{
    retryPaymentId?: string
    shipmentId?: string
    evidenceRequired?: string
  }>
}

type RetryPaymentRow = {
  id: string
  status: string | null
  gateway_status: string | null
  shipment_id: string | null
}

function isRetryablePaymentStatus(status: string | null | undefined) {
  if (!status) return false

  const normalized = status.trim().toLowerCase()
  return ["failed", "cancelled", "canceled", "rejected", "declined", "voided", "error"].includes(normalized)
}

function isReusablePaymentStatus(status: string | null | undefined) {
  if (!status) return false

  const normalized = status.trim().toLowerCase()
  return normalized === "pending" || normalized === "processing"
}

type RetryShipmentRow = {
  id: string
  kind: string
  description: string
  weight_kg: number | string | null
  declared_value_cop: number | string | null
  is_fragile: boolean | null
  is_urgent: boolean | null
  is_high_value: boolean | null
  origin_city_id: string
  destination_city_id: string
  origin_city: { name: string | null } | null
  destination_city: { name: string | null } | null
}

function toStringValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return ""
  return String(value)
}

async function hasCustomerInitialEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shipmentId: string
) {
  const evidenceRes = await supabase
    .from("shipment_evidence")
    .select("id")
    .eq("shipment_id", shipmentId)
    .eq("evidence_type", "customer_initial_photo")
    .limit(1)

  return Boolean(evidenceRes.data?.[0]?.id)
}

async function loadRetryCheckoutData(retryPaymentId: string): Promise<RetryCheckoutData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const paymentRes = await supabase
    .from("payments")
    .select("id, status, gateway_status, shipment_id")
    .eq("id", retryPaymentId)
    .eq("user_id", user.id)
    .maybeSingle()

  const payment = (paymentRes.data ?? null) as RetryPaymentRow | null

  const paymentStatus = payment?.status ?? null
  const gatewayStatus = payment?.gateway_status ?? null
  const retryStatus = isRetryablePaymentStatus(paymentStatus)
    ? paymentStatus
    : isRetryablePaymentStatus(gatewayStatus)
    ? gatewayStatus
    : null
  const canReuseExistingPayment = isReusablePaymentStatus(paymentStatus)

  if (!payment?.shipment_id || (!retryStatus && !canReuseExistingPayment)) {
    return null
  }

  const shipmentRes = await supabase
    .from("shipments")
    .select(
      `
        id,
        kind,
        description,
        weight_kg,
        declared_value_cop,
        is_fragile,
        is_urgent,
        is_high_value,
        origin_city_id,
        destination_city_id,
        origin_city:cities!shipments_origin_city_id_fkey(name),
        destination_city:cities!shipments_destination_city_id_fkey(name)
      `
    )
    .eq("id", payment.shipment_id)
    .eq("owner_id", user.id)
    .maybeSingle()

  const shipment = (shipmentRes.data ?? null) as RetryShipmentRow | null

  if (!shipment) {
    return null
  }

  const hasInitialEvidence = await hasCustomerInitialEvidence(supabase, shipment.id)

  const routePriceRes = await supabase
    .from("route_prices")
    .select("route_category")
    .eq("origin_city_id", shipment.origin_city_id)
    .eq("destination_city_id", shipment.destination_city_id)
    .eq("is_active", true)
    .maybeSingle()

  const routePrice = (routePriceRes.data ?? null) as { route_category: string | null } | null
  const routeCategoryRaw = routePrice?.route_category ?? null
  const routeCategory: RouteCategory | null = isRouteCategory(routeCategoryRaw)
    ? routeCategoryRaw
    : null

  return {
    retryPaymentId: payment.id,
    paymentStatus: retryStatus,
    shipmentId: shipment.id,
    origin: shipment.origin_city?.name?.trim() || "No especificado",
    destination: shipment.destination_city?.name?.trim() || "No especificado",
    originCityId: shipment.origin_city_id,
    destinationCityId: shipment.destination_city_id,
    kind: shipment.kind,
    description: shipment.description,
    weightKg: toStringValue(shipment.weight_kg),
    declaredValueCop: toStringValue(shipment.declared_value_cop),
    isFragile: shipment.is_fragile === true,
    isUrgent: shipment.is_urgent === true,
    isHighValue: shipment.is_high_value === true,
    routeCategory,
    hasInitialEvidence,
    canReuseExistingPayment,
  }
}

async function loadShipmentCheckoutData(shipmentId: string): Promise<RetryCheckoutData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const shipmentRes = await supabase
    .from("shipments")
    .select(
      `
        id,
        kind,
        description,
        weight_kg,
        declared_value_cop,
        is_fragile,
        is_urgent,
        is_high_value,
        origin_city_id,
        destination_city_id,
        origin_city:cities!shipments_origin_city_id_fkey(name),
        destination_city:cities!shipments_destination_city_id_fkey(name)
      `
    )
    .eq("id", shipmentId)
    .eq("owner_id", user.id)
    .maybeSingle()

  const shipment = (shipmentRes.data ?? null) as RetryShipmentRow | null

  if (!shipment) {
    return null
  }

  const hasInitialEvidence = await hasCustomerInitialEvidence(supabase, shipment.id)

  const routePriceRes = await supabase
    .from("route_prices")
    .select("route_category")
    .eq("origin_city_id", shipment.origin_city_id)
    .eq("destination_city_id", shipment.destination_city_id)
    .eq("is_active", true)
    .maybeSingle()

  const routePrice = (routePriceRes.data ?? null) as { route_category: string | null } | null
  const routeCategoryRaw = routePrice?.route_category ?? null
  const routeCategory: RouteCategory | null = isRouteCategory(routeCategoryRaw)
    ? routeCategoryRaw
    : null

  return {
    retryPaymentId: "",
    paymentStatus: null,
    shipmentId: shipment.id,
    origin: shipment.origin_city?.name?.trim() || "No especificado",
    destination: shipment.destination_city?.name?.trim() || "No especificado",
    originCityId: shipment.origin_city_id,
    destinationCityId: shipment.destination_city_id,
    kind: shipment.kind,
    description: shipment.description,
    weightKg: toStringValue(shipment.weight_kg),
    declaredValueCop: toStringValue(shipment.declared_value_cop),
    isFragile: shipment.is_fragile === true,
    isUrgent: shipment.is_urgent === true,
    isHighValue: shipment.is_high_value === true,
    routeCategory,
    hasInitialEvidence,
    canReuseExistingPayment: false,
  }
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams
  const retryPaymentId = params?.retryPaymentId?.trim() ?? ""
  const shipmentId = params?.shipmentId?.trim() ?? ""
  const retryCheckoutData = retryPaymentId
    ? await loadRetryCheckoutData(retryPaymentId)
    : shipmentId
      ? await loadShipmentCheckoutData(shipmentId)
      : null

  return (
    <>
      <AppNavbar />
      <Suspense fallback={null}>
        <CheckoutClient initialRetryData={retryCheckoutData} />
      </Suspense>
    </>
  )
}
