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
      setMsg("❌ No estás autenticado.")
      return
    }

    const weight = weightKg.trim() ? Number(weightKg) : null
    const declared = declaredValueCop.trim() ? Number(declaredValueCop) : null

    if (weight !== null && (Number.isNaN(weight) || weight <= 0)) {
      setLoading(false)
      setMsg("❌ Peso inválido.")
      return
    }

    if (declared !== null && (Number.isNaN(declared) || declared < 0)) {
      setLoading(false)
      setMsg("❌ Valor declarado inválido.")
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
      setMsg("❌ Error creando envío: " + error.message)
      return
    }

    setMsg("✅ Envío creado correctamente.")
    router.push("/app/market")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      
      {/* Ruta */}
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
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
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
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
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

      {/* Info envío */}
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
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
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
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Ej: Sobre con documentos, caja pequeña, etc."
            />
          </div>
        </div>
      </div>

      {/* Opcionales */}
      <div className="border-t border-gray-100 pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Peso (kg)
            </label>
            <input
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ej: 1.5"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Valor declarado (COP)
            </label>
            <input
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
              value={declaredValueCop}
              onChange={(e) => setDeclaredValueCop(e.target.value)}
              placeholder="Ej: 200000"
            />
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            msg.startsWith("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg}
        </div>
      )}

      {/* Botones */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          disabled={loading}
          className="rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear envío"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/app")}
          className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Volver
        </button>
      </div>
    </form>
  )
}