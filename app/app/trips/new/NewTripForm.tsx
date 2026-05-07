"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Clock3,
  Luggage,
  MapPinned,
  PackageCheck,
  PlaneTakeoff,
  Route,
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
}

type PreferenceToggleProps = {
  label: string
  hint: string
  value: boolean
  onChange: (value: boolean) => void
}

function PreferenceToggle({ label, hint, value, onChange }: PreferenceToggleProps) {
  return (
    <div className="rounded-[24px] border border-[#D7E5F1] bg-[#FCFEFF] px-4 py-4 shadow-[0_10px_24px_rgba(11,44,74,0.05)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0B2C4A] sm:text-[15px]">{label}</p>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </div>

        <div className="inline-flex rounded-full border border-[#D7E5F1] bg-[#EEF4F8] p-1">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`min-w-[72px] rounded-full px-4 py-2 text-sm font-semibold transition ${
              value
                ? "bg-[#2ECC71] text-white shadow-sm"
                : "text-slate-500 hover:text-[#0B2C4A]"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`min-w-[72px] rounded-full px-4 py-2 text-sm font-semibold transition ${
              !value
                ? "bg-white text-[#0B2C4A] shadow-sm"
                : "text-slate-500 hover:text-[#0B2C4A]"
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
    <div className="mb-5 flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAFBF1] text-base font-bold text-[#1E8C4E] shadow-sm">
        {step}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[#0B2C4A]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function AirRouteGraphic({ originCode, destinationCode }: { originCode: string; destinationCode: string }) {
  return (
    <div className="rounded-[28px] border border-[#D7E5F1] bg-[#F8FBFD] px-4 py-5">
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 sm:text-xs">
        <span>{originCode}</span>
        <div className="relative h-px flex-1 border-t border-dashed border-[#9BC8DD]">
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#CFE3EF] bg-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#1E8C4E]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.5 13.4 13l-2.1-8.4-2.3.6 1.2 8L3 10.5l-1.6 1.7 6.8 3.1 2.1 6.8 1.9-.5-.7-5.7 8.7 2.3z" />
            </svg>
          </div>
        </div>
        <span>{destinationCode}</span>
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
  const [notes, setNotes] = useState("")
  const [acceptsFragile, setAcceptsFragile] = useState(false)
  const [acceptsMultiplePackages, setAcceptsMultiplePackages] = useState(false)
  const [hasStopovers, setHasStopovers] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const fieldBaseClassName =
    "w-full rounded-[22px] border bg-white px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0B2C4A] focus:ring-4 focus:ring-[#0B2C4A]/10"

  const cityOptions = useMemo(() => cities, [cities])
  const citiesById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities])

  const originCity = originCityId ? citiesById.get(originCityId) ?? null : null
  const destinationCity = destinationCityId ? citiesById.get(destinationCityId) ?? null : null
  const capacityValue = parseNormalizedNumber(capacityKg)
  const visualCapacityMax = capacityValue && capacityValue > 0 ? Math.max(10, Math.ceil(capacityValue / 5) * 5) : 10
  const capacityProgress = capacityValue && capacityValue > 0 ? Math.min(100, Math.round((capacityValue / visualCapacityMax) * 100)) : 0

  const validate = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      departureDate: string
      departureTime: string
      capacityKg: string
    }>
  ) => {
    const nextOriginCityId = overrides?.originCityId ?? originCityId
    const nextDestinationCityId = overrides?.destinationCityId ?? destinationCityId
    const nextDepartureDate = overrides?.departureDate ?? departureDate
    const nextDepartureTime = overrides?.departureTime ?? departureTime
    const nextCapacityKg = overrides?.capacityKg ?? capacityKg

    const nextErrors: FormErrors = {}

    if (!nextOriginCityId) {
      nextErrors.originCityId = "Selecciona la ciudad de origen."
    }

    if (!nextDestinationCityId) {
      nextErrors.destinationCityId = "Selecciona la ciudad de destino."
    }

    if (
      nextOriginCityId &&
      nextDestinationCityId &&
      nextOriginCityId === nextDestinationCityId
    ) {
      nextErrors.destinationCityId = "Origen y destino no pueden ser iguales."
    }

    if (!nextDepartureDate) {
      nextErrors.departureDate = "Selecciona la fecha de salida."
    }

    if (!nextDepartureTime) {
      nextErrors.departureTime = "Selecciona la hora de salida."
    }

    const cap = parseNormalizedNumber(nextCapacityKg)
    if (cap === null) {
      nextErrors.capacityKg = "La capacidad es obligatoria."
    } else if (cap < 1) {
      nextErrors.capacityKg = "Ingresa una capacidad válida de al menos 1 kg."
    } else if (cap > 50) {
      nextErrors.capacityKg = "La capacidad máxima permitida es 50 kg."
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const updateCapacityKg = (rawValue: string) => {
    const nextValue = sanitizeDecimalInput(rawValue)
    setCapacityKg(nextValue)
    validate({ capacityKg: nextValue })
  }

  const swapRoute = () => {
    setOriginCityId(destinationCityId)
    setDestinationCityId(originCityId)
    validate({ originCityId: destinationCityId, destinationCityId: originCityId })
  }

  const isReadyToPublish =
    Boolean(originCityId) &&
    Boolean(destinationCityId) &&
    originCityId !== destinationCityId &&
    Boolean(departureDate) &&
    Boolean(departureTime) &&
    capacityValue !== null &&
    capacityValue >= 1 &&
    capacityValue <= 50

  const summaryDate = departureDate
    ? new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "long",
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setLoading(false)
      setMsg("❌ Revisa los campos marcados antes de publicar el viaje.")
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setMsg("❌ No estás autenticado.")
      return
    }

    const cap = parseNormalizedNumber(capacityKg)

    const { error } = await supabase.from("trips").insert({
      traveler_id: user.id,
      origin_city_id: originCityId,
      destination_city_id: destinationCityId,
      departure_date: departureDate,
      departure_time: departureTime,
      capacity_kg: cap,
      notes: notes.trim() || null,
      accepts_fragile: acceptsFragile,
      accepts_multiple_packages: acceptsMultiplePackages,
      has_stopovers: hasStopovers,
    })

    setLoading(false)

    if (error) {
      setMsg("❌ Error publicando viaje: " + error.message)
      return
    }

    setMsg("✅ Viaje publicado correctamente.")
    router.push("/app#envios-compatibles")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] lg:items-start">
      <form onSubmit={onSubmit} className="space-y-4">
        <section className="rounded-[32px] border border-[#D7E5F1] bg-white p-5 shadow-[0_18px_60px_rgba(11,44,74,0.08)] sm:p-7">
          <SectionHeader
            step="1"
            title="Ruta del viaje"
            description="Indica desde qué ciudad sales, a cuál llegas y confirma la ruta aérea que verá la comunidad."
          />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
            <div>
              <label htmlFor="trip-origin-city" className="mb-2 block text-sm font-medium text-slate-700">
                Origen
              </label>
              <select
                id="trip-origin-city"
                name="originCityId"
                className={`${fieldBaseClassName} ${errors.originCityId ? "border-red-300 bg-red-50" : "border-[#D7E5F1]"}`}
                value={originCityId}
                onChange={(e) => {
                  setOriginCityId(e.target.value)
                  validate({ originCityId: e.target.value })
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
              {errors.originCityId ? (
                <p className="mt-2 text-sm text-red-600">{errors.originCityId}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={swapRoute}
              className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D7E5F1] bg-[#F8FBFD] text-[#0B2C4A] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
              aria-label="Intercambiar origen y destino"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 7h11" />
                <path d="m14 4 4 3-4 3" />
                <path d="M17 17H6" />
                <path d="m10 14-4 3 4 3" />
              </svg>
            </button>

            <div>
              <label htmlFor="trip-destination-city" className="mb-2 block text-sm font-medium text-slate-700">
                Destino
              </label>
              <select
                id="trip-destination-city"
                name="destinationCityId"
                className={`${fieldBaseClassName} ${errors.destinationCityId ? "border-red-300 bg-red-50" : "border-[#D7E5F1]"}`}
                value={destinationCityId}
                onChange={(e) => {
                  setDestinationCityId(e.target.value)
                  validate({ destinationCityId: e.target.value })
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
              {errors.destinationCityId ? (
                <p className="mt-2 text-sm text-red-600">{errors.destinationCityId}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-[28px] border border-[#E3EDF5] bg-[#FBFDFF] p-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[#E3EDF5] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Salida</p>
              <p className="mt-2 text-base font-semibold text-[#0B2C4A]">
                {originCity ? `${originCity.name}, ${originCity.department}` : "Selecciona el origen"}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#E3EDF5] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Llegada</p>
              <p className="mt-2 text-base font-semibold text-[#0B2C4A]">
                {destinationCity ? `${destinationCity.name}, ${destinationCity.department}` : "Selecciona el destino"}
              </p>
            </div>
            <div className="sm:col-span-2 rounded-[24px] border border-[#E3EDF5] bg-white px-4 py-4">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAFBF1] text-[#1E8C4E]">
                  <PlaneTakeoff className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-[#0B2C4A]">Vista previa de la ruta aérea</p>
                  <p className="mt-1 text-sm text-slate-500">
                    La ruta final se actualizará en el resumen a medida que completes la información.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#D7E5F1] bg-white p-5 shadow-[0_18px_60px_rgba(11,44,74,0.08)] sm:p-7">
          <SectionHeader
            step="2"
            title="Detalles del viaje"
            description="Mantén la información clara para generar más confianza y solicitudes compatibles."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="trip-departure-date" className="mb-2 block text-sm font-medium text-slate-700">
                Fecha de salida
              </label>
              <input
                id="trip-departure-date"
                name="departureDate"
                className={`${fieldBaseClassName} ${errors.departureDate ? "border-red-300 bg-red-50" : "border-[#D7E5F1]"}`}
                type="date"
                value={departureDate}
                onChange={(e) => {
                  setDepartureDate(e.target.value)
                  validate({ departureDate: e.target.value })
                }}
                required
              />
              {errors.departureDate ? (
                <p className="mt-2 text-sm text-red-600">{errors.departureDate}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="trip-departure-time" className="mb-2 block text-sm font-medium text-slate-700">
                Hora de salida
              </label>
              <input
                id="trip-departure-time"
                name="departureTime"
                className={`${fieldBaseClassName} ${errors.departureTime ? "border-red-300 bg-red-50" : "border-[#D7E5F1]"}`}
                type="time"
                value={departureTime}
                onChange={(e) => {
                  setDepartureTime(e.target.value)
                  validate({ departureTime: e.target.value })
                }}
                required
              />
              {errors.departureTime ? (
                <p className="mt-2 text-sm text-red-600">{errors.departureTime}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="trip-capacity-kg" className="mb-2 block text-sm font-medium text-slate-700">
                Capacidad disponible (kg)
              </label>
              <input
                id="trip-capacity-kg"
                name="capacityKg"
                className={`${fieldBaseClassName} ${errors.capacityKg ? "border-red-300 bg-red-50" : "border-[#D7E5F1]"}`}
                type="text"
                inputMode="decimal"
                value={capacityKg}
                onChange={(e) => updateCapacityKg(e.target.value)}
                onInput={(e) => updateCapacityKg(e.currentTarget.value)}
                placeholder="Ej: 10"
                required
              />
              {errors.capacityKg ? (
                <p className="mt-2 text-sm text-red-600">{errors.capacityKg}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-[#D7E5F1] bg-[#F8FBFD] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0B2C4A]">Capacidad estimada para solicitudes</p>
                <p className="mt-1 text-sm text-slate-500">Muéstrale a los usuarios cuánto espacio puedes ofrecer en este viaje.</p>
              </div>
              <p className="text-sm font-semibold text-[#1E8C4E]">
                {capacityValue && capacityValue > 0 ? `${capacityValue}/${visualCapacityMax} kg` : `0/${visualCapacityMax} kg`}
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#E5EEF5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2ECC71] via-[#39D98A] to-[#7BE495] transition-all"
                style={{ width: `${capacityProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="trip-notes" className="mb-2 block text-sm font-medium text-slate-700">
              Notas adicionales <span className="text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="trip-notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: viajo con equipaje de mano y maleta documentada, puedo coordinar entregas antes del check-in."
              className={`${fieldBaseClassName} min-h-[132px] resize-y border-[#D7E5F1] py-4`}
            />
          </div>
        </section>

        <section className="rounded-[32px] border border-[#D7E5F1] bg-white p-5 shadow-[0_18px_60px_rgba(11,44,74,0.08)] sm:p-7">
          <SectionHeader
            step="3"
            title="Información adicional"
            description="Configura tus preferencias para que las solicitudes que recibas estén más alineadas con tu viaje."
          />

          <div className="space-y-4">
            <PreferenceToggle
              label="¿Aceptas paquetes frágiles?"
              hint="Indica si puedes transportar artículos que requieran manejo cuidadoso."
              value={acceptsFragile}
              onChange={setAcceptsFragile}
            />
            <PreferenceToggle
              label="¿Aceptas múltiples paquetes?"
              hint="Útil si planeas llevar varios envíos pequeños dentro de la misma ruta."
              value={acceptsMultiplePackages}
              onChange={setAcceptsMultiplePackages}
            />
            <PreferenceToggle
              label="¿Tienes paradas intermedias?"
              hint="Activa esta opción si tu trayecto incluye escalas o coordinación adicional."
              value={hasStopovers}
              onChange={setHasStopovers}
            />
          </div>
        </section>

        {msg ? (
          <div
            className={`rounded-[28px] border px-5 py-4 text-sm ${
              msg.startsWith("✅")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {msg}
          </div>
        ) : null}

        <div className="flex flex-col items-center justify-center gap-3 pb-4 sm:flex-row">
          <button
            disabled={loading}
            className="inline-flex min-h-14 min-w-[220px] items-center justify-center rounded-full bg-[#2ECC71] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_20px_38px_rgba(46,204,113,0.28)] transition hover:-translate-y-0.5 hover:bg-[#29b765] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {loading ? "Publicando..." : "Publicar viaje"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/app")}
            className="inline-flex min-h-14 min-w-[220px] items-center justify-center rounded-full border border-transparent bg-transparent px-8 py-3.5 text-sm font-semibold text-[#0B2C4A] transition hover:-translate-y-0.5 hover:bg-white/70"
          >
            Volver a inicio
          </button>
        </div>
      </form>

      <aside className="lg:sticky lg:top-24">
        <div className="rounded-[32px] border border-[#D7E5F1] bg-white p-5 shadow-[0_18px_60px_rgba(11,44,74,0.08)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Resumen del viaje</p>
              <h3 className="mt-2 text-2xl font-semibold text-[#0B2C4A]">
                {originCity && destinationCity
                  ? `${originCity.name} → ${destinationCity.name}`
                  : "Tu ruta aérea"}
              </h3>
            </div>
            <div className="rounded-2xl bg-[#EAFBF1] px-3 py-2 text-xs font-semibold text-[#1E8C4E]">
              {isReadyToPublish ? "Listo" : "En progreso"}
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-[#E3EDF5] bg-[#F8FBFD] p-4">
            <AirRouteGraphic
              originCode={originCity?.iata_code ?? "ORI"}
              destinationCode={destinationCity?.iata_code ?? "DST"}
            />
          </div>

          <div className="mt-5 space-y-3">
            {[
              {
                label: "Ruta",
                icon: MapPinned,
                value:
                  originCity && destinationCity
                    ? `${originCity.name}, ${originCity.department} → ${destinationCity.name}, ${destinationCity.department}`
                    : "Selecciona origen y destino",
              },
              { label: "Fecha", icon: CalendarDays, value: summaryDate },
              { label: "Hora", icon: Clock3, value: summaryTime },
              {
                label: "Capacidad",
                icon: Luggage,
                value: capacityValue && capacityValue > 0 ? `${capacityValue} kg disponibles` : "Por definir",
              },
              { label: "Frágiles", icon: PackageCheck, value: acceptsFragile ? "Sí" : "No" },
              {
                label: "Múltiples paquetes",
                icon: Route,
                value: acceptsMultiplePackages ? "Sí" : "No",
              },
              { label: "Paradas intermedias", icon: PlaneTakeoff, value: hasStopovers ? "Sí" : "No" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4 rounded-[24px] border border-[#E3EDF5] bg-white px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F4F8FB] text-[#0B2C4A]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  </div>
                </div>
                <p
                  className={`max-w-[58%] text-right text-sm font-semibold ${
                    item.value === "Por definir" || item.value === "Selecciona origen y destino"
                      ? "text-slate-400"
                      : "text-[#0B2C4A]"
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[28px] border border-[#BEE8CD] bg-[#EFFBF4] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1E8C4E] shadow-sm">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0B2C4A]">Todo listo para publicar</p>
                <p className="mt-1 text-sm leading-6 text-[#3B5B4B]">
                  Tu viaje se verá en la ruta y podrá recibir solicitudes compatibles.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-[#D7E5F1] bg-[#F8FBFD] p-4 text-sm leading-6 text-slate-500">
            <p className="font-semibold text-[#0B2C4A]">Privacidad</p>
            <p className="mt-1">
              Tu información está protegida. Solo mostraremos lo necesario para coordinar solicitudes compatibles dentro de la plataforma.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
