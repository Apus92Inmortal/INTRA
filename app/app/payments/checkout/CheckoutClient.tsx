"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "No definido"
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function getShipmentKindLabel(kind: string) {
  switch (kind) {
    case "document":
      return "Documento"
    case "package":
      return "Paquete"
    case "ecommerce":
      return "E-commerce"
    default:
      return kind || "No definido"
  }
}

function SummaryItem({
  label,
  value,
  wide = false,
}: {
  label: string
  value: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`rounded-2xl bg-gray-50 p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold tracking-wide text-[#0B2C4A]/70">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium leading-6 text-gray-800">
        {value}
      </div>
    </div>
  )
}

export default function CheckoutClient() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const origin = searchParams.get("origin") ?? "No definido"
  const destination = searchParams.get("destination") ?? "No definido"
  const originCityId = searchParams.get("originCityId") ?? ""
  const destinationCityId = searchParams.get("destinationCityId") ?? ""
  const kind = searchParams.get("kind") ?? ""
  const rawDescription = searchParams.get("description") ?? ""
  const description = rawDescription || "Sin descripción"
  const weightParam =
    searchParams.get("weightKg") ?? searchParams.get("weight") ?? ""
  const declaredParam =
    searchParams.get("declaredValueCop") ?? searchParams.get("declared") ?? ""
  const weight = weightParam.trim() ? Number(weightParam) : null
  const declared = declaredParam.trim() ? Number(declaredParam) : null
  const price = Number(searchParams.get("price") ?? "")

  async function handlePayment() {
    setLoading(true)
    setErrorMsg(null)

    if (!originCityId || !destinationCityId || !kind || !rawDescription.trim()) {
      setLoading(false)
      setErrorMsg("Faltan datos del envío para completar el pago.")
      return
    }

    if (weight !== null && (Number.isNaN(weight) || weight <= 0)) {
      setLoading(false)
      setErrorMsg("El peso recibido no es válido.")
      return
    }

    if (declared !== null && (Number.isNaN(declared) || declared < 0)) {
      setLoading(false)
      setErrorMsg("El valor declarado recibido no es válido.")
      return
    }

    if (Number.isNaN(price) || price < 0) {
      setLoading(false)
      setErrorMsg("El valor del pago recibido no es válido.")
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 800))

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setErrorMsg("Debes iniciar sesión para completar el pago.")
      return
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .insert({
        owner_id: user.id,
        origin_city_id: originCityId,
        destination_city_id: destinationCityId,
        kind,
        description: rawDescription.trim(),
        weight_kg: weight,
        declared_value_cop: declared,
      })
      .select("id")
      .single()

    if (shipmentError || !shipment) {
      setLoading(false)
      setErrorMsg(
        "No se pudo crear el envío: " +
          (shipmentError?.message ?? "Error desconocido")
      )
      return
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      shipment_id: shipment.id,
      user_id: user.id,
      amount: price,
      status: "held",
      payment_method: "simulated",
      external_reference: null,
    })

    if (paymentError) {
      setLoading(false)
      setErrorMsg("No se pudo registrar el pago: " + paymentError.message)
      return
    }

    router.push("/app/market")
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#EEF2F7] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-[#0B2C4A]">
              Checkout
            </h1>

            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              Revisa la información de tu envío antes de continuar con el pago.
            </p>
          </div>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[#0B2C4A]">
                  Resumen del envío
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Confirma los datos del paquete antes de pasar al cobro.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SummaryItem
                    label="Ruta"
                    value={
                      <span className="text-base">
                        {origin} <span className="mx-1 text-[#2ECC71]">→</span>{" "}
                        {destination}
                      </span>
                    }
                  />

                  <SummaryItem
                    label="Tipo"
                    value={getShipmentKindLabel(kind)}
                  />

                  <SummaryItem
                    label="Descripción"
                    value={<p className="text-sm font-medium">{description}</p>}
                    wide
                  />

                  <SummaryItem
                    label="Peso"
                    value={weight !== null ? `${weight} kg` : "No definido"}
                  />

                  <SummaryItem
                    label="Valor declarado"
                    value={formatCurrency(declared)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm text-gray-500">Precio total</p>
                <p className="mt-1 text-4xl font-bold text-[#2ECC71]">
                  {formatCurrency(price)}
                </p>
              </div>

              {errorMsg && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handlePayment}
                disabled={loading}
                className="w-full rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Procesando pago..." : "Pagar ahora"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
