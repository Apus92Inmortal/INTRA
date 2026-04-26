"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import {
  createClient,
  hasSupabaseEnv,
  missingEnvMessage,
} from "@/lib/supabase/client"
import { parsePaymentQuote } from "@/lib/payments/quote"
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
  const serviceAmount = Number(
    searchParams.get("serviceAmount") ?? searchParams.get("price") ?? ""
  )
  const totalAmount = Number(
    searchParams.get("totalAmount") ?? searchParams.get("price") ?? ""
  )
  const travelerAmount = Number(
    searchParams.get("travelerAmount") ?? searchParams.get("serviceAmount") ?? ""
  )
  const gatewayFeeEstimated = Number(
    searchParams.get("gatewayFeeEstimated") ?? ""
  )
  const intraFee = Number(searchParams.get("intraFee") ?? "")
  const autoReleaseHours = Number(searchParams.get("autoReleaseHours") ?? "48")
  const disputeWindowHours = Number(searchParams.get("disputeWindowHours") ?? "24")

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

    if (Number.isNaN(serviceAmount) || serviceAmount < 0) {
      setLoading(false)
      setErrorMsg("El valor del servicio recibido no es válido.")
      return
    }

    if (!hasSupabaseEnv()) {
      setLoading(false)
      setErrorMsg(missingEnvMessage)
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 800))

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setErrorMsg("Debes iniciar sesión para completar el pago.")
      return
    }

    const { data: quoteData, error: quoteError } = await supabase.rpc(
      "calculate_payment_amount",
      {
        p_base_amount: serviceAmount,
      }
    )

    const quote = parsePaymentQuote(quoteData)

    if (quoteError || !quote || !quote.success || !quote.amount) {
      setLoading(false)
      setErrorMsg(
        quote?.error === "below_minimum"
          ? `El valor mínimo del envío es ${formatCurrency(quote.minimum_amount ?? 20000)}.`
          : "No se pudo recalcular el pago seguro antes de registrar el cobro."
      )
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
      amount: quote.amount,
      gross_amount: quote.gross_amount ?? quote.amount,
      traveler_amount: quote.traveler_amount ?? serviceAmount,
      intra_fee: quote.intra_fee ?? 0,
      gateway_fee_estimated: quote.gateway_fee_estimated ?? 0,
      net_amount_received: quote.net_amount_received ?? quote.amount,
      currency: quote.currency ?? "COP",
      status: "held",
      gateway_provider: "bold_mvp",
      gateway_status: "simulated_approved",
      payment_method: "simulated",
      external_reference: `shipment:${shipment.id}`,
      metadata: {
        source: "checkout_mvp",
        auto_release_hours: quote.auto_release_hours ?? autoReleaseHours,
        dispute_window_hours: quote.dispute_window_hours ?? disputeWindowHours,
      },
    })

    if (paymentError) {
      setLoading(false)
      setErrorMsg("No se pudo registrar el pago: " + paymentError.message)
      return
    }

    router.push("/app/market")
  }

  return (
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
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-between gap-4">
                    <span>Valor para el viajero</span>
                    <span className="font-medium text-gray-700">
                      {formatCurrency(Number.isNaN(travelerAmount) ? serviceAmount : travelerAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Comisión INTRA</span>
                    <span className="font-medium text-gray-700">
                      {formatCurrency(Number.isNaN(intraFee) ? 0 : intraFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Fee gateway estimado</span>
                    <span className="font-medium text-gray-700">
                      {formatCurrency(Number.isNaN(gatewayFeeEstimated) ? 0 : gatewayFeeEstimated)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500">Precio total</p>
                  <p className="mt-1 text-4xl font-bold text-[#2ECC71]">
                    {formatCurrency(Number.isNaN(totalAmount) ? serviceAmount : totalAmount)}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Retención temporal: el saldo del viajero se libera {autoReleaseHours}h después de la entrega si no hay disputa. Ventana de disputa: {disputeWindowHours}h.
                  </p>
                </div>
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
  )
}
