"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightLeft,
  CircleDollarSign,
  Clock3,
  CreditCard,
  House,
  MapPinned,
  PackageCheck,
  Receipt,
  Route,
  Scale,
  ShieldCheck,
  ShoppingBag,
  FileText,
  Package,
} from "lucide-react"
import {
  buildFixedRouteQuote,
  isRouteCategory,
  type PaymentQuote,
  type RouteCategory,
} from "@/lib/payments/quote"
import {
  parseNormalizedNumber,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "@/lib/forms/numeric"
import {
  SHIPMENT_MAX_WEIGHT_KG,
  UNVERIFIED_DECLARED_VALUE_LIMIT_COP,
  VERIFIED_DECLARED_VALUE_LIMIT_COP,
} from "@/lib/shipments/security"
import { createClient } from "@/lib/supabase/client"

type City = {
  id: string
  name: string
  department: string
  iata_code: string | null
}

type ShipmentKind = "document" | "package" | "ecommerce"
type ShipmentKindValue = ShipmentKind | ""

type RoutePricing = {
  routeCategory: RouteCategory
  travelerPrice: number
  customerPrice: number
}

type VerificationState = {
  loaded: boolean
  isVerifiedV1: boolean
}

type FormErrors = {
  originCityId?: string
  destinationCityId?: string
  kind?: string
  description?: string
  weightKg?: string
  declaredValueCop?: string
  route?: string
}

type SectionHeaderProps = {
  step: string
  title: string
  description: string
}

type PreferenceToggleProps = {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  icon: typeof PackageCheck
}

function SectionHeader({ step, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-intra-success-soft intra-badge-text text-intra-text-success">
        {step}
      </div>
      <div>
        <h2 className="intra-h4">{title}</h2>
        <p className="mt-1 intra-caption text-intra-text-subtle">{description}</p>
      </div>
    </div>
  )
}

function PreferenceToggle({ label, value, onChange, icon: Icon }: PreferenceToggleProps) {
  return (
    <div className="rounded-2xl border border-intra-border-soft bg-intra-bg-app p-3">
      <div className="mb-3 flex items-center gap-2 intra-caption-strong text-intra-blue">
        <Icon className="h-3.5 w-3.5 text-intra-blue" />
        <span>{label}</span>
      </div>

      <div className="grid grid-cols-2 rounded-full border border-intra-border-strong bg-intra-card p-1 shadow-[inset_0_1px_2px_rgba(11,44,74,0.06)]">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-full px-3 py-1 intra-badge-text transition ${
            value ? "bg-intra-green text-intra-card shadow-sm" : "text-intra-text-subtle"
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-full px-3 py-1 intra-badge-text transition ${
            !value ? "bg-intra-card text-intra-blue shadow-sm" : "text-intra-text-subtle"
          }`}
        >
          No
        </button>
      </div>
    </div>
  )
}

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function RouteGraphic({
  originCode,
  destinationCode,
  originName,
  destinationName,
}: {
  originCode: string
  destinationCode: string
  originName: string
  destinationName: string
}) {
  return (
    <div className="rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-[54px] flex-col items-center text-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-intra-card text-intra-green shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-1 intra-caption-strong text-intra-blue">{originName}</span>
          <span className="intra-badge-text uppercase text-intra-text-muted/60">{originCode}</span>
        </div>

        <div className="relative h-px flex-1 border-t border-dashed border-intra-success-border">
          <div className="absolute left-1/2 top-1/2 flex h-6.5 w-6.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-intra-border-strong bg-intra-card text-intra-green shadow-sm">
            <PackageCheck className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="flex min-w-[54px] flex-col items-center text-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-intra-card text-intra-green shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-1 intra-caption-strong text-intra-blue">{destinationName}</span>
          <span className="intra-badge-text uppercase text-intra-text-muted/60">{destinationCode}</span>
        </div>
      </div>
    </div>
  )
}

const shipmentKindMeta: Record<
  ShipmentKind,
  { label: string; icon: typeof FileText }
> = {
  document: { label: "Documento", icon: FileText },
  package: { label: "Paquete", icon: Package },
  ecommerce: { label: "Ecommerce", icon: ShoppingBag },
}

export default function NewShipmentForm({ cities }: { cities: City[] }) {
  const supabase = createClient()
  const router = useRouter()

  const [originCityId, setOriginCityId] = useState("")
  const [destinationCityId, setDestinationCityId] = useState("")
  const [kind, setKind] = useState<ShipmentKindValue>("")
  const [description, setDescription] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [declaredValueCop, setDeclaredValueCop] = useState("")
  const [isFragile, setIsFragile] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)
  const [isHighValue, setIsHighValue] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const [routePricing, setRoutePricing] = useState<RoutePricing | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [verificationState, setVerificationState] = useState<VerificationState>({
    loaded: false,
    isVerifiedV1: false,
  })
  const quoteLoading = false

  const cityOptions = useMemo(() => cities, [cities])
  const citiesById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities])

  const originCity = originCityId ? citiesById.get(originCityId) ?? null : null
  const destinationCity = destinationCityId ? citiesById.get(destinationCityId) ?? null : null
  const declaredValueLimit = verificationState.isVerifiedV1
    ? VERIFIED_DECLARED_VALUE_LIMIT_COP
    : UNVERIFIED_DECLARED_VALUE_LIMIT_COP

  useEffect(() => {
    let cancelled = false

    const fetchVerificationState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) {
          setVerificationState({ loaded: true, isVerifiedV1: false })
        }
        return
      }

      const [profileRes, verificationRes] = await Promise.all([
        supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
        supabase.from("user_verifications").select("verification_status").eq("user_id", user.id).maybeSingle(),
      ])

      if (!cancelled) {
        setVerificationState({
          loaded: true,
          isVerifiedV1: Boolean(user.email_confirmed_at) &&
            Boolean(profileRes.data?.phone?.trim()) &&
            verificationRes.data?.verification_status === "verified",
        })
      }
    }

    fetchVerificationState()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const getInlineErrors = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      kind: ShipmentKindValue
      description: string
      weightKg: string
      declaredValueCop: string
    }>
  ) => {
    const nextOriginCityId = overrides?.originCityId ?? originCityId
    const nextDestinationCityId = overrides?.destinationCityId ?? destinationCityId
    const nextKind = overrides?.kind ?? kind
    const nextDescription = overrides?.description ?? description
    const nextWeightKg = overrides?.weightKg ?? weightKg
    const nextDeclaredValueCop = overrides?.declaredValueCop ?? declaredValueCop

    const nextErrors: FormErrors = {}

    if (nextOriginCityId && nextDestinationCityId && nextOriginCityId === nextDestinationCityId) {
      nextErrors.destinationCityId = "Origen y destino no pueden ser iguales."
    }

    if (!nextKind) {
      nextErrors.kind = "Selecciona el tipo de envío."
    }

    if (nextDescription.trim().length > 0 && nextDescription.trim().length < 8) {
      nextErrors.description = "Describe mejor el envío para que el viajero lo entienda."
    }

    const weight = parseNormalizedNumber(nextWeightKg)
    if (weight === null) {
      nextErrors.weightKg = "El peso es obligatorio."
    } else if (weight < 0.1) {
      nextErrors.weightKg = "Ingresa un peso válido de al menos 0.1 kg."
    } else if (weight > SHIPMENT_MAX_WEIGHT_KG) {
      nextErrors.weightKg = `El peso máximo permitido por envío es ${SHIPMENT_MAX_WEIGHT_KG} kg.`
    }

    const declared = parseNormalizedNumber(nextDeclaredValueCop)
    if (declared === null) {
      nextErrors.declaredValueCop = "El valor declarado es obligatorio."
    } else if (declared < 0) {
      nextErrors.declaredValueCop = "Ingresa un valor declarado válido."
    } else if (!verificationState.loaded && declared > UNVERIFIED_DECLARED_VALUE_LIMIT_COP) {
      nextErrors.declaredValueCop = "Estamos validando tu nivel de cuenta antes de permitir este valor declarado."
    } else if (declared > declaredValueLimit) {
      nextErrors.declaredValueCop = `El valor declarado máximo para tu cuenta es ${formatCop(declaredValueLimit)}.`
    }

    return nextErrors
  }

  const syncErrorsIfNeeded = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      kind: ShipmentKindValue
      description: string
      weightKg: string
      declaredValueCop: string
    }>
  ) => {
    if (!hasAttemptedSubmit) return

    const nextInlineErrors = getInlineErrors(overrides)

    setErrors((prev) => ({
      ...prev,
      destinationCityId: nextInlineErrors.destinationCityId,
      kind: nextInlineErrors.kind,
      description: nextInlineErrors.description,
      weightKg: nextInlineErrors.weightKg,
      declaredValueCop: nextInlineErrors.declaredValueCop,
      route: prev.route,
    }))
  }

  useEffect(() => {
    const fetchRoutePrice = async () => {
      if (!originCityId || !destinationCityId || originCityId === destinationCityId) {
        setRoutePricing(null)
        setErrors((prev) => ({ ...prev, route: undefined }))
        return
      }

      setRouteLoading(true)

      const { data, error } = await supabase
        .from("route_prices")
        .select("route_category")
        .eq("origin_city_id", originCityId)
        .eq("destination_city_id", destinationCityId)
        .eq("is_active", true)
        .maybeSingle()

      const routeCategory = isRouteCategory(data?.route_category)
        ? data.route_category
        : null
      const quote = routeCategory ? buildFixedRouteQuote(routeCategory) : null
      const travelerPrice = quote?.traveler_amount ?? null
      const customerPrice = quote?.amount ?? null

      if (
        error ||
        !data ||
        routeCategory === null ||
        travelerPrice === null ||
        customerPrice === null
      ) {
        setRoutePricing(null)
        setErrors((prev) => ({
          ...prev,
          route: data
            ? "La tarifa de esta ruta está incompleta."
            : "No hay tarifa configurada para esta ruta.",
        }))
        setRouteLoading(false)
        return
      }

      setErrors((prev) => ({ ...prev, route: undefined }))
      setRoutePricing({
        routeCategory,
        travelerPrice,
        customerPrice,
      })
      setRouteLoading(false)
    }

    fetchRoutePrice()
  }, [originCityId, destinationCityId, supabase])

  const travelerRouteAmount = routePricing?.travelerPrice ?? null
  const customerRouteAmount = routePricing?.customerPrice ?? null
  const routeCategory = routePricing?.routeCategory ?? null
  const routeCategoryLabel =
    routeCategory === "short" ? "Corta" : routeCategory === "medium" ? "Media" : routeCategory === "long" ? "Larga" : "disponible"
  const paymentQuote: PaymentQuote | null = routeCategory
    ? buildFixedRouteQuote(routeCategory)
    : null

  const updateWeightKg = (rawValue: string) => {
    const nextValue = sanitizeDecimalInput(rawValue)
    setWeightKg(nextValue)
    syncErrorsIfNeeded({ weightKg: nextValue })
  }

  const updateDeclaredValueCop = (rawValue: string) => {
    const nextValue = sanitizeIntegerInput(rawValue)
    setDeclaredValueCop(nextValue)
    syncErrorsIfNeeded({ declaredValueCop: nextValue })
  }

  const swapRoute = () => {
    setOriginCityId(destinationCityId)
    setDestinationCityId(originCityId)
    syncErrorsIfNeeded({
      originCityId: destinationCityId,
      destinationCityId: originCityId,
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    setHasAttemptedSubmit(true)

    const nextErrors: FormErrors = getInlineErrors()

    if (!originCityId) {
      nextErrors.originCityId = "Selecciona la ciudad de origen."
    }

    if (!destinationCityId) {
      nextErrors.destinationCityId = "Selecciona la ciudad de destino."
    }

    if (!kind) {
      nextErrors.kind = "Selecciona el tipo de envío."
    }

    if (!description.trim()) {
      nextErrors.description = "La descripción es obligatoria."
    } else if (description.trim().length < 8) {
      nextErrors.description = "Agrega un poco más de detalle para el viajero."
    }

    const weight = parseNormalizedNumber(weightKg)
    const declared = parseNormalizedNumber(declaredValueCop)

    if (weight === null) {
      nextErrors.weightKg = "El peso es obligatorio."
    } else if (weight < 0.1) {
      nextErrors.weightKg = "Ingresa un peso válido de al menos 0.1 kg."
    } else if (weight > SHIPMENT_MAX_WEIGHT_KG) {
      nextErrors.weightKg = `El peso máximo permitido por envío es ${SHIPMENT_MAX_WEIGHT_KG} kg.`
    }

    if (declared === null) {
      nextErrors.declaredValueCop = "El valor declarado es obligatorio."
    } else if (declared < 0) {
      nextErrors.declaredValueCop = "Valor declarado inválido."
    } else if (!verificationState.loaded && declared > UNVERIFIED_DECLARED_VALUE_LIMIT_COP) {
      nextErrors.declaredValueCop = "Estamos validando tu nivel de cuenta antes de permitir este valor declarado."
    } else if (declared > declaredValueLimit) {
      nextErrors.declaredValueCop = `El valor declarado máximo para tu cuenta es ${formatCop(declaredValueLimit)}.`
    }

    if (routePricing === null) {
      nextErrors.route = "No hay tarifa configurada para esa ruta."
    }

    if (!paymentQuote?.success || !paymentQuote.amount) {
      nextErrors.route =
        paymentQuote?.error === "below_minimum"
          ? `El valor mínimo del envío es ${new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            }).format(paymentQuote.minimum_amount ?? 20000)}.`
          : "No se pudo calcular el pago seguro para este envío."
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setLoading(false)
      setMsg("Revisa los campos marcados antes de continuar.")
      return
    }

    const params = new URLSearchParams({
      originCityId,
      destinationCityId,
      kind,
      description: description.trim(),
      weightKg: String(weight ?? ""),
      declaredValueCop: String(declared ?? ""),
      isFragile: String(isFragile),
      isUrgent: String(isUrgent),
      isHighValue: String(isHighValue),
      serviceAmount: String(travelerRouteAmount),
      totalAmount: String(paymentQuote?.amount ?? customerRouteAmount ?? 0),
      travelerAmount: String(paymentQuote?.traveler_amount ?? 0),
      routeCategory: routeCategory ?? "",
      gatewayFeeEstimated: String(paymentQuote?.gateway_fee_estimated ?? 0),
      intraFee: String(paymentQuote?.intra_fee ?? 0),
      netAmountReceived: String(paymentQuote?.net_amount_received ?? 0),
      autoReleaseHours: String(paymentQuote?.auto_release_hours ?? 48),
      disputeWindowHours: String(paymentQuote?.dispute_window_hours ?? 24),
      disputeSlaHours: String(paymentQuote?.dispute_sla_hours ?? 72),
      origin: originCity?.name ?? originCityId,
      destination: destinationCity?.name ?? destinationCityId,
      weight: String(weight ?? ""),
      declared: String(declared ?? ""),
    })

    router.push(`/app/payments/checkout?${params.toString()}`)
  }

  const fieldBaseClassName = "intra-input"

  const displayOriginName = originCity?.name ?? "N/A"
  const displayDestinationName = destinationCity?.name ?? "N/A"
  const displayOriginCode = originCity?.iata_code ?? "N/A"
  const displayDestinationCode = destinationCity?.iata_code ?? "N/A"
  const summaryRouteLabel =
    originCity && destinationCity
      ? `${originCity.name} → ${destinationCity.name}`
      : "Por definir"
  const kindSummary = kind ? shipmentKindMeta[kind] : null
  const KindSummaryIcon = kindSummary?.icon ?? Package
  const summaryChips = [
    { label: "Frágil", value: isFragile ? "Sí" : "No", icon: PackageCheck },
    { label: "Urgente", value: isUrgent ? "Sí" : "No", icon: Clock3 },
    { label: "Valor alto", value: isHighValue ? "Sí" : "No", icon: CircleDollarSign },
  ]

  const isReadyToContinue =
    Boolean(originCityId) &&
    Boolean(destinationCityId) &&
    originCityId !== destinationCityId &&
    Boolean(kind) &&
    Boolean(description.trim()) &&
    parseNormalizedNumber(weightKg) !== null &&
    parseNormalizedNumber(weightKg)! >= 0.1 &&
    parseNormalizedNumber(weightKg)! <= SHIPMENT_MAX_WEIGHT_KG &&
    parseNormalizedNumber(declaredValueCop) !== null &&
    verificationState.loaded &&
    parseNormalizedNumber(declaredValueCop)! <= declaredValueLimit &&
    routePricing !== null &&
    Boolean(paymentQuote?.success)

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.58fr)_340px] lg:items-start">
      <form onSubmit={onSubmit} className="min-w-0">
        <div className="rounded-[24px] border border-intra-border-strong bg-intra-card p-3 shadow-[var(--intra-shadow-base)] sm:p-4 lg:p-4">
          <section>
            <SectionHeader
              step="1"
              title="Ruta del envío"
              description="Selecciona desde qué ciudad sale y a cuál va tu envío."
            />

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] lg:items-end">
              <div className="min-w-0">
                <label
                  htmlFor="shipment-origin-city"
                  className="mb-1 block intra-badge-text uppercase text-intra-text-subtle"
                >
                  Origen
                </label>
                <select
                  id="shipment-origin-city"
                  name="originCityId"
                  className={`${fieldBaseClassName} ${errors.originCityId ? "intra-input-error" : ""}`}
                  value={originCityId}
                  onChange={(e) => {
                    setOriginCityId(e.target.value)
                    syncErrorsIfNeeded({ originCityId: e.target.value })
                  }}
                  required
                >
                  <option value="">Selecciona ciudad</option>
                  {cityOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.department})
                      {c.iata_code ? ` - ${c.iata_code}` : ""}
                    </option>
                  ))}
                </select>
                {errors.originCityId ? (
                  <p className="intra-field-error">{errors.originCityId}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={swapRoute}
                className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-intra-border-strong bg-intra-bg-app text-intra-blue shadow-sm transition hover:bg-intra-card"
                aria-label="Intercambiar origen y destino"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <label
                  htmlFor="shipment-destination-city"
                  className="mb-1 block intra-badge-text uppercase text-intra-text-subtle"
                >
                  Destino
                </label>
                <select
                  id="shipment-destination-city"
                  name="destinationCityId"
                  className={`${fieldBaseClassName} ${errors.destinationCityId ? "intra-input-error" : ""}`}
                  value={destinationCityId}
                  onChange={(e) => {
                    setDestinationCityId(e.target.value)
                    syncErrorsIfNeeded({ destinationCityId: e.target.value })
                  }}
                  required
                >
                  <option value="">Selecciona ciudad</option>
                  {cityOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.department})
                      {c.iata_code ? ` - ${c.iata_code}` : ""}
                    </option>
                  ))}
                </select>
                {errors.destinationCityId ? (
                  <p className="intra-field-error">{errors.destinationCityId}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-2">
              <RouteGraphic
                originCode={displayOriginCode}
                destinationCode={displayDestinationCode}
                originName={displayOriginName}
                destinationName={displayDestinationName}
              />
            </div>
          </section>

          <section className="mt-3 border-t border-intra-border-soft pt-3">
            <SectionHeader
              step="2"
              title="Información del envío"
              description="Cuéntanos qué vas a enviar y sus características."
            />

            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-[0.9fr_1.35fr]">
                <div>
                  <label
                    htmlFor="shipment-kind"
                    className="mb-1 block intra-badge-text uppercase text-intra-text-subtle"
                  >
                    Tipo de envío
                  </label>
                  <select
                    id="shipment-kind"
                    name="kind"
                    className={`${fieldBaseClassName} ${errors.kind ? "intra-input-error" : ""}`}
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value as ShipmentKindValue)
                      syncErrorsIfNeeded({ kind: e.target.value as ShipmentKindValue })
                    }}
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="document">Documento</option>
                    <option value="package">Paquete</option>
                    <option value="ecommerce">Ecommerce</option>
                  </select>
                  {errors.kind ? (
                    <p className="intra-field-error">{errors.kind}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="shipment-description"
                    className="mb-1 block intra-badge-text uppercase text-intra-text-subtle"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="shipment-description"
                    name="description"
                    className={`${fieldBaseClassName} h-[42px] resize-none ${errors.description ? "intra-input-error" : ""}`}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      syncErrorsIfNeeded({ description: e.target.value })
                    }}
                    required
                    rows={1}
                    placeholder="Ej: sobre con documentos o caja pequeña."
                  />
                  {errors.description ? (
                    <p className="intra-field-error">{errors.description}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="shipment-weight-kg"
                    className="mb-1 block intra-badge-text uppercase text-intra-text-subtle"
                  >
                    Peso (kg)
                  </label>
                  <input
                    id="shipment-weight-kg"
                    name="weightKg"
                    className={`${fieldBaseClassName} ${errors.weightKg ? "intra-input-error" : ""}`}
                    type="text"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(e) => updateWeightKg(e.target.value)}
                    onInput={(e) => updateWeightKg(e.currentTarget.value)}
                    placeholder="Ej: 1.5"
                    required
                  />
                  {errors.weightKg ? (
                    <p className="intra-field-error">{errors.weightKg}</p>
                  ) : (
                    <p className="mt-1 intra-caption text-intra-text-muted">Máximo {SHIPMENT_MAX_WEIGHT_KG} kg por envío.</p>
                  )}
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="shipment-declared-value"
                    className="mb-1 block intra-badge-text uppercase text-intra-text-subtle"
                  >
                    Valor declarado (COP)
                  </label>
                  <input
                    id="shipment-declared-value"
                    name="declaredValueCop"
                    className={`${fieldBaseClassName} ${errors.declaredValueCop ? "intra-input-error" : ""}`}
                    type="text"
                    inputMode="numeric"
                    value={declaredValueCop}
                    onChange={(e) => updateDeclaredValueCop(e.target.value)}
                    onInput={(e) => updateDeclaredValueCop(e.currentTarget.value)}
                    placeholder="Ej: 200000"
                    required
                  />
                  {errors.declaredValueCop ? (
                    <p className="intra-field-error">{errors.declaredValueCop}</p>
                  ) : (
                    <p className="mt-1 intra-caption text-intra-text-muted">
                      Límite actual: {formatCop(declaredValueLimit)}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-3 border-t border-intra-border-soft pt-3">
            <SectionHeader
              step="3"
              title="Detalles adicionales"
              description="Indícanos preferencias especiales para tu envío."
            />

            <div className="grid gap-3 md:grid-cols-3">
              <PreferenceToggle
                label="Frágil"
                value={isFragile}
                onChange={setIsFragile}
                icon={PackageCheck}
              />
              <PreferenceToggle
                label="Urgente"
                value={isUrgent}
                onChange={setIsUrgent}
                icon={Clock3}
              />
              <PreferenceToggle
                label="Valor alto"
                value={isHighValue}
                onChange={setIsHighValue}
                icon={CircleDollarSign}
              />
            </div>
          </section>

          <div className="mt-3 rounded-2xl border border-intra-success-border bg-intra-success-soft px-3.5 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-intra-card text-intra-text-success shadow-sm">
                <PackageCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="intra-body-strong text-intra-blue">Foto inicial obligatoria</p>
                <p className="mt-1 intra-caption text-intra-text-subtle">
                  Subirás la foto del paquete en el checkout.
                </p>
              </div>
            </div>
          </div>

          {msg ? (
            <div className="mt-3 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-3.5 py-2 intra-body text-intra-danger">
              {msg}
            </div>
          ) : null}

          <div className="mt-3">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
              <button
                disabled={loading || routeLoading || quoteLoading}
                className="intra-btn intra-btn-primary w-full sm:flex-1"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {loading ? "Procesando..." : "Continuar al checkout"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/app")}
                className="intra-btn intra-btn-secondary w-full sm:flex-1"
              >
                <House className="mr-2 h-4 w-4" />
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      </form>

      <aside className="lg:h-full lg:min-h-0">
        <div className="rounded-[24px] border border-intra-border-strong bg-intra-card p-3 shadow-[var(--intra-shadow-base)] lg:h-full lg:min-h-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="intra-h4">Resumen del envío</p>
            </div>
            <div
              className={`intra-badge ${
                isReadyToContinue
                  ? "intra-badge-success"
                  : "intra-badge-warning"
              }`}
            >
              {isReadyToContinue ? "Listo" : "Pendiente"}
            </div>
          </div>

          <div className="mt-3">
            <RouteGraphic
              originCode={displayOriginCode}
              destinationCode={displayDestinationCode}
              originName={displayOriginName}
              destinationName={displayDestinationName}
            />
          </div>

          <div className="mt-2 overflow-hidden rounded-2xl border border-intra-border-soft bg-intra-card">
            {[
              {
                label: "Ruta",
                icon: Route,
                value: summaryRouteLabel,
              },
              {
                label: "Tipo",
                icon: KindSummaryIcon,
                value: kindSummary?.label ?? "Por definir",
              },
              {
                label: "Peso",
                icon: Scale,
                value: weightKg.trim() ? `${weightKg} kg` : "Por definir",
              },
              {
                label: "Declarado",
                icon: CircleDollarSign,
                value: declaredValueCop.trim()
                  ? new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(Number(declaredValueCop))
                  : "Por definir",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-2.5 px-2.5 py-2 ${
                  index !== 0 ? "border-t border-intra-border-soft" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xl bg-intra-bg-app text-intra-blue">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="whitespace-nowrap intra-caption text-intra-text-subtle">{item.label}</p>
                </div>
                <p
                  className={`max-w-[56%] truncate whitespace-nowrap text-right intra-caption-strong ${
                    item.value === "Por definir" ? "text-intra-text-muted/60" : "text-intra-blue"
                  }`}
                  title={item.value}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {routeLoading ? (
            <div className="mt-2 rounded-2xl border border-intra-border-soft bg-intra-bg-app px-3 py-2 intra-caption text-intra-text-subtle">
              Consultando tarifa de la ruta...
            </div>
          ) : null}

          {!routeLoading && errors.route ? (
            <div className="mt-2 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-3 py-2 intra-caption text-intra-danger">
              {errors.route}
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {summaryChips.map((chip) => (
              <div
                key={chip.label}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-intra-border-strong bg-intra-card px-2 py-1 intra-badge-text whitespace-nowrap text-intra-text-subtle"
              >
                <chip.icon className="h-2.5 w-2.5 shrink-0 text-intra-blue" />
                <span className="truncate">{chip.label}</span>
                <span className="intra-badge-text text-intra-blue">{chip.value}</span>
              </div>
            ))}
          </div>

          {travelerRouteAmount &&
          customerRouteAmount &&
          originCity &&
          destinationCity &&
          !routeLoading &&
          paymentQuote?.success ? (
            <div className="mt-2 rounded-2xl border border-intra-border-strong bg-intra-card p-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-intra-success-soft text-intra-text-success">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <p className="intra-body-strong text-intra-blue">Resumen del servicio</p>
                  <p className="mt-1 intra-caption text-intra-text-subtle">
                    Pago seguro con tarifa operativa incluida.
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2 intra-caption text-intra-text-subtle">
                <div className="flex items-center justify-between gap-3">
                  <span>Tarifa operativa incluida</span>
                  <span className="intra-caption-strong text-intra-blue">
                    Ruta {routeCategoryLabel.toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="mt-3 border-t border-intra-border-soft pt-3">
                <p className="intra-badge-text text-intra-text-subtle">Total a pagar</p>
                <p className="mt-1 intra-metric text-intra-green">
                  ${(paymentQuote.amount ?? 0).toLocaleString("es-CO")}
                </p>
                <p className="mt-2 intra-caption text-intra-text-subtle">
                  Pago protegido. Total con tarifa operativa incluida.
                </p>
              </div>
            </div>
          ) : null}

          <div
            className={`mt-2 rounded-2xl border p-2.5 ${
              isReadyToContinue
                ? "border-intra-success-border bg-intra-success-soft"
                : "border-intra-warning-border bg-intra-warning-soft"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xl bg-intra-card shadow-sm ${
                  isReadyToContinue ? "text-intra-text-success" : "text-intra-warning-text"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="intra-body-strong text-intra-blue">
                  {isReadyToContinue ? "Todo listo para continuar" : "Completa los datos obligatorios"}
                </p>
                <p
                  className={`mt-1 intra-caption ${
                    isReadyToContinue ? "text-intra-text-subtle" : "text-intra-warning-text"
                  }`}
                >
                  Tu envío podrá pasar al checkout seguro.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-intra-border-soft bg-intra-card px-3 py-2 intra-caption text-intra-text-subtle">
            <p className="intra-caption-strong text-intra-blue">Privacidad</p>
            <p className="mt-0.5">
              Tu información estará protegida y solo se compartirá con personas interesadas en la ruta y entrega.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
