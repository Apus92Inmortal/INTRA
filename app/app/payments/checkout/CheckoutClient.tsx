"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  CircleDollarSign,
  FileText,
  Package,
  Scale,
  Upload,
  X,
} from "lucide-react"
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
  SHIPMENT_DECLARATION_VERSION,
} from "@/lib/shipments/security"
import {
  PAYMENTS_POLICY_DOCUMENT,
  SHIPPING_POLICY_DOCUMENT,
} from "@/lib/legal/documents"
import { LegalDocumentModal } from "@/components/legal-document-modal"
import { SHIPMENT_CHECKOUT_ACCEPTANCE_FLOW } from "@/lib/legal/policy-acceptance"
import { useRouter, useSearchParams } from "next/navigation"
import { compressImageFile } from "@/lib/uploads"

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
  hasInitialEvidence: boolean
  canReuseExistingPayment: boolean
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
  hasInitialEvidence: boolean
  canReuseExistingPayment: boolean
}

type PreparedCheckoutDraft = {
  shipmentId: string
  paymentId: string
}

const PAYMENT_CONDITIONS_VERSION = PAYMENTS_POLICY_DOCUMENT.version
const INITIAL_EVIDENCE_BUCKET = "shipment-evidence"
const CUSTOMER_INITIAL_EVIDENCE_TYPE = "customer_initial_photo"

type LegalModalKey = "shipping-policy" | "payments-policy"

const legalDocuments = {
  "shipping-policy": SHIPPING_POLICY_DOCUMENT,
  "payments-policy": PAYMENTS_POLICY_DOCUMENT,
} satisfies Record<LegalModalKey, typeof SHIPPING_POLICY_DOCUMENT | typeof PAYMENTS_POLICY_DOCUMENT>

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
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-intra-success-soft text-intra-text-success sm:h-8 sm:w-8 lg:h-7 lg:w-7">
      {children}
    </span>
  )
}

function SummaryRow({
  icon,
  label,
  value,
  detail,
  valueClassName = "mt-0.5 intra-body-strong",
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  detail?: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex h-full items-start gap-2 rounded-2xl border border-intra-border-soft bg-intra-card p-2.5 sm:gap-2.5 sm:p-3 lg:p-2.5">
      <IconShell>{icon}</IconShell>
      <div className="min-w-0 flex-1">
        <p className="intra-badge-text uppercase text-intra-text-muted">{label}</p>
        <div className={valueClassName}>{value}</div>
        {detail ? <div className="mt-0.5 hidden intra-caption lg:block">{detail}</div> : null}
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

function getFileExtension(file: File) {
  const parts = file.name.split(".")
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "bin" : "bin"
}

async function uploadCustomerInitialEvidence({
  supabase,
  userId,
  shipmentId,
  file,
}: {
  supabase: ReturnType<typeof createClient>
  userId: string
  shipmentId: string
  file: File
}) {
  if (!file.type.startsWith("image/")) {
    throw new Error("La evidencia inicial debe ser una imagen.")
  }

  const compressedFile = await compressImageFile(file)
  const path = `${userId}/${shipmentId}/${Date.now()}-${CUSTOMER_INITIAL_EVIDENCE_TYPE}.${getFileExtension(compressedFile)}`

  const upload = await supabase.storage.from(INITIAL_EVIDENCE_BUCKET).upload(path, compressedFile, {
    upsert: false,
    contentType: compressedFile.type || undefined,
  })

  if (upload.error) {
    throw new Error(upload.error.message)
  }

  const { error: insertError } = await supabase.from("shipment_evidence").insert({
    shipment_id: shipmentId,
    match_id: null,
    uploaded_by: userId,
    evidence_type: CUSTOMER_INITIAL_EVIDENCE_TYPE,
    file_path: path,
    file_name: compressedFile.name,
    mime_type: compressedFile.type || null,
    note: "Foto inicial del paquete subida antes de iniciar pago.",
  })

  if (insertError) {
    await supabase.storage.from(INITIAL_EVIDENCE_BUCKET).remove([path])
    throw new Error(insertError.message)
  }
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
  const hasInitialEvidence = fromRetry?.hasInitialEvidence ?? false
  const canReuseExistingPayment = fromRetry?.canReuseExistingPayment ?? false
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
    hasInitialEvidence,
    canReuseExistingPayment,
  }
}

export default function CheckoutClient({ initialRetryData = null }: CheckoutClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEvidenceRequired = searchParams.get("evidenceRequired") === "1"
  const initialEvidenceInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(
    initialEvidenceRequired
      ? "Antes de abrir Wompi debes subir la foto inicial del paquete."
      : null
  )
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false)
  const [acceptedPaymentConditions, setAcceptedPaymentConditions] = useState(false)
  const [legalModalKey, setLegalModalKey] = useState<LegalModalKey | null>(null)
  const [initialEvidenceFile, setInitialEvidenceFile] = useState<File | null>(null)
  const [initialEvidenceUploaded, setInitialEvidenceUploaded] = useState(false)
  const [preparedDraft, setPreparedDraft] = useState<PreparedCheckoutDraft | null>(null)

  const view = useMemo(
    () => buildCheckoutViewModel(searchParams, initialRetryData),
    [searchParams, initialRetryData]
  )

  const travelerAmount = view.quote?.traveler_amount ?? null
  const intraFee = view.quote?.intra_fee ?? null
  const gatewayFee = view.quote?.gateway_fee_estimated ?? null
  const totalAmount = view.quote?.amount ?? null
  const autoReleaseHours = view.quote?.auto_release_hours ?? 48
  const disputeWindowHours = view.quote?.dispute_window_hours ?? 24
  const initialEvidenceReady = view.hasInitialEvidence || initialEvidenceUploaded
  const initialEvidencePreviewUrl = useMemo(
    () => initialEvidenceFile ? URL.createObjectURL(initialEvidenceFile) : null,
    [initialEvidenceFile]
  )

  useEffect(() => {
    return () => {
      if (initialEvidencePreviewUrl) {
        URL.revokeObjectURL(initialEvidencePreviewUrl)
      }
    }
  }, [initialEvidencePreviewUrl])

  function handleInitialEvidenceFileChange(file: File | null) {
    setInitialEvidenceFile(file)

    if (file) {
      setErrorMsg(null)
    }
  }

  function handleRemoveInitialEvidenceFile() {
    setInitialEvidenceFile(null)

    if (initialEvidenceInputRef.current) {
      initialEvidenceInputRef.current.value = ""
    }
  }

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

    if (!view.isRetry && !acceptedDeclaration) {
      setLoading(false)
      setErrorMsg("Debes aceptar la declaración responsable para continuar.")
      return
    }

    if (!acceptedPaymentConditions) {
      setLoading(false)
      setErrorMsg("Debes aceptar la política de pagos para continuar.")
      return
    }

    if (!initialEvidenceReady && !initialEvidenceFile) {
      setLoading(false)
      setErrorMsg("Sube una foto clara del paquete cerrado antes de iniciar el pago.")
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

    let shipmentId = preparedDraft?.shipmentId ?? view.shipmentId
    let paymentId = preparedDraft?.paymentId ?? (view.canReuseExistingPayment ? view.retryPaymentId : "")

    if (!view.isRetry && !preparedDraft) {
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
          p_acceptance_flow: SHIPMENT_CHECKOUT_ACCEPTANCE_FLOW,
          p_user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
          p_ip_address: null,
          p_shipping_policy_version: SHIPPING_POLICY_DOCUMENT.version,
          p_payment_policy_accepted: acceptedPaymentConditions,
          p_payment_policy_version: PAYMENT_CONDITIONS_VERSION,
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
      setPreparedDraft({ shipmentId, paymentId })
    }

    if (!shipmentId) {
      setLoading(false)
      setErrorMsg("No encontramos el envío para reintentar el pago.")
      return
    }

    if (!initialEvidenceReady) {
      if (!initialEvidenceFile) {
        setLoading(false)
        setErrorMsg("Sube una foto clara del paquete cerrado antes de iniciar el pago.")
        return
      }

      try {
        await uploadCustomerInitialEvidence({
          supabase,
          userId: user.id,
          shipmentId,
          file: initialEvidenceFile,
        })
        setInitialEvidenceUploaded(true)
        setInitialEvidenceFile(null)
      } catch (error) {
        setLoading(false)
        setErrorMsg(
          error instanceof Error
            ? `No se pudo guardar la evidencia inicial: ${error.message}`
            : "No se pudo guardar la evidencia inicial."
        )
        return
      }
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
            payment_conditions_accepted: acceptedPaymentConditions,
            payment_conditions_version: PAYMENT_CONDITIONS_VERSION,
            payment_conditions_flow: "shipment_checkout",
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
    <>
    <main className="intra-page-shell px-4 py-3 sm:px-6 lg:px-8 lg:py-3">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex flex-col gap-1 lg:mb-3.5">
          <p className="intra-badge-text uppercase text-intra-text-success">
            Checkout seguro
          </p>
          <h1 className="max-w-4xl intra-h1">
            Confirma tu pago
          </h1>
          <p className="max-w-4xl intra-body text-intra-text-subtle">
            Revisa los datos del envío y confirma el pago.
          </p>
        </div>

        {view.isRetry ? (
          <div className="mb-5 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 intra-body text-intra-warning-text">
            {view.retryPaymentId
              ? "El pago anterior no se completó correctamente. Reintenta el pago para continuar con la confirmación del envío."
              : "Tienes un envío pendiente de pago. Completa el checkout para publicarlo y continuar con el proceso."}
          </div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.48fr)_300px] xl:grid-cols-[minmax(0,1.52fr)_315px] xl:items-start">
          <div className="rounded-[24px] border border-intra-border-soft bg-intra-card p-3.5 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="intra-h3">Resumen del envío</h2>
              </div>
              <div className="rounded-full bg-intra-success-soft px-3 py-1.5 intra-badge-text uppercase text-intra-text-success">
                Tarifa confirmada
              </div>
            </div>

            <div className="rounded-[24px] border border-intra-border-soft bg-intra-bg-app p-3 sm:p-3.5">
              <p className="intra-badge-text uppercase text-intra-text-muted">Ruta</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 intra-h2">
                <span>{view.origin}</span>
                <span className="text-intra-green">→</span>
                <span>{view.destination}</span>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <SummaryRow
                label="Tipo de envío"
                value={getShipmentKindLabel(view.kind)}
                icon={<Package className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />}
                detail="Visible para el viajero al aceptar."
              />
              <SummaryRow
                label="Peso estimado"
                value={view.weight !== null ? `${view.weight} kg` : "No especificado"}
                icon={<Scale className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />}
                detail="Referencia para capacidad y manejo."
              />
              <SummaryRow
                label="Valor declarado"
                value={formatCurrency(view.declared)}
                icon={<CircleDollarSign className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />}
                detail="Referencia del contenido reportado."
              />
              <SummaryRow
                label="Descripción"
                value={view.description}
                icon={<FileText className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />}
                valueClassName="mt-0.5 line-clamp-2 intra-body text-intra-text-subtle"
              />
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {[
                { label: "Frágil", active: view.isFragile },
                { label: "Urgente", active: view.isUrgent },
                { label: "Valor alto", active: view.isHighValue },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center intra-badge-text ${
                    item.active
                      ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                      : "border-intra-border-soft bg-intra-bg-app text-intra-text-muted"
                  }`}
                >
                  {item.label}: {item.active ? "Sí" : "No"}
                </span>
              ))}
            </div>

            <div className="mt-3 rounded-[24px] border border-intra-border-soft bg-intra-bg-app p-3 sm:p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="intra-h4">Foto inicial del paquete</p>
                  {!initialEvidenceReady && !initialEvidencePreviewUrl ? (
                    <p className="mt-1 intra-body text-intra-text-subtle">
                      Sube una foto clara del paquete cerrado.
                    </p>
                  ) : null}
                  {initialEvidenceReady ? (
                    <div className="mt-3 rounded-2xl border border-intra-success-border bg-intra-success-soft px-3 py-2 intra-caption-strong text-intra-text-success">
                      Foto inicial registrada. No necesitas subir otra para este intento.
                    </div>
                  ) : initialEvidencePreviewUrl ? (
                    <div className="relative mt-3 h-40 w-full overflow-hidden rounded-2xl border border-intra-border-soft bg-intra-card sm:h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={initialEvidencePreviewUrl}
                        alt="Vista previa de la foto inicial del paquete"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveInitialEvidenceFile}
                        aria-label="Quitar foto seleccionada"
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-intra-border-soft bg-intra-card/90 text-intra-blue shadow-sm transition hover:bg-intra-bg-app"
                      >
                        <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-intra-border-strong bg-intra-card px-3 py-5 text-center transition hover:border-intra-success-border hover:bg-intra-success-soft/40 sm:py-6">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-intra-success-soft text-intra-text-success">
                        <Upload className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                      </span>
                      <span className="mt-2 intra-body-strong text-intra-blue">
                        Subir foto
                      </span>
                      <span className="mt-0.5 intra-caption text-intra-text-muted">
                        JPG, PNG hasta 10 MB
                      </span>
                      {initialEvidenceFile ? (
                        <span className="mt-2 intra-caption-strong text-intra-text-success">
                          Foto seleccionada
                        </span>
                      ) : null}
                      <input
                        ref={initialEvidenceInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => handleInitialEvidenceFileChange(event.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-[24px] border border-intra-border-soft bg-intra-card p-3">
              {!view.isRetry ? (
                <div className="flex items-start gap-3 intra-body text-intra-text-subtle">
                  <input
                    id="shipment-declaration-acceptance"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-intra-border text-intra-text-success focus:ring-intra-text-success"
                    checked={acceptedDeclaration}
                    onChange={(event) => setAcceptedDeclaration(event.target.checked)}
                  />
                  <span className="leading-6">
                    <span className="whitespace-nowrap sm:hidden">
                      Acepto la{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModalKey("shipping-policy")}
                        className="intra-body-strong text-intra-text-success underline underline-offset-4"
                      >
                        Política de envíos
                      </button>
                    </span>
                    <span className="hidden sm:inline">
                      Acepto la{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModalKey("shipping-policy")}
                        className="intra-body-strong text-intra-text-success underline underline-offset-4"
                      >
                        Política de Envíos y Artículos Prohibidos
                      </button>
                      .
                    </span>
                  </span>
                </div>
              ) : null}

              <div className="flex items-start gap-3 intra-body text-intra-text-subtle">
                <input
                  id="payment-conditions-acceptance"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-intra-border text-intra-text-success focus:ring-intra-text-success"
                  checked={acceptedPaymentConditions}
                  onChange={(event) => setAcceptedPaymentConditions(event.target.checked)}
                />
                <span className="leading-6">
                  <span className="whitespace-nowrap sm:hidden">
                    Acepto la{" "}
                    <button
                      type="button"
                      onClick={() => setLegalModalKey("payments-policy")}
                      className="intra-body-strong text-intra-text-success underline underline-offset-4"
                    >
                      Política de pagos
                    </button>
                  </span>
                  <span className="hidden sm:inline">
                    Acepto la{" "}
                    <button
                      type="button"
                      onClick={() => setLegalModalKey("payments-policy")}
                      className="intra-body-strong text-intra-text-success underline underline-offset-4"
                    >
                      Política de Pagos, Retenciones, Reembolsos y Disputas
                    </button>
                    .
                  </span>
                </span>
              </div>
            </div>

          </div>

          <aside className="rounded-[24px] border border-intra-border-soft bg-intra-card p-3.5 shadow-sm sm:p-4 lg:sticky lg:top-16">
            <div>
              <p className="intra-badge-text uppercase text-intra-text-muted">
                Resumen de pago
              </p>
            </div>

            <div className="mt-2.5 space-y-2 rounded-[24px] bg-intra-bg-app p-3">
              <div className="flex items-center justify-between gap-4 intra-body text-intra-text-subtle">
                <span>Valor del transporte</span>
                <span className="intra-body-strong">{formatCurrency(travelerAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 intra-body text-intra-text-subtle">
                <span>Servicio de plataforma</span>
                <span className="intra-body-strong">{formatCurrency(intraFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 intra-body text-intra-text-subtle">
                <span>Procesamiento de pago</span>
                <span className="intra-body-strong">{formatCurrency(gatewayFee)}</span>
              </div>
            </div>

            <div className="mt-3 rounded-[24px] bg-intra-blue px-3.5 py-4 text-intra-card">
              <p className="intra-caption uppercase text-intra-card/70">Total a pagar</p>
              <p className="mt-1.5 text-center intra-metric text-intra-green">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            {errorMsg ? (
              <div className="mt-4 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 intra-body-strong text-intra-danger">
                {errorMsg}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePayment}
              disabled={loading}
              className="intra-btn intra-btn-primary mt-3 w-full"
            >
              {loading ? "Preparando checkout..." : "Pagar con Wompi"}
            </button>

          </aside>
        </section>
      </div>
    </main>
    <LegalDocumentModal
      documentKey={legalModalKey}
      documents={legalDocuments}
      titleId="checkout-legal-modal-title"
      onClose={() => setLegalModalKey(null)}
      onAcceptAndContinue={() => {
        if (legalModalKey === "shipping-policy") {
          setAcceptedDeclaration(true)
        } else {
          setAcceptedPaymentConditions(true)
        }

        setLegalModalKey(null)
      }}
    />
    </>
  )
}
