"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type City = {
  id: string
  name: string
  department: string
  iata_code: string | null
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

  const cityOptions = useMemo(() => cities, [cities])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    if (!originCityId || !destinationCityId) {
      setLoading(false)
      setMsg("❌ Debes seleccionar origen y destino.")
      return
    }

    if (originCityId === destinationCityId) {
      setLoading(false)
      setMsg("❌ Origen y destino no pueden ser iguales.")
      return
    }

    if (!departureDate) {
      setLoading(false)
      setMsg("❌ Debes seleccionar la fecha de salida.")
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

    const cap = capacityKg.trim() ? Number(capacityKg) : null
    if (cap !== null && (Number.isNaN(cap) || cap <= 0)) {
      setLoading(false)
      setMsg("❌ Capacidad inválida.")
      return
    }

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
    <form onSubmit={onSubmit} className="space-y-6">
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
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
              value={originCityId}
              onChange={(e) => setOriginCityId(e.target.value)}
              required
            >
              <option value="">Selecciona ciudad</option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.department}){c.iata_code ? ` - ${c.iata_code}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Destino
            </label>
            <select
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
              value={destinationCityId}
              onChange={(e) => setDestinationCityId(e.target.value)}
              required
            >
              <option value="">Selecciona ciudad</option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.department}){c.iata_code ? ` - ${c.iata_code}` : ""}
                </option>
              ))}
            </select>
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
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Capacidad (kg)
            </label>
            <input
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
              type="number"
              step="0.1"
              min="0"
              value={capacityKg}
              onChange={(e) => setCapacityKg(e.target.value)}
              placeholder="Ej: 5"
            />
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

      {msg && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            msg.startsWith("✅")
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <button
          disabled={loading}
          className="inline-flex justify-center rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
        >
          {loading ? "Publicando..." : "Publicar viaje"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/app/market")}
          className="inline-flex justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Volver a market
        </button>
      </div>
    </form>
  )
}