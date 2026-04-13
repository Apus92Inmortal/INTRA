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

      if (m.includes("duplicate") || m.includes("matches_unique")) {
        setMsg("Solicitud enviada ✅")
        setDone(true)
        return
      }

      setMsg("❌ " + error.message)
      return
    }

    setDone(true)
    setMsg("Solicitud enviada ✅")
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        onClick={onClick}
        disabled={loading || done}
        className="rounded-2xl bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Enviando..." : done ? "Pendiente" : "Solicitar transporte"}
      </button>

      {msg && (
        <span className="text-sm text-gray-600">
          {msg}
        </span>
      )}
    </div>
  )
}