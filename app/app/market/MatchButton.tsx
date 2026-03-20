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
      // Mensaje amigable cuando es duplicado por constraint unique(shipment_id, trip_id)
      if (m.includes("duplicate") || m.includes("matches_unique")) {
        setMsg("Ya solicitaste este envio para ese viaje ✅")
        setDone(true)
        return
      }

      setMsg("❌ " + error.message)
      return
    }

    setDone(true)
    setMsg("Solicitud enviada ✅ (esperando respuesta del cliente)")
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={loading || done}
        className="rounded-md bg-black text-white px-3 py-2 disabled:opacity-60"
      >
        {loading ? "Enviando..." : done ? "Solicitado" : "Solicitar transporte"}
      </button>

      {msg && <span className="text-sm opacity-80">{msg}</span>}
    </div>
  )
}
