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
      setMsg("❌ No estas autenticado.")
      return
    }

    const cap = capacityKg.trim() ? Number(capacityKg) : null
    if (cap !== null && (Number.isNaN(cap) || cap <= 0)) {
      setLoading(false)
      setMsg("❌ Capacidad invalida.")
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

    setMsg("✅ Viaje publicado")
    router.push("/app/market")
  }

  return (
    <div className="rounded-xl border p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Origen</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
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
            <label className="text-sm">Destino</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Fecha de salida</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm">Capacidad (kg) (opcional)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={capacityKg}
              onChange={(e) => setCapacityKg(e.target.value)}
              placeholder="Ej: 5"
            />
          </div>
        </div>

        {msg && <div className="rounded-md border p-3 text-sm">{msg}</div>}

        <button
          disabled={loading}
          className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-60"
          type="submit"
        >
          {loading ? "Publicando..." : "Publicar viaje"}
        </button>

        <p className="text-sm">
          <a className="underline" href="/app/market">
            Volver a market
          </a>
        </p>
      </form>
    </div>
  )
}
