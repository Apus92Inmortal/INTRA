"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Props = {
  initialFullName: string
  initialPhone: string
  initialRole: string
}

export default function ProfileForm({
  initialFullName,
  initialPhone,
  initialRole,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState(initialFullName)
  const [phone, setPhone] = useState(initialPhone)
  const [role, setRole] = useState(initialRole)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setMsg("❌ No estás autenticado.")
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: role.trim() || null,
      })
      .eq("id", user.id)

    setLoading(false)

    if (error) {
      setMsg("❌ Error guardando: " + error.message)
      return
    }

    setMsg("✅ Guardado")
    router.refresh()
  }

  const onLogout = async () => {
    setLoading(true)
    setMsg(null)
    await supabase.auth.signOut()
    setLoading(false)
    router.push("/login")
  }

  return (
    <div className="rounded-xl border p-6">
      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className="text-sm">Nombre completo</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm">Teléfono</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div>
          <label className="text-sm">Rol</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Opcional (ej: cliente, viajero, admin)"
          />
        </div>

        {msg && <div className="rounded-md border p-3 text-sm">{msg}</div>}

        <div className="flex gap-3">
          <button
            disabled={loading}
            className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>

          <button
            disabled={loading}
            type="button"
            onClick={onLogout}
            className="rounded-md border px-4 py-2 disabled:opacity-60"
          >
            Cerrar sesión
          </button>
        </div>
      </form>

      <p className="mt-4 text-sm">
        <a className="underline" href="/app">
          Volver a /app
        </a>
      </p>
    </div>
  )
}
