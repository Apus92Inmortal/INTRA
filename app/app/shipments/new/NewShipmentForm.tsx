"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { parsePaymentQuote, type PaymentQuote } from "@/lib/payments/quote"
import { createClient } from "@/lib/supabase/client"

type City = {
  id: string
  name: string
  department: string
  iata_code: string | null
}

type ShipmentKind = "document" | "package" | "ecommerce"

type FormErrors = {
  originCityId?: string
  destinationCityId?: string
  description?: string
  weightKg?: string
  declaredValueCop?: string
  route?: string
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

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const [routeBasePrice, setRouteBasePrice] = useState<number | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [paymentQuote, setPaymentQuote] = useState<PaymentQuote | null>(null)

  const cityOptions = useMemo(() => cities, [cities])

  const originCity = cityOptions.find((c) => c.id === originCityId) ?? null
  const destinationCity =
    cityOptions.find((c) => c.id === destinationCityId) ?? null

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

    if (nextWeightKg.trim()) {
      const weight = Number(nextWeightKg)
      if (Number.isNaN(weight) || weight <= 0) {
        nextErrors.weightKg = "Ingresa un peso válido mayor a 0."
      }
    }

    if (nextDeclaredValueCop.trim()) {
      const declared = Number(nextDeclaredValueCop)
      if (Number.isNaN(declared) || declared < 0) {
        nextErrors.declaredValueCop = "Ingresa un valor declarado válido."
      }
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
        setRouteBasePrice(null)
        setErrors((prev) => ({ ...prev, route: undefined }))
        return
      }

      setRouteLoading(true)

      const { data, error } = await supabase
        .from("route_prices")
        .select("base_price")
        .eq("origin_city_id", originCityId)
        .eq("destination_city_id", destinationCityId)
        .eq("is_active", true)
        .maybeSingle()

      if (error || !data) {
        setRouteBasePrice(null)
        setErrors((prev) => ({
          ...prev,
          route: "No hay tarifa configurada para esta ruta.",
        }))
        setRouteLoading(false)
        return
      }

      setErrors((prev) => ({ ...prev, route: undefined }))
      setRouteBasePrice(data.base_price)
      setRouteLoading(false)
    }

    fetchRoutePrice()
  }, [originCityId, destinationCityId, supabase])

  const getKindPrice = () => {
    switch (kind) {
      case "document":
        return 4000
      case "package":
        return 8000
      case "ecommerce":
        return 10000
      default:
        return 0
    }
  }

  const serviceAmount = routeBasePrice !== null ? routeBasePrice + getKindPrice() : null

  useEffect(() => {
    const fetchQuote = async () => {
      if (serviceAmount === null) {
        setPaymentQuote(null)
        return
      }

      setQuoteLoading(true)

      const { data, error } = await supabase.rpc("calculate_payment_amount", {
        p_base_amount: serviceAmount,
      })

      const nextQuote = parsePaymentQuote(data)

      if (error || !nextQuote || !nextQuote.success) {
        const nextMessage =
          nextQuote?.error === "below_minimum"
            ? `El valor mínimo del envío es ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(nextQuote.minimum_amount ?? 20000)}.`
            : "No se pudo calcular el cobro total para esta ruta."

        setPaymentQuote(nextQuote)
        setErrors((prev) => ({ ...prev, route: nextMessage }))
        setQuoteLoading(false)
        return
      }

      setPaymentQuote(nextQuote)
      setErrors((prev) => ({ ...prev, route: undefined }))
      setQuoteLoading(false)
    }

    fetchQuote()
  }, [serviceAmount, supabase])

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

    const weight = weightKg.trim() ? Number(weightKg) : null
    const declared = declaredValueCop.trim() ? Number(declaredValueCop) : null

    if (weight !== null && (Number.isNaN(weight) || weight <= 0)) {
      nextErrors.weightKg = "Peso inválido."
    }

    if (declared !== null && (Number.isNaN(declared) || declared < 0)) {
      nextErrors.declaredValueCop = "Valor declarado inválido."
    }

    if (routeBasePrice === null) {
      nextErrors.route = "No hay tarifa configurada para esa ruta."
    }

    if (!paymentQuote?.success || !paymentQuote.amount) {
      nextErrors.route =
        paymentQuote?.error === "below_minimum"
          ? `El valor mínimo del envío es ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(paymentQuote.minimum_amount ?? 20000)}.`
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
      weightKg,
      declaredValueCop,
      serviceAmount: String(serviceAmount),
      totalAmount: String(paymentQuote?.amount ?? 0),
      travelerAmount: String(paymentQuote?.traveler_amount ?? 0),
      gatewayFeeEstimated: String(paymentQuote?.gateway_fee_estimated ?? 0),
      intraFee: String(paymentQuote?.intra_fee ?? 0),
      netAmountReceived: String(paymentQuote?.net_amount_received ?? 0),
      autoReleaseHours: String(paymentQuote?.auto_release_hours ?? 48),
      disputeWindowHours: String(paymentQuote?.dispute_window_hours ?? 24),
      disputeSlaHours: String(paymentQuote?.dispute_sla_hours ?? 72),
      origin: originCity?.name ?? originCityId,
      destination: destinationCity?.name ?? destinationCityId,
      weight: weightKg,
      declared: declaredValueCop,
    })

    router.push(`/app/payments/checkout?${params.toString()}`)
  }

  const fieldBaseClassName =
    "w-full rounded-2xl border bg-white px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-28 sm:pb-0">
      <div>
        <h2 className="text-base font-semibold text-[#0B2C4A]">
          Ruta del envío
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona desde qué ciudad sale y a cuál va.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Origen
            </label>
            <select
              className={`${fieldBaseClassName} ${errors.originCityId ? "border-red-300 bg-red-50" : "border-gray-300"}`}
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
              <p className="mt-2 text-sm text-red-600">{errors.originCityId}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Destino
            </label>
            <select
              className={`${fieldBaseClassName} ${errors.destinationCityId ? "border-red-300 bg-red-50" : "border-gray-300"}`}
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
              <p className="mt-2 text-sm text-red-600">{errors.destinationCityId}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-base font-semibold text-[#0B2C4A]">
          Información del envío
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tipo de envío
            </label>
            <select
              className={`${fieldBaseClassName} border-gray-300`}
              value={kind}
              onChange={(e) => setKind(e.target.value as ShipmentKind)}
            >
              <option value="document">Documento</option>
              <option value="package">Paquete</option>
              <option value="ecommerce">Ecommerce</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              className={`${fieldBaseClassName} min-h-28 ${errors.description ? "border-red-300 bg-red-50" : "border-gray-300"}`}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                applyInlineValidation({ description: e.target.value })
              }}
              required
              rows={4}
              placeholder="Ej: Sobre con documentos, caja pequeña, accesorios, etc."
            />
            {errors.description ? (
              <p className="mt-2 text-sm text-red-600">{errors.description}</p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Entre más clara sea la descripción, mejor para el viajero.</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Peso (kg)
            </label>
            <input
              className={`${fieldBaseClassName} ${errors.weightKg ? "border-red-300 bg-red-50" : "border-gray-300"}`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={weightKg}
              onChange={(e) => {
                setWeightKg(e.target.value)
                applyInlineValidation({ weightKg: e.target.value })
              }}
              placeholder="Ej: 1.5"
            />
            {errors.weightKg ? (
              <p className="mt-2 text-sm text-red-600">{errors.weightKg}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Valor declarado (COP)
            </label>
            <input
              className={`${fieldBaseClassName} ${errors.declaredValueCop ? "border-red-300 bg-red-50" : "border-gray-300"}`}
              type="number"
              inputMode="numeric"
              min="0"
              value={declaredValueCop}
              onChange={(e) => {
                setDeclaredValueCop(e.target.value)
                applyInlineValidation({ declaredValueCop: e.target.value })
              }}
              placeholder="Ej: 200000"
            />
            {errors.declaredValueCop ? (
              <p className="mt-2 text-sm text-red-600">{errors.declaredValueCop}</p>
            ) : null}
          </div>
        </div>
      </div>

      {routeLoading && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Consultando tarifa de la ruta...
        </div>
      )}

      {serviceAmount && originCity && destinationCity && !routeLoading && paymentQuote?.success && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-[#0B2C4A]">
            💰 Resumen del servicio
          </h3>

          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-800">Ruta:</span>{" "}
              {originCity.name} → {destinationCity.name}
            </p>
            <p>
              <span className="font-medium text-gray-800">Tipo:</span>{" "}
              {kind === "document"
                ? "Documento"
                : kind === "package"
                  ? "Paquete"
                  : "Ecommerce"}
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between gap-4">
                <span>Valor para el viajero</span>
                <span className="font-medium text-gray-800">
                  ${serviceAmount.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Comisión INTRA</span>
                <span className="font-medium text-gray-800">
                  ${(paymentQuote.intra_fee ?? 0).toLocaleString("es-CO")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Fee de pasarela (estimado)</span>
                <span className="font-medium text-gray-800">
                  ${(paymentQuote.gateway_fee_estimated ?? 0).toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">Total a pagar</p>
              <p className="mt-1 text-3xl font-bold text-[#2ECC71]">
                ${(paymentQuote.amount ?? 0).toLocaleString("es-CO")}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Pago seguro con retención temporal. El dinero se libera al viajero cuando confirmes la entrega. Si no lo haces, se liberará automáticamente en 48h.
              </p>
            </div>
          </div>
        </div>
      )}

      {!routeLoading && errors.route ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ❌ {errors.route}
        </div>
      ) : null}

      {msg ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            msg.startsWith("✅")
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
          <button
            disabled={loading || routeLoading || quoteLoading}
            className="min-h-11 rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:flex-1"
          >
            {loading ? "Procesando..." : "Continuar"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/app")}
            className="min-h-11 rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:flex-1"
          >
            Volver
          </button>
        </div>
      </div>
    </form>
  )
}
