"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import {
  createClient,
  hasSupabaseEnv,
  missingEnvMessage,
} from "@/lib/supabase/client"
import {
  buildFixedRouteQuote,
  isRouteCategory,
  type RouteCategory,
  type PaymentQuote,
} from "@/lib/payments/quote"
import { useRouter, useSearchParams } from "next/navigation"

export type RetryCheckoutData = {
  retryPaymentId: string
  paymentStatus: string | null
  shipmentId: string
  origin: string
  destination: string
  originCityId: string
  destinationCityId: string
  kind: string
  description: string
  weightKg: string
  declaredValueCop: string
  routeCategory: RouteCategory | null
}

type CheckoutClientProps = {
  initialRetryData?: RetryCheckoutData | null
}

type CheckoutViewModel = {
  retryPaymentId: string
  shipmentId: string
  isRetry: boolean
  paymentStatus: string | null
  origin: string
  destination: string
  originCityId: string
  destinationCityId: string
  kind: string
  description: string
  rawDescription: string
  weightKgRaw: string
  declaredValueRaw: string
  weight: number | null
  declared: number | null
  routeCategory: RouteCategory | null
  quote: PaymentQuote | null
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "No definido"
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function getShipmentKindLabel(kind: string) {
  switch (kind) {
    case "document":
      return "Documento"
    case "package":
      return "Paquete"
    case "ecommerce":
      return "E-commerce"
    default:
      return kind || "No definido"
  }
}

function IconShell({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFFBF4] text-[#1e8c4e]">
      {children}
    </span>
  )
}

function SummaryRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  detail?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <IconShell>{icon}</IconShell>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="mt-1 text-sm font-semibold leading-6 text-[#0B2C4A]">{value}</div>
        {detail ? <div className="mt-1 text-sm leading-5 text-slate-500">{detail}</div> : null}
      </div>
    </div>
  )
}

function buildReference(shipmentId: string) {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 100000)}`

  return `intra-shipment-${shipmentId}-${randomPart}`
}

function buildCheckoutViewModel(
  searchParams: ReturnType<typeof useSearchParams>,
  initialRetryData?: RetryCheckoutData | null
): CheckoutViewModel {
  const fromRetry = initialRetryData ?? null

  const origin = fromRetry?.origin ?? searchParams.get("origin") ?? "No definido"
  const destination = fromRetry?.destination ?? searchParams.get("destination") ?? "No definido"
  const originCityId = fromRetry?.originCityId ?? searchParams.get("originCityId") ?? ""
  const destinationCityId = fromRetry?.destinationCityId ?? searchParams.get("destinationCityId") ?? ""
  const routeCategoryParam = fromRetry?.routeCategory ?? searchParams.get("routeCategory")
  const kind = fromRetry?.kind ?? searchParams.get("kind") ?? ""
  const rawDescription = fromRetry?.description ?? searchParams.get("description") ?? ""
  const weightKgRaw = fromRetry?.weightKg ?? searchParams.get("weightKg") ?? searchParams.get("weight") ?? ""
  const declaredValueRaw = fromRetry?.declaredValueCop ?? searchParams.get("declaredValueCop") ?? searchParams.get("declared") ?? ""
  const weight = weightKgRaw.trim() ? Number(weightKgRaw) : null
  const declared = declaredValueRaw.trim() ? Number(declaredValueRaw) : null
  const routeCategory = isRouteCategory(routeCategoryParam) ? routeCategoryParam : null
  const quote = routeCategory ? buildFixedRouteQuote(routeCategory) : null

  return {
    retryPaymentId: fromRetry?.retryPaymentId ?? searchParams.get("retryPaymentId") ?? "",
    shipmentId: fromRetry?.shipmentId ?? "",
    isRetry: Boolean(fromRetry?.shipmentId),
    paymentStatus: fromRetry?.paymentStatus ?? null,
    origin,
    destination,
    originCityId,
    destinationCityId,
    kind,
    description: rawDescription || "Sin descripción",
    rawDescription,
    weightKgRaw,
    declaredValueRaw,
    weight,
    declared,
    routeCategory,
    quote,
  }
}

export default function CheckoutClient({ initialRetryData = null }: CheckoutClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const view = useMemo(
    () => buildCheckoutViewModel(searchParams, initialRetryData),
    [searchParams, initialRetryData]
  )

  const travelerAmount = view.quote?.traveler_amount ?? null
  const totalAmount = view.quote?.amount ?? null
  const gatewayFeeEstimated = view.quote?.gateway_fee_estimated ?? null
  const intraFee = view.quote?.intra_fee ?? null
  const autoReleaseHours = view.quote?.auto_release_hours ?? 48
  const disputeWindowHours = view.quote?.dispute_window_hours ?? 24

  async function handlePayment() {
    setLoading(true)
    setErrorMsg(null)

    if (!view.originCityId || !view.destinationCityId || !view.kind || !view.rawDescription.trim()) {
      setLoading(false)
      setErrorMsg("Faltan datos del envío para completar el pago.")
      return
    }

    if (view.weight !== null && (Number.isNaN(view.weight) || view.weight <= 0)) {
      setLoading(false)
      setErrorMsg("El peso recibido no es válido.")
      return
    }

    if (view.declared !== null && (Number.isNaN(view.declared) || view.declared < 0)) {
      setLoading(false)
      setErrorMsg("El valor declarado recibido no es válido.")
      return
    }

    if (!hasSupabaseEnv()) {
      setLoading(false)
      setErrorMsg(missingEnvMessage)
      return
    }

    const quote = view.quote

    if (!quote || !quote.success || !quote.amount) {
      setLoading(false)
      setErrorMsg(
        quote?.error === "below_minimum"
          ? `El valor mínimo del envío es ${formatCurrency(quote.minimum_amount ?? 20000)}.`
          : "No se pudo recalcular el pago seguro antes de registrar el cobro."
      )
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setErrorMsg("Debes iniciar sesión para completar el pago.")
      return
    }

    let shipmentId = view.shipmentId

    if (!view.isRetry) {
      const { data: shipment, error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          owner_id: user.id,
          origin_city_id: view.originCityId,
          destination_city_id: view.destinationCityId,
          kind: view.kind,
          description: view.rawDescription.trim(),
          weight_kg: view.weight,
          declared_value_cop: view.declared,
        })
        .select("id")
        .single()

      if (shipmentError || !shipment) {
        setLoading(false)
        setErrorMsg(
          "No se pudo crear el envío: " +
            (shipmentError?.message ?? "Error desconocido")
        )
        return
      }

      shipmentId = shipment.id
    }

    if (!shipmentId) {
      setLoading(false)
      setErrorMsg("No encontramos el envío para reintentar el pago.")
      return
    }

    const externalReference = buildReference(shipmentId)

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        shipment_id: shipmentId,
        user_id: user.id,
        amount: quote.amount,
        gross_amount: quote.gross_amount ?? quote.amount,
        traveler_amount: quote.traveler_amount ?? 0,
        intra_fee: quote.intra_fee ?? 0,
        gateway_fee_estimated: quote.gateway_fee_estimated ?? 0,
        net_amount_received: quote.net_amount_received ?? quote.amount,
        currency: quote.currency ?? "COP",
        status: "pending",
        gateway_provider: "wompi",
        gateway_status: "created",
        payment_method: "wompi_widget",
        external_reference: externalReference,
        metadata: {
          source: "wompi_widget",
          sandbox: process.env.NEXT_PUBLIC_WOMPI_SANDBOX === "true",
          auto_release_hours: quote.auto_release_hours ?? autoReleaseHours,
          dispute_window_hours: quote.dispute_window_hours ?? disputeWindowHours,
          retry_of_payment_id: view.retryPaymentId || null,
        },
      })
      .select("id")
      .single()

    if (paymentError || !payment) {
      setLoading(false)
      setErrorMsg("No se pudo registrar el pago: " + (paymentError?.message ?? "Error desconocido"))
      return
    }

    const params = new URLSearchParams({ paymentId: payment.id })
    router.push(`/app/payments/checkout/wompi?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-2 lg:mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1e8c4e]">
            Checkout seguro
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">
            Confirma tu envío y paga en un solo paso
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
            Revisa los datos del envío y confirma el cobro. El dinero queda protegido hasta que se complete la entrega.
          </p>
        </div>

        {view.isRetry ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Estás reintentando un pago {view.paymentStatus ? `con estado ${view.paymentStatus}` : "fallido"}. Conservamos los datos del envío para que no tengas que llenarlos otra vez.
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_360px] xl:grid-cols-[minmax(0,1.35fr)_380px] xl:items-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0B2C4A]">Resumen del envío</h2>
                <p className="mt-1 text-sm text-slate-500">Todo lo que el cliente va a confirmar antes de pagar.</p>
              </div>
              <div className="rounded-full bg-[#EFFBF4] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#1e8c4e]">
                {view.routeCategory ? `Ruta ${view.routeCategory}` : "Ruta pendiente"}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ruta</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-[#0B2C4A] sm:text-2xl">
                <span>{view.origin}</span>
                <span className="text-[#2ECC71]">→</span>
                <span>{view.destination}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SummaryRow
                label="Tipo de envío"
                value={getShipmentKindLabel(view.kind)}
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7.5 12 3l9 4.5M3 7.5V16.5L12 21m-9-13.5L12 12m9-4.5V16.5L12 21m0-9v9" />
                  </svg>
                }
                detail="El viajero verá esta categoría al aceptar el match."
              />
              <SummaryRow
                label="Peso estimado"
                value={view.weight !== null ? `${view.weight} kg` : "No definido"}
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 6h10m-8 0V4a3 3 0 0 1 6 0v2m-8 0a4 4 0 1 0 8 0m-11 3h14l1 10H5L4 9Z" />
                  </svg>
                }
                detail="Dato usado para que el viajero evalúe capacidad y manejo."
              />
              <SummaryRow
                label="Valor declarado"
                value={formatCurrency(view.declared)}
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6v12m4-9a4 4 0 0 0-8 0c0 5 8 3 8 8a4 4 0 0 1-8 0" />
                  </svg>
                }
                detail="Se usa como referencia del contenido reportado por el cliente."
              />
              <SummaryRow
                label="Pago protegido"
                value="Retención temporal hasta la entrega"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3l7 4v5c0 4.97-3.05 7.97-7 9-3.95-1.03-7-4.03-7-9V7l7-4Z" />
                  </svg>
                }
                detail={`Auto liberación en ${autoReleaseHours}h. Ventana de disputa: ${disputeWindowHours}h.`}
              />
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{view.description}</p>
            </div>
          </div>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0B2C4A]/70">
                Resumen de pago
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B2C4A]">Todo listo para pagar</h2>
              <p className="mt-2 text-sm text-slate-500">
                Pago seguro procesado por Wompi. INTRA retiene el dinero hasta confirmar la entrega.
              </p>
            </div>

            <div className="mt-6 space-y-3 rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                <span>Valor del transporte</span>
                <span className="font-semibold text-[#0B2C4A]">{formatCurrency(travelerAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                <span>Servicio de plataforma</span>
                <span className="font-semibold text-[#0B2C4A]">{formatCurrency(intraFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                <span>Procesamiento de pago</span>
                <span className="font-semibold text-[#0B2C4A]">{formatCurrency(gatewayFeeEstimated)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#0B2C4A] px-5 py-5 text-white">
              <p className="text-sm uppercase tracking-wide text-white/70">Total a pagar</p>
              <p className="mt-2 text-4xl font-extrabold text-[#2ECC71] sm:text-5xl">
                {formatCurrency(totalAmount)}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/80">
                El viajero recibe el valor del transporte cuando la entrega quede confirmada o se cumpla la auto liberación.
              </p>
            </div>

            {errorMsg ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePayment}
              disabled={loading}
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#2ECC71] px-5 py-4 text-base font-bold text-[#08321d] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Preparando checkout..." : "Pagar con Wompi"}
            </button>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
              Al continuar aceptas iniciar el cobro seguro del envío. No compartimos los datos sensibles del pago en la URL.
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
