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

export default function NewShipmentForm({ cities }: { cities: City[] }) {
  const supabase = createClient()
  const router = useRouter()

  const [originCityId, setOriginCityId] = useState("")
  const [destinationCityId, setDestinationCityId] = useState("")
  const [kind, setKind] = useState<"document" | "package" | "ecommerce">("document")
  const [description, setDescription] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [declaredValueCop, setDeclaredValueCop] = useState("")

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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setMsg("❌ No estas autenticado.")
      return
    }

    const weight = weightKg.trim() ? Number(weightKg) : null
    const declared = declaredValueCop.trim() ? Number(declaredValueCop) : null

    if (weight !== null && (Number.isNaN(weight) || weight <= 0)) {
      setLoading(false)
      setMsg("❌ Peso invalido.")
      return
    }

    if (declared !== null && (Number.isNaN(declared) || declared < 0)) {
      setLoading(false)
      setMsg("❌ Valor declarado invalido.")
      return
    }

    const { error } = await supabase.from("shipments").insert({
      owner_id: user.id,
      origin_city_id: originCityId,
      destination_city_id: destinationCityId,
      kind,
      description: description.trim(),
      weight_kg: weight,
      declared_value_cop: declared,
    })

    setLoading(false)

    if (error) {
      setMsg("❌ Error creando envio: " + error.message)
      return
    }

    setMsg("✅ Envio creado")
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

        <div>
          <label className="text-sm">Tipo de envio</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
          >
            <option value="document">Documento</option>
            <option value="package">Paquete</option>
            <option value="ecommerce">Ecommerce</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Descripcion</label>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Ej: Sobre con documentos, caja pequena, etc."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Peso (kg) (opcional)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ej: 1.5"
            />
          </div>

          <div>
            <label className="text-sm">Valor declarado COP (opcional)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={declaredValueCop}
              onChange={(e) => setDeclaredValueCop(e.target.value)}
              placeholder="Ej: 200000"
            />
          </div>
        </div>

        {msg && <div className="rounded-md border p-3 text-sm">{msg}</div>}

        <button
          disabled={loading}
          className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-60"
          type="submit"
        >
          {loading ? "Creando..." : "Crear envio"}
        </button>

        <p className="text-sm">
          <a className="underline" href="/app">
            Volver a /app
          </a>
        </p>
      </form>
    </div>
  )
}
