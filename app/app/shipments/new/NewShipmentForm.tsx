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
import { createClient } from "@/lib/supabase/client"

type City = {
  id: string
  name: string
  department: string
  iata_code: string | null
}

type ShipmentKind = "document" | "package" | "ecommerce"

type RoutePricing = {
  routeCategory: RouteCategory
  travelerPrice: number
  customerPrice: number
}

type FormErrors = {
  originCityId?: string
  destinationCityId?: string
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
    <div className="mb-3 flex items-start gap-2.5">
      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-2xl bg-[#EAFBF1] text-[12px] font-bold text-[#1E8C4E]">
        {step}
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-[#0B2C4A]">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-4 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function PreferenceToggle({ label, value, onChange, icon: Icon }: PreferenceToggleProps) {
  return (
    <div className="rounded-[16px] border border-[#E3EDF5] bg-[#FCFEFF] px-2.5 py-2">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[#0B2C4A]">
        <Icon className="h-3.5 w-3.5 text-[#0B2C4A]" />
        <span>{label}</span>
      </div>

      <div className="inline-flex rounded-full border border-[#D7E5F1] bg-[#F3F7FA] p-1 shadow-[inset_0_1px_2px_rgba(11,44,74,0.06)]">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`min-w-[56px] rounded-full px-3 py-0.5 text-[11px] font-semibold transition ${
            value ? "bg-[#2ECC71] text-white shadow-sm" : "text-slate-500"
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`min-w-[56px] rounded-full px-3 py-0.5 text-[11px] font-semibold transition ${
            !value ? "bg-white text-[#0B2C4A] shadow-sm" : "text-slate-500"
          }`}
        >
          No
        </button>
      </div>
    </div>
  )
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
    <div className="rounded-[16px] border border-[#E3EDF5] bg-[linear-gradient(180deg,#F9FCFE_0%,#F3F8FC_100%)] px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="flex min-w-[54px] flex-col items-center text-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#2ECC71] shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-[#0B2C4A]">{originName}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{originCode}</span>
        </div>

        <div className="relative h-px flex-1 border-t border-dashed border-[#8EC6AE]">
          <div className="absolute left-1/2 top-1/2 flex h-6.5 w-6.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D7E5F1] bg-white text-[#2ECC71] shadow-sm">
            <PackageCheck className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="flex min-w-[54px] flex-col items-center text-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#2ECC71] shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-[#0B2C4A]">{destinationName}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{destinationCode}</span>
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
  const [kind, setKind] = useState<ShipmentKind>("document")
  const [description, setDescription] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [declaredValueCop, setDeclaredValueCop] = useState("")
  const [isFragile, setIsFragile] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)
  const [isHighValue, setIsHighValue] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const [routePricing, setRoutePricing] = useState<RoutePricing | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const quoteLoading = false

  const cityOptions = useMemo(() => cities, [cities])
  const citiesById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities])

  const originCity = originCityId ? citiesById.get(originCityId) ?? null : null
  const destinationCity = destinationCityId ? citiesById.get(destinationCityId) ?? null : null

  const getInlineErrors = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      description: string
      weightKg: string
      declaredValueCop: string
    }>
  ) => {
    const nextOriginCityId = overrides?.originCityId ?? originCityId
    const nextDestinationCityId = overrides?.destinationCityId ?? destinationCityId
    const nextDescription = overrides?.description ?? description
    const nextWeightKg = overrides?.weightKg ?? weightKg
    const nextDeclaredValueCop = overrides?.declaredValueCop ?? declaredValueCop

    const nextErrors: FormErrors = {}

    if (nextOriginCityId && nextDestinationCityId && nextOriginCityId === nextDestinationCityId) {
      nextErrors.destinationCityId = "Origen y destino no pueden ser iguales."
    }

    if (nextDescription.trim().length > 0 && nextDescription.trim().length < 8) {
      nextErrors.description = "Describe mejor el envío para que el viajero lo entienda."
    }

    const weight = parseNormalizedNumber(nextWeightKg)
    if (weight === null) {
      nextErrors.weightKg = "El peso es obligatorio."
    } else if (weight < 0.1) {
      nextErrors.weightKg = "Ingresa un peso válido de al menos 0.1 kg."
    }

    const declared = parseNormalizedNumber(nextDeclaredValueCop)
    if (declared === null) {
      nextErrors.declaredValueCop = "El valor declarado es obligatorio."
    } else if (declared < 0) {
      nextErrors.declaredValueCop = "Ingresa un valor declarado válido."
    }

    return nextErrors
  }

  const applyInlineValidation = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      description: string
      weightKg: string
      declaredValueCop: string
    }>
  ) => {
    const nextInlineErrors = getInlineErrors(overrides)

    setErrors((prev) => ({
      ...prev,
      destinationCityId: nextInlineErrors.destinationCityId,
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
  const paymentQuote: PaymentQuote | null = routeCategory
    ? buildFixedRouteQuote(routeCategory)
    : null

  const updateWeightKg = (rawValue: string) => {
    const nextValue = sanitizeDecimalInput(rawValue)
    setWeightKg(nextValue)
    applyInlineValidation({ weightKg: nextValue })
  }

  const updateDeclaredValueCop = (rawValue: string) => {
    const nextValue = sanitizeIntegerInput(rawValue)
    setDeclaredValueCop(nextValue)
    applyInlineValidation({ declaredValueCop: nextValue })
  }

  const swapRoute = () => {
    setOriginCityId(destinationCityId)
    setDestinationCityId(originCityId)
    applyInlineValidation({
      originCityId: destinationCityId,
      destinationCityId: originCityId,
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const nextErrors: FormErrors = getInlineErrors()

    if (!originCityId) {
      nextErrors.originCityId = "Selecciona la ciudad de origen."
    }

    if (!destinationCityId) {
      nextErrors.destinationCityId = "Selecciona la ciudad de destino."
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
    }

    if (declared === null) {
      nextErrors.declaredValueCop = "El valor declarado es obligatorio."
    } else if (declared < 0) {
      nextErrors.declaredValueCop = "Valor declarado inválido."
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
      setMsg("❌ Revisa los campos marcados antes de continuar.")
      return
    }

    const params = new URLSearchParams({
      originCityId,
      destinationCityId,
      kind,
      description: description.trim(),
      weightKg: String(weight ?? ""),
      declaredValueCop: String(declared ?? ""),
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

  const fieldBaseClassName =
    "w-full rounded-[13px] border border-[#D7E5F1] bg-white px-3 py-2 text-[13px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0B2C4A] focus:ring-4 focus:ring-[#0B2C4A]/10"

  const displayOriginName = originCity?.name ?? "N/A"
  const displayDestinationName = destinationCity?.name ?? "N/A"
  const displayOriginCode = originCity?.iata_code ?? "N/A"
  const displayDestinationCode = destinationCity?.iata_code ?? "N/A"
  const summaryRouteLabel =
    originCity && destinationCity
      ? `${originCity.name} → ${destinationCity.name}`
      : "Por definir"
  const kindSummary = shipmentKindMeta[kind]
  const KindSummaryIcon = kindSummary.icon
  const summaryChips = [
    { label: "Frágil", value: isFragile ? "Sí" : "No", icon: PackageCheck },
    { label: "Urgente", value: isUrgent ? "Sí" : "No", icon: Clock3 },
    { label: "Valor alto", value: isHighValue ? "Sí" : "No", icon: CircleDollarSign },
  ]

  const isReadyToContinue =
    Boolean(originCityId) &&
    Boolean(destinationCityId) &&
    originCityId !== destinationCityId &&
    Boolean(description.trim()) &&
    parseNormalizedNumber(weightKg) !== null &&
    parseNormalizedNumber(weightKg)! >= 0.1 &&
    parseNormalizedNumber(declaredValueCop) !== null &&
    routePricing !== null &&
    Boolean(paymentQuote?.success)

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.58fr)_340px] lg:items-start">
      <form onSubmit={onSubmit} className="min-w-0">
        <div className="rounded-[22px] border border-[#D7E5F1] bg-white p-3 shadow-[0_14px_34px_rgba(11,44,74,0.08)] sm:p-4 lg:p-4">
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
                  className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500"
                >
                  Origen
                </label>
                <select
                  id="shipment-origin-city"
                  name="originCityId"
                  className={`${fieldBaseClassName} ${errors.originCityId ? "border-red-300 bg-red-50" : ""}`}
                  value={originCityId}
                  onChange={(e) => {
                    setOriginCityId(e.target.value)
                    applyInlineValidation({ originCityId: e.target.value })
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
                  <p className="mt-1 text-[10px] text-red-600">{errors.originCityId}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={swapRoute}
                className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#D7E5F1] bg-[#F8FBFD] text-[#0B2C4A] shadow-sm transition hover:bg-white"
                aria-label="Intercambiar origen y destino"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <label
                  htmlFor="shipment-destination-city"
                  className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500"
                >
                  Destino
                </label>
                <select
                  id="shipment-destination-city"
                  name="destinationCityId"
                  className={`${fieldBaseClassName} ${errors.destinationCityId ? "border-red-300 bg-red-50" : ""}`}
                  value={destinationCityId}
                  onChange={(e) => {
                    setDestinationCityId(e.target.value)
                    applyInlineValidation({ destinationCityId: e.target.value })
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
                  <p className="mt-1 text-[10px] text-red-600">{errors.destinationCityId}</p>
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

          <section className="mt-3 border-t border-[#E9F0F6] pt-3">
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
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500"
                  >
                    Tipo de envío
                  </label>
                  <select
                    id="shipment-kind"
                    name="kind"
                    className={fieldBaseClassName}
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ShipmentKind)}
                  >
                    <option value="document">Documento</option>
                    <option value="package">Paquete</option>
                    <option value="ecommerce">Ecommerce</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="shipment-description"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="shipment-description"
                    name="description"
                    className={`${fieldBaseClassName} min-h-[92px] ${errors.description ? "border-red-300 bg-red-50" : ""}`}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      applyInlineValidation({ description: e.target.value })
                    }}
                    required
                    rows={3}
                    placeholder="Ej: Sobre con documentos, caja pequeña, accesorios, etc."
                  />
                  {errors.description ? (
                    <p className="mt-1 text-[10px] text-red-600">{errors.description}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Entre más clara sea la descripción, mejor para el viajero.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="shipment-weight-kg"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500"
                  >
                    Peso (kg)
                  </label>
                  <input
                    id="shipment-weight-kg"
                    name="weightKg"
                    className={`${fieldBaseClassName} ${errors.weightKg ? "border-red-300 bg-red-50" : ""}`}
                    type="text"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(e) => updateWeightKg(e.target.value)}
                    onInput={(e) => updateWeightKg(e.currentTarget.value)}
                    placeholder="Ej: 1.5"
                    required
                  />
                  {errors.weightKg ? (
                    <p className="mt-1 text-[10px] text-red-600">{errors.weightKg}</p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="shipment-declared-value"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500"
                  >
                    Valor declarado (COP)
                  </label>
                  <input
                    id="shipment-declared-value"
                    name="declaredValueCop"
                    className={`${fieldBaseClassName} ${errors.declaredValueCop ? "border-red-300 bg-red-50" : ""}`}
                    type="text"
                    inputMode="numeric"
                    value={declaredValueCop}
                    onChange={(e) => updateDeclaredValueCop(e.target.value)}
                    onInput={(e) => updateDeclaredValueCop(e.currentTarget.value)}
                    placeholder="Ej: 200000"
                    required
                  />
                  {errors.declaredValueCop ? (
                    <p className="mt-1 text-[10px] text-red-600">{errors.declaredValueCop}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-3 border-t border-[#E9F0F6] pt-3">
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

          {msg ? (
            <div
              className={`mt-3 rounded-[16px] border px-3.5 py-2 text-sm ${
                msg.startsWith("✅")
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {msg}
            </div>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#D7E5F1] bg-white/95 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mt-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
              <button
                disabled={loading || routeLoading || quoteLoading}
                className="inline-flex min-h-11 items-center justify-center rounded-[13px] bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(46,204,113,0.20)] transition hover:bg-[#29b765] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {loading ? "Procesando..." : "Continuar"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/app")}
                className="inline-flex min-h-11 items-center justify-center rounded-[13px] border border-[#D7E5F1] bg-white px-5 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F8FBFD] sm:flex-1"
              >
                <House className="mr-2 h-4 w-4" />
                Volver a inicio
              </button>
            </div>
          </div>
        </div>
      </form>

      <aside className="lg:h-full lg:min-h-0">
        <div className="rounded-[22px] border border-[#D7E5F1] bg-white p-3 shadow-[0_14px_34px_rgba(11,44,74,0.08)] lg:h-full lg:min-h-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-[#0B2C4A]">Resumen del envío</p>
            </div>
            <div
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isReadyToContinue
                  ? "bg-[#EAFBF1] text-[#1E8C4E]"
                  : "bg-amber-100 text-amber-700"
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

          <div className="mt-2 overflow-hidden rounded-[16px] border border-[#E3EDF5] bg-white">
            {[
              {
                label: "Ruta",
                icon: Route,
                value: summaryRouteLabel,
              },
              {
                label: "Tipo",
                icon: KindSummaryIcon,
                value: kindSummary.label,
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
                  index !== 0 ? "border-t border-[#E9F0F6]" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xl bg-[#F4F8FB] text-[#0B2C4A]">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="whitespace-nowrap text-[12px] text-slate-500">{item.label}</p>
                </div>
                <p
                  className={`max-w-[56%] truncate whitespace-nowrap text-right text-[12px] font-semibold leading-4 ${
                    item.value === "Por definir" ? "text-slate-400" : "text-[#0B2C4A]"
                  }`}
                  title={item.value}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {routeLoading ? (
            <div className="mt-2 rounded-[16px] border border-[#E3EDF5] bg-[#F8FBFD] px-3 py-2 text-[12px] text-slate-600">
              Consultando tarifa de la ruta...
            </div>
          ) : null}

          {!routeLoading && errors.route ? (
            <div className="mt-2 rounded-[16px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {errors.route}
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {summaryChips.map((chip) => (
              <div
                key={chip.label}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-[#D7E5F1] bg-[#FBFDFF] px-1.5 py-1 text-[10px] whitespace-nowrap text-slate-600"
              >
                <chip.icon className="h-2.5 w-2.5 shrink-0 text-[#0B2C4A]" />
                <span className="truncate">{chip.label}</span>
                <span className="font-semibold text-[#0B2C4A]">{chip.value}</span>
              </div>
            ))}
          </div>

          {travelerRouteAmount &&
          customerRouteAmount &&
          originCity &&
          destinationCity &&
          !routeLoading &&
          paymentQuote?.success ? (
            <div className="mt-2 rounded-[18px] border border-[#D7E5F1] bg-[#FBFDFF] p-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#EAFBF1] text-[#1E8C4E]">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0B2C4A]">Resumen del servicio</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Pago seguro con tarifa calculada para esta ruta.
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-[12px] text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Valor del transporte</span>
                  <span className="font-semibold text-[#0B2C4A]">
                    ${travelerRouteAmount.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Servicio de plataforma</span>
                  <span className="font-semibold text-[#0B2C4A]">
                    ${(paymentQuote.intra_fee ?? 0).toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Procesamiento de pago</span>
                  <span className="font-semibold text-[#0B2C4A]">
                    ${(paymentQuote.gateway_fee_estimated ?? 0).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              <div className="mt-3 border-t border-[#E9F0F6] pt-3">
                <p className="text-[11px] text-slate-500">Total a pagar</p>
                <p className="mt-1 text-[28px] font-bold leading-none text-[#2ECC71]">
                  ${(paymentQuote.amount ?? 0).toLocaleString("es-CO")}
                </p>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">
                  Pago seguro con retención temporal. El dinero se libera al viajero cuando confirmes la entrega. Si no lo haces, se liberará automáticamente en 48h.
                </p>
              </div>
            </div>
          ) : null}

          <div
            className={`mt-2 rounded-[16px] border p-2.5 ${
              isReadyToContinue
                ? "border-[#BEE8CD] bg-[#EFFBF4]"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${
                  isReadyToContinue ? "text-[#1E8C4E]" : "text-amber-700"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#0B2C4A]">
                  {isReadyToContinue ? "Todo listo para continuar" : "Completa los datos obligatorios"}
                </p>
                <p
                  className={`mt-0.5 text-[11px] leading-4 ${
                    isReadyToContinue ? "text-[#3B5B4B]" : "text-amber-800"
                  }`}
                >
                  Tu envío podrá pasar a checkout y luego publicarse para conectar con viajeros compatibles.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-1.5 rounded-[16px] border border-[#E3EDF5] bg-[#FBFDFF] px-2.5 py-2 text-[11px] leading-4 text-slate-500">
            <p className="font-medium text-[#0B2C4A]">Privacidad</p>
            <p className="mt-0.5">
              Tu información estará protegida y solo se compartirá con personas interesadas en la ruta y entrega.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
