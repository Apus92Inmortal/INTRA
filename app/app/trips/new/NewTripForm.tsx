"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightLeft,
  House,
  PackageCheck,
  PlaneTakeoff,
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
    <div className="rounded-2xl border border-intra-border-soft bg-intra-bg-app p-2.5">
      <div className="mb-2 flex items-center gap-2 intra-caption-strong text-intra-blue">
        <PackageCheck className="h-3.5 w-3.5 text-intra-blue" />
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

function SectionHeader({ step, title }: { step: string; title: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-intra-success-soft intra-badge-text text-intra-text-success">
        {step}
      </div>
      <div>
        <h2 className="intra-h4">{title}</h2>
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

  const fieldBaseClassName = "intra-input h-12"

  const nativeDateTimeFieldClassName =
    `${fieldBaseClassName} appearance-none overflow-hidden pr-3 [color-scheme:light] [&::-webkit-date-and-time-value]:text-left [&::-webkit-calendar-picker-indicator]:shrink-0`

  const cityOptions = useMemo(() => cities, [cities])

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

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="rounded-[24px] border border-intra-border-strong bg-intra-card p-3 shadow-[var(--intra-shadow-base)] sm:p-4 lg:p-5">
          <section>
            <SectionHeader
              step="1"
              title="Ruta del viaje"
            />

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] lg:items-end">
              <div>
                <label htmlFor="trip-origin-city" className="mb-1 block intra-badge-text uppercase text-intra-text-subtle">
                  Origen
                </label>
                <select
                  id="trip-origin-city"
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
                      {c.name} ({c.department}){c.iata_code ? ` - ${c.iata_code}` : ""}
                    </option>
                  ))}
                </select>
                {errors.originCityId ? <p className="intra-field-error">{errors.originCityId}</p> : null}
              </div>

              <button
                type="button"
                onClick={swapRoute}
                className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-intra-border-strong bg-intra-bg-app text-intra-blue shadow-sm transition hover:bg-intra-card"
                aria-label="Intercambiar origen y destino"
              >
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div>
                <label htmlFor="trip-destination-city" className="mb-1 block intra-badge-text uppercase text-intra-text-subtle">
                  Destino
                </label>
                <select
                  id="trip-destination-city"
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
                      {c.name} ({c.department}){c.iata_code ? ` - ${c.iata_code}` : ""}
                    </option>
                  ))}
                </select>
                {errors.destinationCityId ? <p className="intra-field-error">{errors.destinationCityId}</p> : null}
              </div>
            </div>
          </section>

          <section className="mt-3 border-t border-intra-border-soft pt-3">
            <SectionHeader
              step="2"
              title="Fecha y horario"
            />

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="min-w-0">
                <label htmlFor="trip-departure-date" className="mb-1 block intra-badge-text uppercase text-intra-text-subtle">
                  Fecha de salida
                </label>
                <input
                  id="trip-departure-date"
                  name="departureDate"
                  className={`${nativeDateTimeFieldClassName} ${errors.departureDate ? "intra-input-error" : ""}`}
                  type="date"
                  value={departureDate}
                  onChange={(e) => {
                    setDepartureDate(e.target.value)
                    syncErrorsIfNeeded({ departureDate: e.target.value })
                  }}
                  required
                />
                {errors.departureDate ? <p className="intra-field-error">{errors.departureDate}</p> : null}
              </div>

              <div className="min-w-0">
                <label htmlFor="trip-departure-time" className="mb-1 block intra-badge-text uppercase text-intra-text-subtle">
                  Hora de salida
                </label>
                <input
                  id="trip-departure-time"
                  name="departureTime"
                  className={`${nativeDateTimeFieldClassName} ${errors.departureTime ? "intra-input-error" : ""}`}
                  type="time"
                  value={departureTime}
                  onChange={(e) => {
                    setDepartureTime(e.target.value)
                    syncErrorsIfNeeded({ departureTime: e.target.value })
                  }}
                  required
                />
                {errors.departureTime ? <p className="intra-field-error">{errors.departureTime}</p> : null}
              </div>

              <div className="min-w-0">
                <label htmlFor="trip-flight-number" className="mb-1 block intra-badge-text uppercase text-intra-text-subtle">
                  Número de vuelo
                </label>
                <input
                  id="trip-flight-number"
                  name="flightNumber"
                  className={`${fieldBaseClassName} ${errors.flightNumber ? "intra-input-error" : ""}`}
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
                {errors.flightNumber ? <p className="intra-field-error">{errors.flightNumber}</p> : null}
              </div>
            </div>

          </section>

          <section className="mt-3 border-t border-intra-border-soft pt-3">
            <SectionHeader
              step="3"
              title="Capacidad disponible"
            />

            <div className="max-w-sm">
              <div>
                <label htmlFor="trip-capacity-kg" className="mb-1 block intra-badge-text uppercase text-intra-text-subtle">
                  Capacidad (kg)
                </label>
                <input
                  id="trip-capacity-kg"
                  name="capacityKg"
                  className={`${fieldBaseClassName} ${errors.capacityKg ? "intra-input-error" : ""}`}
                  type="text"
                  inputMode="decimal"
                  value={capacityKg}
                  onChange={(e) => updateCapacityKg(e.target.value)}
                  onInput={(e) => updateCapacityKg(e.currentTarget.value)}
                  placeholder="10"
                  required
                />
                {errors.capacityKg ? <p className="intra-field-error">{errors.capacityKg}</p> : null}
                <p className="mt-1 intra-caption text-intra-text-muted">Máximo 50 kg por viaje.</p>
              </div>
            </div>
          </section>

          <section className="mt-3 border-t border-intra-border-soft pt-3">
            <SectionHeader
              step="4"
              title="Preferencias"
            />

            <div className="grid gap-3 lg:grid-cols-3">
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
              className={`mt-4 rounded-2xl border px-3.5 py-2 intra-body ${
                msg.startsWith("✅")
                  ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                  : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
              }`}
            >
              {msg}
            </div>
          ) : null}

          <div className="mt-4 border-t border-intra-border-soft pt-3">
            <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
              <button
                disabled={loading}
                className="intra-btn intra-btn-primary w-full sm:flex-1"
                type="submit"
              >
                <PlaneTakeoff className="h-4 w-4" />
                {loading ? "Publicando..." : "Publicar viaje"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/app")}
                className="intra-btn intra-btn-secondary w-full sm:flex-1"
              >
                <House className="h-4 w-4" />
                Volver a inicio
              </button>
            </div>
          </div>
      </div>
    </form>
  )
}
