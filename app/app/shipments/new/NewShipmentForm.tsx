"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type City = {
  id: string
  name: string
  department: string
  iata_code: string | null
}

type ShipmentKind = "document" | "package" | "ecommerce"

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

  const [routeBasePrice, setRouteBasePrice] = useState<number | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)

  const cityOptions = useMemo(() => cities, [cities])

  const originCity = cityOptions.find((c) => c.id === originCityId) ?? null
  const destinationCity =
    cityOptions.find((c) => c.id === destinationCityId) ?? null

  useEffect(() => {
    const fetchRoutePrice = async () => {
      if (!originCityId || !destinationCityId || originCityId === destinationCityId) {
        setRouteBasePrice(null)
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
        setRouteLoading(false)
        return
      }

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

  const price = routeBasePrice !== null ? routeBasePrice + getKindPrice() : null

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

    if (routeBasePrice === null) {
      setLoading(false)
      setMsg("❌ No hay tarifa configurada para esa ruta.")
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

    const params = new URLSearchParams({
      originCityId,
      destinationCityId,
      kind,
      description: description.trim(),
      weightKg,
      declaredValueCop,
      price: String(price),
      origin: originCity?.name ?? originCityId,
      destination: destinationCity?.name ?? destinationCityId,
      weight: weightKg,
      declared: declaredValueCop,
    })

    router.push(`/app/payments/checkout?${params.toString()}`)
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
                  {c.name} ({c.department})
                  {c.iata_code ? ` - ${c.iata_code}` : ""}
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
                  {c.name} ({c.department})
                  {c.iata_code ? ` - ${c.iata_code}` : ""}
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
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Ej: Sobre con documentos, caja pequeña, accesorios, etc."
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

      {/* Estado carga ruta */}
      {routeLoading && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Consultando tarifa de la ruta...
        </div>
      )}

      {/* Resumen del servicio */}
      {price && originCity && destinationCity && !routeLoading && (
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
            <p className="text-sm text-gray-500">Valor del servicio</p>
            <p className="mt-1 text-3xl font-bold text-[#2ECC71]">
              ${price.toLocaleString("es-CO")}
            </p>
          </div>
        </div>
      )}

      {/* Ruta sin precio */}
      {!routeLoading &&
        originCityId &&
        destinationCityId &&
        originCityId !== destinationCityId &&
        routeBasePrice === null && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ❌ No encontramos una tarifa configurada para esta ruta.
          </div>
        )}

      {/* Mensaje */}
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

      {/* Botones */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          disabled={loading || routeLoading}
          className="rounded-2xl bg-[#2ECC71] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Procesando..." : "Continuar"}
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
