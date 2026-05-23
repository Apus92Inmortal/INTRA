"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
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
import {
  getCreateShipmentDraftErrorMessage,
  parseCreateShipmentDraftResult,
  SHIPMENT_DECLARATION_SUMMARY,
  SHIPMENT_DECLARATION_TEXT,
  SHIPMENT_DECLARATION_VERSION,
} from "@/lib/shipments/security"
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
  isFragile: boolean
  isUrgent: boolean
  isHighValue: boolean
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
  isFragile: boolean
  isUrgent: boolean
  isHighValue: boolean
  weight: number | null
  declared: number | null
  routeCategory: RouteCategory | null
  quote: PaymentQuote | null
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "No especificado"
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
      return kind || "No especificado"
  }
}

function IconShell({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-intra-success-soft text-intra-text-success lg:h-7 lg:w-7">
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
    <div className="flex items-start gap-2.5 rounded-2xl border border-intra-border-soft bg-intra-card p-3 lg:p-2.5">
      <IconShell>{icon}</IconShell>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-intra-text-muted">{label}</p>
        <div className="mt-0.5 text-sm font-semibold leading-5 text-intra-blue">{value}</div>
        {detail ? <div className="mt-0.5 text-[11px] leading-4 text-intra-text-muted">{detail}</div> : null}
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

  const origin = fromRetry?.origin ?? searchParams.get("origin") ?? "No especificado"
  const destination = fromRetry?.destination ?? searchParams.get("destination") ?? "No especificado"
  const originCityId = fromRetry?.originCityId ?? searchParams.get("originCityId") ?? ""
  const destinationCityId = fromRetry?.destinationCityId ?? searchParams.get("destinationCityId") ?? ""
  const routeCategoryParam = fromRetry?.routeCategory ?? searchParams.get("routeCategory")
  const kind = fromRetry?.kind ?? searchParams.get("kind") ?? ""
  const rawDescription = fromRetry?.description ?? searchParams.get("description") ?? ""
  const weightKgRaw = fromRetry?.weightKg ?? searchParams.get("weightKg") ?? searchParams.get("weight") ?? ""
  const declaredValueRaw = fromRetry?.declaredValueCop ?? searchParams.get("declaredValueCop") ?? searchParams.get("declared") ?? ""
  const isFragile = fromRetry?.isFragile ?? searchParams.get("isFragile") === "true"
  const isUrgent = fromRetry?.isUrgent ?? searchParams.get("isUrgent") === "true"
  const isHighValue = fromRetry?.isHighValue ?? searchParams.get("isHighValue") === "true"
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
    isFragile,
    isUrgent,
    isHighValue,
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
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false)

  const view = useMemo(
    () => buildCheckoutViewModel(searchParams, initialRetryData),
    [searchParams, initialRetryData]
  )

  const totalAmount = view.quote?.amount ?? null
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

    if (view.weight === null || Number.isNaN(view.weight) || view.weight < 0.1) {
      setLoading(false)
      setErrorMsg("El peso recibido no es válido.")
      return
    }

    if (view.declared === null || Number.isNaN(view.declared) || view.declared < 0) {
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
    let paymentId = ""

    if (!view.isRetry) {
      if (!acceptedDeclaration) {
        setLoading(false)
        setErrorMsg("Debes aceptar la declaración responsable para continuar.")
        return
      }

      const { data: createDraftData, error: createDraftError } = await supabase.rpc(
        "create_shipment_with_payment_draft",
        {
          p_origin_city_id: view.originCityId,
          p_destination_city_id: view.destinationCityId,
          p_kind: view.kind,
          p_description: view.rawDescription.trim(),
          p_weight_kg: view.weight,
          p_declared_value_cop: view.declared,
          p_declaration_accepted: acceptedDeclaration,
          p_declaration_version: SHIPMENT_DECLARATION_VERSION,
          p_is_fragile: view.isFragile,
          p_is_urgent: view.isUrgent,
          p_is_high_value: view.isHighValue,
          p_acceptance_flow: "shipment_checkout",
          p_user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
        }
      )

      if (createDraftError) {
        setLoading(false)
        setErrorMsg("No se pudo preparar el envío: " + createDraftError.message)
        return
      }

      const createDraftResult = parseCreateShipmentDraftResult(createDraftData)

      if (!createDraftResult?.success || !createDraftResult.shipment_id || !createDraftResult.payment_id) {
        setLoading(false)
        setErrorMsg(
          createDraftResult?.message ||
            getCreateShipmentDraftErrorMessage(createDraftResult?.error)
        )
        return
      }

      shipmentId = createDraftResult.shipment_id
      paymentId = createDraftResult.payment_id
    }

    if (!shipmentId) {
      setLoading(false)
      setErrorMsg("No encontramos el envío para reintentar el pago.")
      return
    }

    if (!paymentId) {
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

      paymentId = payment.id
    }

    const params = new URLSearchParams({ paymentId })
    router.push(`/app/payments/checkout/wompi?${params.toString()}`)
  }

  return (
    <main className="intra-page-shell px-4 py-3 sm:px-6 lg:px-8 lg:py-3">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex flex-col gap-1 lg:mb-3.5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-intra-text-success">
            Checkout seguro
          </p>
          <h1 className="max-w-4xl text-2xl font-bold tracking-tight text-intra-blue sm:text-3xl lg:text-[28px] lg:leading-tight">
            Confirma tu pago
          </h1>
          <p className="max-w-4xl text-sm leading-5 text-intra-text-subtle lg:text-[14px]">
            Revisa los datos del envío y confirma el cobro. El dinero queda protegido hasta que se complete la entrega.
          </p>
        </div>

        {view.isRetry ? (
          <div className="mb-5 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 text-sm text-intra-warning-text">
            {view.retryPaymentId
              ? "El pago anterior no se completó correctamente. Reintenta el pago para continuar con la confirmación del envío."
              : "Tienes un envío pendiente de pago. Completa el checkout para publicarlo y continuar con el proceso."}
          </div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.48fr)_300px] xl:grid-cols-[minmax(0,1.52fr)_315px] xl:items-start">
          <div className="rounded-[24px] border border-intra-border-soft bg-intra-card p-3.5 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-intra-blue">Resumen del envío</h2>
              </div>
              <div className="rounded-full bg-intra-success-soft px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-intra-text-success">
                Tarifa confirmada
              </div>
            </div>

            <div className="rounded-[24px] border border-intra-border-soft bg-intra-bg-app p-3 sm:p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-intra-text-muted">Ruta</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-intra-blue sm:text-[24px] sm:leading-tight">
                <span>{view.origin}</span>
                <span className="text-intra-green">→</span>
                <span>{view.destination}</span>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <SummaryRow
                label="Tipo de envío"
                value={getShipmentKindLabel(view.kind)}
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7.5 12 3l9 4.5M3 7.5V16.5L12 21m-9-13.5L12 12m9-4.5V16.5L12 21m0-9v9" />
                  </svg>
                }
                detail="Visible para el viajero al aceptar."
              />
              <SummaryRow
                label="Peso estimado"
                value={view.weight !== null ? `${view.weight} kg` : "No especificado"}
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 6h10m-8 0V4a3 3 0 0 1 6 0v2m-8 0a4 4 0 1 0 8 0m-11 3h14l1 10H5L4 9Z" />
                  </svg>
                }
                detail="Referencia para capacidad y manejo."
              />
              <SummaryRow
                label="Valor declarado"
                value={formatCurrency(view.declared)}
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6v12m4-9a4 4 0 0 0-8 0c0 5 8 3 8 8a4 4 0 0 1-8 0" />
                  </svg>
                }
                detail="Referencia del contenido reportado."
              />
              <SummaryRow
                label="Pago protegido"
                value="Retención temporal hasta la entrega"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3l7 4v5c0 4.97-3.05 7.97-7 9-3.95-1.03-7-4.03-7-9V7l7-4Z" />
                  </svg>
                }
                detail="El saldo se libera cuando el cierre sea correcto y no exista disputa."
              />
            </div>

            <div className="mt-2.5 rounded-[24px] border border-intra-border-soft bg-intra-card p-3 sm:p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-intra-text-muted">Descripción</p>
              <p className="mt-1 text-sm leading-5 text-intra-text-subtle lg:max-h-10 lg:overflow-hidden">{view.description}</p>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {[
                { label: "Frágil", active: view.isFragile },
                { label: "Urgente", active: view.isUrgent },
                { label: "Valor alto", active: view.isHighValue },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    item.active
                      ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                      : "border-intra-border-soft bg-intra-bg-app text-intra-text-muted"
                  }`}
                >
                  {item.label}: {item.active ? "Sí" : "No"}
                </span>
              ))}
            </div>

            {!view.isRetry ? (
              <div className="mt-2.5 rounded-[24px] border border-intra-success-border bg-intra-success-soft p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-intra-text-success">Declaración responsable</p>
                <p className="mt-2 text-sm leading-6 text-intra-text-subtle">{SHIPMENT_DECLARATION_SUMMARY}</p>
                <details className="mt-2 text-sm text-intra-text-subtle">
                  <summary className="cursor-pointer text-[12px] font-semibold text-intra-text-success">
                    Ver declaración completa
                  </summary>
                  <p className="mt-2 rounded-2xl border border-intra-success-border bg-intra-card/70 p-3 text-[12px] leading-5">
                    {SHIPMENT_DECLARATION_TEXT}
                  </p>
                </details>
                <label className="mt-4 flex items-start gap-3 text-sm text-intra-text-subtle">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-intra-border text-intra-text-success focus:ring-intra-text-success"
                    checked={acceptedDeclaration}
                    onChange={(event) => setAcceptedDeclaration(event.target.checked)}
                  />
                  <span>
                    Acepto esta declaración para crear el envío y continuar con el pago seguro.
                  </span>
                </label>
              </div>
            ) : null}
          </div>

          <aside className="rounded-[24px] border border-intra-border-soft bg-intra-card p-3.5 shadow-sm sm:p-4 lg:sticky lg:top-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-intra-text-muted">
                Resumen de pago
              </p>
            </div>

            <div className="mt-2.5 space-y-2 rounded-[24px] bg-intra-bg-app p-3">
              <div className="flex items-center justify-between gap-4 text-[13px] text-intra-text-subtle">
                <span>Tarifa operativa incluida</span>
                <span className="font-semibold text-intra-blue">Incluida</span>
              </div>
              <p className="text-[12px] leading-5 text-intra-text-subtle">
                Pago protegido con retención temporal hasta que el proceso cierre correctamente.
              </p>
              <Link
                href="/app/legal/pagos"
                className="inline-flex text-[12px] font-semibold text-intra-text-success hover:underline"
              >
                Ver condiciones de pago
              </Link>
            </div>

            <div className="mt-3 rounded-[24px] bg-intra-blue px-3.5 py-4 text-intra-card">
              <p className="text-xs uppercase tracking-wide text-intra-card/70">Total a pagar</p>
              <p className="mt-1.5 text-center text-[30px] font-extrabold leading-[36px] text-intra-green sm:text-[30px] sm:leading-[36px]">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            {errorMsg ? (
              <div className="mt-4 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 text-sm text-intra-danger">
                {errorMsg}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePayment}
              disabled={loading}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-intra-green px-5 py-3 text-[15px] font-bold text-intra-card transition hover:bg-intra-green-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Preparando checkout..." : "Pagar con Wompi"}
            </button>

          </aside>
        </section>
      </div>
    </main>
  )
}
