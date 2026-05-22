"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Clock3,
  Hash,
  House,
  Luggage,
  MapPinned,
  PackageCheck,
  PlaneTakeoff,
  Route,
  ShieldCheck,
} from "lucide-react"
import { parseNormalizedNumber, sanitizeDecimalInput } from "@/lib/forms/numeric"
import { createClient } from "@/lib/supabase/client"

type City = {
  id: string
  name: string
  department: string
  iata_code: string | null
}

type FormErrors = {
  originCityId?: string
  destinationCityId?: string
  departureDate?: string
  departureTime?: string
  capacityKg?: string
  flightNumber?: string
}

type PreferenceToggleProps = {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

const tripPublishErrorMessages: Record<string, string> = {
  invalid_capacity: "La capacidad del viaje debe ser mayor a 0 kg.",
  invalid_departure_date: "Elige una fecha de hoy en adelante.",
  not_authenticated: "Inicia sesión para publicar tu viaje.",
  route_required: "Selecciona ciudad de origen y destino.",
  same_route: "El origen y destino no pueden ser iguales.",
}

function getTripPublishErrorMessage(error: unknown) {
  if (typeof error !== "string") {
    return "No se pudo publicar el viaje. Inténtalo nuevamente."
  }

  return tripPublishErrorMessages[error] ?? "No se pudo publicar el viaje. Inténtalo nuevamente."
}

function PreferenceToggle({ label, value, onChange }: PreferenceToggleProps) {
  return (
    <div className="rounded-2xl border border-intra-border-soft bg-intra-card px-2.5 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate whitespace-nowrap text-[11px] font-medium leading-4 text-intra-blue">{label}</p>

        <div className="inline-flex rounded-full border border-intra-border-strong bg-intra-bg-app p-1 shadow-[inset_0_1px_2px_rgba(11,44,74,0.06)]">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`min-w-[44px] rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              value ? "bg-intra-green text-intra-card shadow-sm" : "text-intra-text-subtle"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`min-w-[44px] rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              !value ? "bg-intra-card text-intra-blue shadow-sm" : "text-intra-text-subtle"
            }`}
          >
            No
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="mb-2.5 flex items-start gap-2">
      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-2xl bg-intra-success-soft text-[12px] font-bold text-intra-text-success">
        {step}
      </div>
      <div>
        <h2 className="text-[14px] font-semibold text-intra-blue sm:text-[15px]">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-4 text-intra-text-subtle [@media(min-width:1024px)_and_(max-height:900px)]:hidden">
          {description}
        </p>
      </div>
    </div>
  )
}

function AirRouteGraphic({
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
    <div className="rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt px-3 py-2 [@media(min-width:1024px)_and_(max-height:820px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:820px)]:py-1.5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-[54px] flex-col items-center text-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-intra-card text-intra-green shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-intra-blue">{originName}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-intra-text-muted/60">{originCode}</span>
        </div>

        <div className="relative h-px flex-1 border-t border-dashed border-intra-success-border">
          <div className="absolute left-1/2 top-1/2 flex h-6.5 w-6.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-intra-border-strong bg-intra-card text-intra-green shadow-sm">
            <PlaneTakeoff className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="flex min-w-[54px] flex-col items-center text-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-intra-card text-intra-green shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-intra-blue">{destinationName}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-intra-text-muted/60">{destinationCode}</span>
        </div>
      </div>
    </div>
  )
}

export default function NewTripForm({ cities }: { cities: City[] }) {
  const supabase = createClient()
  const router = useRouter()

  const [originCityId, setOriginCityId] = useState("")
  const [destinationCityId, setDestinationCityId] = useState("")
  const [departureDate, setDepartureDate] = useState("")
  const [departureTime, setDepartureTime] = useState("")
  const [capacityKg, setCapacityKg] = useState("")
  const [flightNumber, setFlightNumber] = useState("")
  const [acceptsFragile, setAcceptsFragile] = useState(false)
  const [acceptsMultiplePackages, setAcceptsMultiplePackages] = useState(false)
  const [hasStopovers, setHasStopovers] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const fieldBaseClassName =
    "block w-full min-w-0 max-w-full rounded-2xl border border-intra-border-strong bg-intra-card px-3 py-1.5 text-[13px] text-intra-blue outline-none transition placeholder:text-intra-text-muted/60 focus:border-intra-blue focus:ring-4 focus:ring-intra-blue/10 [@media(min-width:1024px)_and_(max-height:900px)]:py-1.5 [@media(min-width:1024px)_and_(max-height:900px)]:text-[12px] [@media(min-width:1024px)_and_(max-height:820px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:820px)]:py-1 [@media(min-width:1024px)_and_(max-height:760px)]:text-[11px]";

  const nativeDateTimeFieldClassName =
    `${fieldBaseClassName} appearance-none overflow-hidden pr-3 [color-scheme:light] [&::-webkit-date-and-time-value]:text-left [&::-webkit-calendar-picker-indicator]:shrink-0`

  const cityOptions = useMemo(() => cities, [cities])
  const citiesById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities])

  const originCity = originCityId ? citiesById.get(originCityId) ?? null : null
  const destinationCity = destinationCityId ? citiesById.get(destinationCityId) ?? null : null
  const capacityValue = parseNormalizedNumber(capacityKg)

  const getValidationErrors = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      departureDate: string
      departureTime: string
      capacityKg: string
      flightNumber: string
    }>
  ) => {
    const nextOriginCityId = overrides?.originCityId ?? originCityId
    const nextDestinationCityId = overrides?.destinationCityId ?? destinationCityId
    const nextDepartureDate = overrides?.departureDate ?? departureDate
    const nextDepartureTime = overrides?.departureTime ?? departureTime
    const nextCapacityKg = overrides?.capacityKg ?? capacityKg
    const nextFlightNumber = overrides?.flightNumber ?? flightNumber

    const nextErrors: FormErrors = {}

    if (!nextOriginCityId) {
      nextErrors.originCityId = "Selecciona la ciudad de origen."
    }

    if (!nextDestinationCityId) {
      nextErrors.destinationCityId = "Selecciona la ciudad de destino."
    }

    if (nextOriginCityId && nextDestinationCityId && nextOriginCityId === nextDestinationCityId) {
      nextErrors.destinationCityId = "Origen y destino no pueden ser iguales."
    }

    if (!nextDepartureDate) {
      nextErrors.departureDate = "Selecciona la fecha de salida."
    }

    if (!nextDepartureTime) {
      nextErrors.departureTime = "Selecciona la hora de salida."
    }

    if (!nextFlightNumber.trim()) {
      nextErrors.flightNumber = "Ingresa el número de vuelo."
    }

    const cap = parseNormalizedNumber(nextCapacityKg)
    if (cap === null) {
      nextErrors.capacityKg = "La capacidad es obligatoria."
    } else if (cap < 1) {
      nextErrors.capacityKg = "Ingresa una capacidad válida de al menos 1 kg."
    } else if (cap > 50) {
      nextErrors.capacityKg = "La capacidad máxima permitida es 50 kg."
    }

    return nextErrors
  }

  const syncErrorsIfNeeded = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      departureDate: string
      departureTime: string
      capacityKg: string
      flightNumber: string
    }>
  ) => {
    if (!hasAttemptedSubmit) return
    setErrors(getValidationErrors(overrides))
  }

  const updateCapacityKg = (rawValue: string) => {
    const nextValue = sanitizeDecimalInput(rawValue)
    setCapacityKg(nextValue)
    syncErrorsIfNeeded({ capacityKg: nextValue })
  }

  const swapRoute = () => {
    setOriginCityId(destinationCityId)
    setDestinationCityId(originCityId)
    syncErrorsIfNeeded({ originCityId: destinationCityId, destinationCityId: originCityId })
  }

  const isReadyToPublish =
    Boolean(originCityId) &&
    Boolean(destinationCityId) &&
    originCityId !== destinationCityId &&
    Boolean(departureDate) &&
    Boolean(departureTime) &&
    capacityValue !== null &&
    capacityValue >= 1 &&
    capacityValue <= 50 &&
    Boolean(flightNumber.trim())

  const summaryDate = departureDate
    ? new Intl.DateTimeFormat("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(`${departureDate}T00:00:00`))
    : "Por definir"

  const summaryTime = departureTime
    ? new Intl.DateTimeFormat("es-CO", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(`1970-01-01T${departureTime}`))
    : "Por definir"

  const summaryChips = [
    { label: "Frágiles", value: acceptsFragile ? "Sí" : "No", icon: PackageCheck },
    { label: "Múltiples", value: acceptsMultiplePackages ? "Sí" : "No", icon: Route },
    { label: "Paradas", value: hasStopovers ? "Sí" : "No", icon: Clock3 },
  ]

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    setHasAttemptedSubmit(true)

    const nextErrors = getValidationErrors()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setLoading(false)
      setMsg("❌ Revisa los campos marcados antes de publicar el viaje.")
      return
    }

    const cap = parseNormalizedNumber(capacityKg)

    const { data, error } = await supabase.rpc("create_trip", {
      p_origin_city_id: originCityId,
      p_destination_city_id: destinationCityId,
      p_departure_date: departureDate,
      p_departure_time: departureTime || null,
      p_capacity_kg: cap,
      p_flight_number: flightNumber.trim().toUpperCase() || null,
      p_accepts_fragile: acceptsFragile,
      p_accepts_multiple_packages: acceptsMultiplePackages,
      p_has_stopovers: hasStopovers,
    })

    setLoading(false)

    if (error) {
      setMsg("❌ Error publicando viaje: " + getTripPublishErrorMessage(error.message))
      return
    }

    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      setMsg("❌ Error publicando viaje: " + getTripPublishErrorMessage(data.error))
      return
    }

    setMsg("✅ Viaje publicado correctamente.")
    router.push("/app#envios-compatibles")
  }

  const displayOriginName = originCity?.name ?? "N/A"
  const displayDestinationName = destinationCity?.name ?? "N/A"
  const displayOriginCode = originCity?.iata_code ?? "N/A"
  const displayDestinationCode = destinationCity?.iata_code ?? "N/A"

  const compactRouteLabel = `${displayOriginName} → ${displayDestinationName}`
  const summaryRouteLabel =
    originCity && destinationCity ? compactRouteLabel : "Por definir"

  return (
    <div className="grid gap-2.5 pb-32 sm:pb-0 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.52fr)_360px] lg:items-start [@media(min-width:1024px)_and_(max-height:900px)]:gap-2 [@media(min-width:1024px)_and_(max-height:820px)]:h-auto [@media(min-width:1024px)_and_(max-height:820px)]:gap-1.5">
      <form onSubmit={onSubmit} noValidate>
        <div className="rounded-[24px] border border-intra-border-strong bg-intra-card p-3 shadow-[var(--intra-shadow-base)] sm:p-3.5 lg:h-full lg:min-h-0 lg:p-3.5 [@media(min-width:1024px)_and_(max-height:900px)]:p-3 [@media(min-width:1024px)_and_(max-height:820px)]:h-auto [@media(min-width:1024px)_and_(max-height:820px)]:p-2.5 [@media(min-width:1024px)_and_(max-height:760px)]:p-2">
          <section>
            <SectionHeader
              step="1"
              title="Ruta del viaje"
              description="Indica desde qué ciudad sales y hacia cuál te diriges."
            />

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] lg:items-end [@media(min-width:1024px)_and_(max-height:820px)]:gap-1.5">
              <div>
                <label htmlFor="trip-origin-city" className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-intra-text-subtle">
                  Origen
                </label>
                <select
                  id="trip-origin-city"
                  name="originCityId"
                  className={`${fieldBaseClassName} ${errors.originCityId ? "border-intra-danger-border bg-intra-danger-soft" : ""}`}
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
                      {c.name} ({c.department}){c.iata_code ? ` - ${c.iata_code}` : ""}
                    </option>
                  ))}
                </select>
                {errors.originCityId ? <p className="mt-1 text-[10px] text-intra-danger">{errors.originCityId}</p> : null}
              </div>

              <button
                type="button"
                onClick={swapRoute}
                className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-intra-border-strong bg-intra-bg-app text-intra-blue shadow-sm transition hover:bg-intra-card"
                aria-label="Intercambiar origen y destino"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 7h11" />
                  <path d="m14 4 4 3-4 3" />
                  <path d="M17 17H6" />
                  <path d="m10 14-4 3 4 3" />
                </svg>
              </button>

              <div>
                <label htmlFor="trip-destination-city" className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-intra-text-subtle">
                  Destino
                </label>
                <select
                  id="trip-destination-city"
                  name="destinationCityId"
                  className={`${fieldBaseClassName} ${errors.destinationCityId ? "border-intra-danger-border bg-intra-danger-soft" : ""}`}
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
                      {c.name} ({c.department}){c.iata_code ? ` - ${c.iata_code}` : ""}
                    </option>
                  ))}
                </select>
                {errors.destinationCityId ? <p className="mt-1 text-[10px] text-intra-danger">{errors.destinationCityId}</p> : null}
              </div>
            </div>

            <div className="mt-1.5 [@media(min-width:1024px)_and_(max-height:820px)]:mt-1">
              <AirRouteGraphic
                originCode={displayOriginCode}
                destinationCode={displayDestinationCode}
                originName={displayOriginName}
                destinationName={displayDestinationName}
              />
            </div>
          </section>

          <section className="mt-2.5 border-t border-intra-border-soft pt-2.5 [@media(min-width:1024px)_and_(max-height:900px)]:mt-2 [@media(min-width:1024px)_and_(max-height:900px)]:pt-2 [@media(min-width:1024px)_and_(max-height:820px)]:mt-1.5 [@media(min-width:1024px)_and_(max-height:820px)]:pt-1.5">
            <SectionHeader
              step="2"
              title="Detalles del viaje"
              description="Define cuándo sales, a qué hora y cuánta capacidad puedes llevar."
            />

            <div className="grid gap-2 lg:grid-cols-[1fr_1fr_0.8fr_1.02fr] [@media(min-width:1024px)_and_(max-height:900px)]:gap-1.5 [@media(min-width:1024px)_and_(max-height:760px)]:gap-1">
              <div className="min-w-0">
                <label htmlFor="trip-departure-date" className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-intra-text-subtle">
                  Fecha de salida
                </label>
                <input
                  id="trip-departure-date"
                  name="departureDate"
                  className={`${nativeDateTimeFieldClassName} ${errors.departureDate ? "border-intra-danger-border bg-intra-danger-soft" : ""}`}
                  type="date"
                  value={departureDate}
                  onChange={(e) => {
                    setDepartureDate(e.target.value)
                    syncErrorsIfNeeded({ departureDate: e.target.value })
                  }}
                  required
                />
                {errors.departureDate ? <p className="mt-1 text-[10px] text-intra-danger">{errors.departureDate}</p> : null}
              </div>

              <div className="min-w-0">
                <label htmlFor="trip-departure-time" className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-intra-text-subtle">
                  Hora de salida
                </label>
                <input
                  id="trip-departure-time"
                  name="departureTime"
                  className={`${nativeDateTimeFieldClassName} ${errors.departureTime ? "border-intra-danger-border bg-intra-danger-soft" : ""}`}
                  type="time"
                  value={departureTime}
                  onChange={(e) => {
                    setDepartureTime(e.target.value)
                    syncErrorsIfNeeded({ departureTime: e.target.value })
                  }}
                  required
                />
                {errors.departureTime ? <p className="mt-1 text-[10px] text-intra-danger">{errors.departureTime}</p> : null}
              </div>

              <div className="min-w-0">
                <label htmlFor="trip-capacity-kg" className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-intra-text-subtle">
                  Capacidad (kg)
                </label>
                <input
                  id="trip-capacity-kg"
                  name="capacityKg"
                  className={`${fieldBaseClassName} ${errors.capacityKg ? "border-intra-danger-border bg-intra-danger-soft" : ""}`}
                  type="text"
                  inputMode="decimal"
                  value={capacityKg}
                  onChange={(e) => updateCapacityKg(e.target.value)}
                  onInput={(e) => updateCapacityKg(e.currentTarget.value)}
                  placeholder="10"
                  required
                />
                {errors.capacityKg ? <p className="mt-1 text-[10px] text-intra-danger">{errors.capacityKg}</p> : null}
              </div>

              <div className="min-w-0">
                <label htmlFor="trip-flight-number" className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-intra-text-subtle">
                  Número de vuelo
                </label>
                <input
                  id="trip-flight-number"
                  name="flightNumber"
                  className={`${fieldBaseClassName} ${errors.flightNumber ? "border-intra-danger-border bg-intra-danger-soft" : ""}`}
                  type="text"
                  value={flightNumber}
                  onChange={(e) => {
                    const nextFlightNumber = e.target.value.toUpperCase()
                    setFlightNumber(nextFlightNumber)
                    syncErrorsIfNeeded({ flightNumber: nextFlightNumber })
                  }}
                  placeholder="AV9687"
                  maxLength={12}
                  required
                />
                {errors.flightNumber ? <p className="mt-1 text-[10px] text-intra-danger">{errors.flightNumber}</p> : null}
              </div>
            </div>

          </section>

          <section className="mt-2.5 border-t border-intra-border-soft pt-2.5 [@media(min-width:1024px)_and_(max-height:900px)]:mt-2 [@media(min-width:1024px)_and_(max-height:900px)]:pt-2 [@media(min-width:1024px)_and_(max-height:820px)]:mt-1.5 [@media(min-width:1024px)_and_(max-height:820px)]:pt-1.5">
            <SectionHeader
              step="3"
              title="Información adicional"
              description="Cuéntanos más sobre tu viaje para generar confianza."
            />

            <div className="grid gap-2 lg:grid-cols-3 [@media(min-width:1024px)_and_(max-height:900px)]:gap-1.5 [@media(min-width:1024px)_and_(max-height:760px)]:gap-1">
              <PreferenceToggle
                label="Paquetes frágiles"
                value={acceptsFragile}
                onChange={setAcceptsFragile}
              />
              <PreferenceToggle
                label="Múltiples paquetes"
                value={acceptsMultiplePackages}
                onChange={setAcceptsMultiplePackages}
              />
              <PreferenceToggle
                label="Paradas intermedias"
                value={hasStopovers}
                onChange={setHasStopovers}
              />
            </div>
          </section>

          {msg ? (
            <div
              className={`mt-2.5 rounded-[16px] border px-3.5 py-2 text-sm ${
                msg.startsWith("✅")
                  ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                  : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
              }`}
            >
              {msg}
            </div>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-intra-border-strong bg-intra-card/95 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mt-2.5 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none [@media(min-width:1024px)_and_(max-height:900px)]:sm:mt-2">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
              <button
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-intra-green px-5 py-3 text-sm font-semibold text-intra-card shadow-[0_12px_22px_rgba(46,204,113,0.20)] transition hover:bg-intra-green-hover-alt disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
                type="submit"
              >
                <PlaneTakeoff className="mr-2 h-4 w-4" />
                {loading ? "Publicando..." : "Publicar viaje"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/app")}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-intra-border-strong bg-intra-card px-5 py-3 text-sm font-semibold text-intra-blue transition hover:bg-intra-bg-app sm:flex-1"
              >
                <House className="mr-2 h-4 w-4" />
                Volver a inicio
              </button>
            </div>
          </div>
        </div>
      </form>

      <aside className="lg:h-full lg:min-h-0">
        <div className="rounded-[24px] border border-intra-border-strong bg-intra-card p-3 shadow-[var(--intra-shadow-base)] lg:h-full lg:min-h-0 [@media(min-width:1024px)_and_(max-height:900px)]:p-2.5 [@media(min-width:1024px)_and_(max-height:820px)]:p-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-intra-blue">Resumen del viaje</p>
            </div>
            <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isReadyToPublish ? "bg-intra-success-soft text-intra-text-success" : "bg-intra-warning-soft text-intra-warning-text"}`}>
              {isReadyToPublish ? "Listo" : "Pendiente"}
            </div>
          </div>

          <div className="mt-3">
            <AirRouteGraphic
              originCode={displayOriginCode}
              destinationCode={displayDestinationCode}
              originName={displayOriginName}
              destinationName={displayDestinationName}
            />
          </div>

          <div className="mt-2 overflow-hidden rounded-2xl border border-intra-border-soft bg-intra-card [@media(min-width:1024px)_and_(max-height:820px)]:mt-1.5">
            {[
              {
                label: "Ruta",
                icon: MapPinned,
                value: summaryRouteLabel,
              },
              {
                label: "Fecha y hora",
                icon: CalendarDays,
                value: summaryDate !== "Por definir" ? `${summaryDate} • ${summaryTime}` : "Por definir",
              },
              {
                label: "Capacidad",
                icon: Luggage,
                value: capacityValue && capacityValue > 0 ? `${capacityValue} kg` : "Por definir",
              },
              {
                label: "Vuelo",
                icon: Hash,
                value: flightNumber.trim() || "Por definir",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-2.5 px-2.5 py-2 ${index !== 0 ? "border-t border-intra-border-soft" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xl bg-intra-bg-app text-intra-blue">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="whitespace-nowrap text-[12px] text-intra-text-subtle">{item.label}</p>
                </div>
                <p
                  className={`max-w-[56%] truncate whitespace-nowrap text-right text-[12px] font-semibold leading-4 ${
                    item.value === "Por definir" || item.value === "Selecciona origen y destino"
                      ? "text-intra-text-muted/60"
                      : "text-intra-blue"
                  }`}
                  title={item.value}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5 [@media(min-width:1024px)_and_(max-height:820px)]:mt-1.5 [@media(min-width:1024px)_and_(max-height:820px)]:gap-1">
            {summaryChips.map((chip) => (
              <div
                key={chip.label}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-intra-border-strong bg-intra-card px-1.5 py-1 text-[10px] whitespace-nowrap text-intra-text-subtle [@media(min-width:1024px)_and_(max-height:760px)]:px-1 [@media(min-width:1024px)_and_(max-height:760px)]:text-[9px]"
              >
                <chip.icon className="h-2.5 w-2.5 shrink-0 text-intra-blue" />
                <span className="truncate">{chip.label}</span>
                <span className="font-semibold text-intra-blue">{chip.value}</span>
              </div>
            ))}
          </div>

          <div className={`mt-1.5 rounded-2xl border p-2.5 [@media(min-width:1024px)_and_(max-height:820px)]:mt-1 [@media(min-width:1024px)_and_(max-height:820px)]:p-2 ${isReadyToPublish ? "border-intra-success-border bg-intra-success-soft" : "border-intra-warning-border bg-intra-warning-soft"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xl bg-intra-card shadow-sm ${isReadyToPublish ? "text-intra-text-success" : "text-intra-warning-text"}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-intra-blue">
                  {isReadyToPublish ? "Todo listo para publicar" : "Completa los datos obligatorios"}
                </p>
                <p className={`mt-0.5 text-[11px] leading-4 ${isReadyToPublish ? "text-intra-text-subtle" : "text-intra-warning-text"}`}>
                  Tu viaje se verá en la ruta y podrá recibir solicitudes compatibles.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-1.5 rounded-2xl border border-intra-border-soft bg-intra-card px-2.5 py-2 text-[11px] leading-4 text-intra-text-subtle [@media(min-width:1024px)_and_(max-height:820px)]:mt-1 [@media(min-width:1024px)_and_(max-height:820px)]:py-1.5 [@media(min-width:1024px)_and_(max-height:760px)]:text-[10px]">
            <p className="font-medium text-intra-blue">Privacidad</p>
            <p className="mt-0.5">
              Tu información estará protegida y solo se compartirá con personas interesadas.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
