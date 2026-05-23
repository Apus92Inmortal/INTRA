"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function MatchButton({
  shipmentId,
  tripId,
}: {
  shipmentId: string
  tripId: string
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const defaultLabel = "Solicitar transporte"
  const loadingLabel = "Enviando..."
  const doneLabel = "Pendiente"
  const layoutLabel = defaultLabel

  const onClick = async () => {
    if (!tripId) {
      setMsg("No tienes un viaje abierto para esta ruta.")
      return
    }

    setLoading(true)
    setMsg(null)

    const { data, error } = await supabase.rpc("request_match", {
      p_shipment_id: shipmentId,
      p_trip_id: tripId,
    })

    setLoading(false)

    const rpcError =
      data && typeof data === "object" && "success" in data && data.success === false
        ? typeof data.error === "string"
          ? data.error
          : "No se pudo solicitar el transporte."
        : null

    if (error || rpcError) {
      const errorMessage = error?.message ?? rpcError ?? ""
      const m = errorMessage.toLowerCase()

      if (m.includes("duplicate") || m.includes("matches_unique") || m.includes("match_already_requested")) {
        setMsg(null)
        setDone(true)
        return
      }

      if (m.includes("active_match_limit_exceeded")) {
        setMsg("❌ Las cuentas sin verificar solo pueden tener 1 match activo al mismo tiempo.")
        return
      }

      setMsg("❌ " + errorMessage)
      return
    }

    setDone(true)
    setMsg(null)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        onClick={onClick}
        disabled={loading || done}
        className="intra-btn intra-btn-primary min-h-11 rounded-2xl px-4 py-2 shadow-sm hover:opacity-90"
      >
        <span className="intra-stable-swap">
          <span className="intra-stable-swap-ghost">{layoutLabel}</span>
          <span>{loading ? loadingLabel : done ? doneLabel : defaultLabel}</span>
        </span>
      </button>

      {msg && (
        <span className="intra-body">
          {msg}
        </span>
      )}
    </div>
  )
}
