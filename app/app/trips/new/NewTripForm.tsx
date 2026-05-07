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
}

type PreferenceToggleProps = {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

function PreferenceToggle({ label, value, onChange }: PreferenceToggleProps) {
  return (
    <div className="rounded-[20px] border border-[#E3EDF5] bg-[#FCFEFF] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-[#0B2C4A]">{label}</p>

        <div className="inline-flex rounded-full border border-[#D7E5F1] bg-[#F3F7FA] p-1 shadow-[inset_0_1px_2px_rgba(11,44,74,0.06)]">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`min-w-[48px] rounded-full px-3 py-1 text-xs font-semibold transition ${
              value ? "bg-[#2ECC71] text-white shadow-sm" : "text-slate-500"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`min-w-[48px] rounded-full px-3 py-1 text-xs font-semibold transition ${
              !value ? "bg-white text-[#0B2C4A] shadow-sm" : "text-slate-500"
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
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EAFBF1] text-sm font-bold text-[#1E8C4E]">
        {step}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[#0B2C4A] sm:text-[17px]">{title}</h2>
        <p className="mt-0.5 text-sm leading-5 text-slate-500">{description}</p>
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
    <div className="rounded-[22px] border border-[#E3EDF5] bg-[linear-gradient(180deg,#F9FCFE_0%,#F3F8FC_100%)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-[68px] flex-col items-center text-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#2ECC71] shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-1 text-[11px] font-semibold text-[#0B2C4A]">{originName}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{originCode}</span>
        </div>

        <div className="relative h-px flex-1 border-t border-dashed border-[#8EC6AE]">
          <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D7E5F1] bg-white text-[#2ECC71] shadow-sm">
            <PlaneTakeoff className="h-4 w-4" />
          </div>
        </div>

        <div className="flex min-w-[68px] flex-col items-center text-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#2ECC71] shadow-sm">
            <MapPinned className="h-3.5 w-3.5" />
          </span>
          <span className="mt-1 text-[11px] font-semibold text-[#0B2C4A]">{destinationName}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{destinationCode}</span>
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
  const [notes, setNotes] = useState("")
  const [acceptsFragile, setAcceptsFragile] = useState(false)
  const [acceptsMultiplePackages, setAcceptsMultiplePackages] = useState(false)
  const [hasStopovers, setHasStopovers] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const fieldBaseClassName =
    "w-full rounded-[16px] border border-[#D7E5F1] bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0B2C4A] focus:ring-4 focus:ring-[#0B2C4A]/10"

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

    if (nextOriginCityId && nextDestinationCityId && nextOriginCityId === nextDestinationCityId) {
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

  const noteCount = notes.trim().length

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

  const routeLabel =
    originCity && destinationCity
      ? `${originCity.name} (${originCity.department}) · ${destinationCity.name} (${destinationCity.department})`
      : "Selecciona origen y destino"

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_330px] lg:items-start">
      <form onSubmit={onSubmit}>
        <div className="rounded-[28px] border border-[#D7E5F1] bg-white p-4 shadow-[0_18px_48px_rgba(11,44,74,0.08)] sm:p-5 lg:p-5">
          <section>
            <SectionHeader
              step="1"
              title="Ruta del viaje"
              description="Indica desde qué ciudad sales y hacia cuál te diriges."
            />

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:items-end">
              <div>
                <label htmlFor="trip-origin-city" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Origen
                </label>
                <select
                  id="trip-origin-city"
                  name="originCityId"
                  className={`${fieldBaseClassName} ${errors.originCityId ? "border-red-300 bg-red-50" : ""}`}
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
                {errors.originCityId ? <p className="mt-1.5 text-xs text-red-600">{errors.originCityId}</p> : null}
              </div>

              <button
                type="button"
                onClick={swapRoute}
                className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D7E5F1] bg-[#F8FBFD] text-[#0B2C4A] shadow-sm transition hover:bg-white"
                aria-label="Intercambiar origen y destino"
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 7h11" />
                  <path d="m14 4 4 3-4 3" />
                  <path d="M17 17H6" />
                  <path d="m10 14-4 3 4 3" />
                </svg>
              </button>

              <div>
                <label htmlFor="trip-destination-city" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Destino
                </label>
                <select
                  id="trip-destination-city"
                  name="destinationCityId"
                  className={`${fieldBaseClassName} ${errors.destinationCityId ? "border-red-300 bg-red-50" : ""}`}
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
                {errors.destinationCityId ? <p className="mt-1.5 text-xs text-red-600">{errors.destinationCityId}</p> : null}
              </div>
            </div>

            <div className="mt-3">
              <AirRouteGraphic
                originCode={originCity?.iata_code ?? "BOG"}
                destinationCode={destinationCity?.iata_code ?? "BAQ"}
                originName={originCity?.name ?? "Origen"}
                destinationName={destinationCity?.name ?? "Destino"}
              />
            </div>
          </section>

          <section className="mt-4 border-t border-[#E9F0F6] pt-4">
            <SectionHeader
              step="2"
              title="Detalles del viaje"
              description="Define cuándo sales, a qué hora y cuánta capacidad puedes llevar."
            />

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.85fr_1.15fr]">
              <div>
                <label htmlFor="trip-departure-date" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Fecha de salida
                </label>
                <input
                  id="trip-departure-date"
                  name="departureDate"
                  className={`${fieldBaseClassName} ${errors.departureDate ? "border-red-300 bg-red-50" : ""}`}
                  type="date"
                  value={departureDate}
                  onChange={(e) => {
                    setDepartureDate(e.target.value)
                    validate({ departureDate: e.target.value })
                  }}
                  required
                />
                {errors.departureDate ? <p className="mt-1.5 text-xs text-red-600">{errors.departureDate}</p> : null}
              </div>

              <div>
                <label htmlFor="trip-departure-time" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Hora de salida
                </label>
                <input
                  id="trip-departure-time"
                  name="departureTime"
                  className={`${fieldBaseClassName} ${errors.departureTime ? "border-red-300 bg-red-50" : ""}`}
                  type="time"
                  value={departureTime}
                  onChange={(e) => {
                    setDepartureTime(e.target.value)
                    validate({ departureTime: e.target.value })
                  }}
                  required
                />
                {errors.departureTime ? <p className="mt-1.5 text-xs text-red-600">{errors.departureTime}</p> : null}
              </div>

              <div>
                <label htmlFor="trip-capacity-kg" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Capacidad (kg)
                </label>
                <input
                  id="trip-capacity-kg"
                  name="capacityKg"
                  className={`${fieldBaseClassName} ${errors.capacityKg ? "border-red-300 bg-red-50" : ""}`}
                  type="text"
                  inputMode="decimal"
                  value={capacityKg}
                  onChange={(e) => updateCapacityKg(e.target.value)}
                  onInput={(e) => updateCapacityKg(e.currentTarget.value)}
                  placeholder="10"
                  required
                />
                {errors.capacityKg ? <p className="mt-1.5 text-xs text-red-600">{errors.capacityKg}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Capacidad disponible
                </label>
                <div className="rounded-[16px] border border-[#D7E5F1] bg-[#FBFDFF] px-3 py-3">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span>Disponible</span>
                    <span className="text-[#1E8C4E]">
                      {capacityValue && capacityValue > 0 ? `${capacityValue}/${visualCapacityMax} kg` : `0/${visualCapacityMax} kg`}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5EEF5]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2ECC71] via-[#39D98A] to-[#7BE495] transition-all"
                      style={{ width: `${capacityProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="trip-notes" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Notas adicionales (opcional)
              </label>
              <textarea
                id="trip-notes"
                name="notes"
                rows={2}
                maxLength={260}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: referencias de punto de encuentro, equipaje o coordinación adicional."
                className={`${fieldBaseClassName} min-h-[76px] resize-none py-3`}
              />
              <div className="mt-1 flex justify-end text-[11px] text-slate-400">{noteCount} / 260</div>
            </div>
          </section>

          <section className="mt-4 border-t border-[#E9F0F6] pt-4">
            <SectionHeader
              step="3"
              title="Información adicional"
              description="Cuéntanos más sobre tu viaje para generar confianza."
            />

            <div className="grid gap-3 lg:grid-cols-3">
              <PreferenceToggle
                label="¿Aceptas paquetes frágiles?"
                value={acceptsFragile}
                onChange={setAcceptsFragile}
              />
              <PreferenceToggle
                label="¿Aceptas múltiples paquetes?"
                value={acceptsMultiplePackages}
                onChange={setAcceptsMultiplePackages}
              />
              <PreferenceToggle
                label="¿Tienes paradas intermedias?"
                value={hasStopovers}
                onChange={setHasStopovers}
              />
            </div>
          </section>

          {msg ? (
            <div
              className={`mt-4 rounded-[20px] border px-4 py-3 text-sm ${
                msg.startsWith("✅")
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {msg}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col items-center justify-center gap-3 border-t border-[#E9F0F6] pt-4 sm:flex-row">
            <button
              disabled={loading}
              className="inline-flex min-h-12 min-w-[220px] items-center justify-center rounded-[16px] bg-[#2ECC71] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(46,204,113,0.22)] transition hover:bg-[#29b765] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
            >
              {loading ? "Publicando..." : "Publicar viaje"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/app")}
              className="inline-flex min-h-12 min-w-[220px] items-center justify-center rounded-[16px] border border-[#D7E5F1] bg-white px-6 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#F8FBFD]"
            >
              Volver a inicio
            </button>
          </div>
        </div>
      </form>

      <aside>
        <div className="rounded-[28px] border border-[#D7E5F1] bg-white p-4 shadow-[0_18px_48px_rgba(11,44,74,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0B2C4A]">Resumen del viaje</p>
            </div>
            <div className="rounded-full bg-[#EAFBF1] px-2.5 py-1 text-[11px] font-semibold text-[#1E8C4E]">
              {isReadyToPublish ? "Listo" : "Borrador"}
            </div>
          </div>

          <div className="mt-3">
            <AirRouteGraphic
              originCode={originCity?.iata_code ?? "BOG"}
              destinationCode={destinationCity?.iata_code ?? "BAQ"}
              originName={originCity?.name ?? "Origen"}
              destinationName={destinationCity?.name ?? "Destino"}
            />
          </div>

          <div className="mt-3 overflow-hidden rounded-[20px] border border-[#E3EDF5] bg-white">
            {[
              {
                label: "Ruta",
                icon: MapPinned,
                value: routeLabel,
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
                label: "Acepta frágiles",
                icon: PackageCheck,
                value: acceptsFragile ? "Sí" : "No",
              },
              {
                label: "Acepta múltiples paquetes",
                icon: Route,
                value: acceptsMultiplePackages ? "Sí" : "No",
              },
              {
                label: "Paradas intermedias",
                icon: Clock3,
                value: hasStopovers ? "Sí" : "No",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-3 px-3 py-3 ${index !== 0 ? "border-t border-[#E9F0F6]" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F4F8FB] text-[#0B2C4A]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                </div>
                <p
                  className={`max-w-[52%] text-right text-sm font-semibold leading-5 ${
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

          <div className="mt-3 rounded-[20px] border border-[#BEE8CD] bg-[#EFFBF4] p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#1E8C4E] shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0B2C4A]">Todo listo para publicar</p>
                <p className="mt-1 text-sm leading-5 text-[#3B5B4B]">
                  Tu viaje se verá en la ruta y podrá recibir solicitudes compatibles.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[20px] border border-[#E3EDF5] bg-[#FBFDFF] px-3.5 py-3 text-sm leading-5 text-slate-500">
            <p className="font-medium text-[#0B2C4A]">Privacidad</p>
            <p className="mt-1">
              Tu información estará protegida y solo se compartirá con personas interesadas.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
