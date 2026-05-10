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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setMsg("No autenticado")
      return
    }

    const { error } = await supabase.from("matches").insert({
      shipment_id: shipmentId,
      trip_id: tripId,
      requester_id: user.id,
      status: "pending",
    })

    setLoading(false)

    if (error) {
      const m = (error.message || "").toLowerCase()

      if (m.includes("duplicate") || m.includes("matches_unique")) {
        setMsg(null)
        setDone(true)
        return
      }

      setMsg("❌ " + error.message)
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
