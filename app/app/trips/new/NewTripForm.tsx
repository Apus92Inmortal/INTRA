"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
  capacityKg?: string
}

export default function NewTripForm({ cities }: { cities: City[] }) {
  const supabase = createClient()
  const router = useRouter()

  const [originCityId, setOriginCityId] = useState("")
  const [destinationCityId, setDestinationCityId] = useState("")
  const [departureDate, setDepartureDate] = useState("")
  const [capacityKg, setCapacityKg] = useState("")

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const cityOptions = useMemo(() => cities, [cities])

  const fieldBaseClassName =
    "w-full rounded-2xl border bg-white px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"

  const validate = (
    overrides?: Partial<{
      originCityId: string
      destinationCityId: string
      departureDate: string
      capacityKg: string
    }>
  ) => {
    const nextOriginCityId = overrides?.originCityId ?? originCityId
    const nextDestinationCityId = overrides?.destinationCityId ?? destinationCityId
    const nextDepartureDate = overrides?.departureDate ?? departureDate
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

    const cap = parseNormalizedNumber(nextCapacityKg)
    if (cap === null) {
      nextErrors.capacityKg = "La capacidad es obligatoria."
    } else if (cap < 1) {
      nextErrors.capacityKg = "Ingresa una capacidad válida de al menos 1 kg."
    }

    setErrors(nextErrors)
    return nextErrors
  }

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
      capacity_kg: cap,
    })

    setLoading(false)

    if (error) {
      setMsg("❌ Error publicando viaje: " + error.message)
      return
    }

    setMsg("✅ Viaje publicado correctamente.")
    router.push("/app/market")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-28 sm:pb-0">
      <div>
        <h2 className="text-base font-semibold text-[#0B2C4A]">
          Ruta del viaje
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Indica desde qué ciudad sales y hacia cuál te diriges.
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

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Destino
            </label>
            <select
              className={`${fieldBaseClassName} ${errors.destinationCityId ? "border-red-300 bg-red-50" : "border-gray-300"}`}
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
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-base font-semibold text-[#0B2C4A]">
          Detalles del viaje
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Define cuándo sales y cuánta capacidad puedes llevar.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha de salida
            </label>
            <input
              className={`${fieldBaseClassName} ${errors.departureDate ? "border-red-300 bg-red-50" : "border-gray-300"}`}
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Capacidad (kg)
            </label>
            <input
              className={`${fieldBaseClassName} ${errors.capacityKg ? "border-red-300 bg-red-50" : "border-gray-300"}`}
              type="text"
              inputMode="decimal"
              value={capacityKg}
              onChange={(e) => {
                const nextValue = sanitizeDecimalInput(e.target.value)
                setCapacityKg(nextValue)
                validate({ capacityKg: nextValue })
              }}
              placeholder="Ej: 5"
              required
            />
            {errors.capacityKg ? (
              <p className="mt-2 text-sm text-red-600">{errors.capacityKg}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#D9E7F2] bg-[#F7FAFC] p-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-[#0B2C4A]">Consejo:</span>{" "}
          publicar tu viaje con tiempo y con una capacidad clara aumenta las
          probabilidades de recibir solicitudes compatibles.
        </p>
      </div>

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
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          <button
            disabled={loading}
            className="min-h-11 rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
            type="submit"
          >
            {loading ? "Publicando..." : "Publicar viaje"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/app/market")}
            className="min-h-11 rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:flex-1"
          >
            Volver a market
          </button>
        </div>
      </div>
    </form>
  )
}
