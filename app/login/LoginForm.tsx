"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

type LoginFormProps = {
  initialError?: string | null
}

function isUnconfirmedEmailMessage(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed") ||
    (normalized.includes("correo") && normalized.includes("confirm"))
  )
}

export default function LoginForm({ initialError = null }: LoginFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(initialError)
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    setNeedsEmailVerification(false)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      if (isUnconfirmedEmailMessage(error.message)) {
        setMsg("❌ Debes verificar tu correo antes de ingresar.")
        setNeedsEmailVerification(true)
        return
      }

      setMsg("❌ " + error.message)
      return
    }

    router.push("/app")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-400 p-6">
      <div className="w-full max-w-md rounded-2xl shadow-lg bg-white p-8 relative">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute top-5 left-5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#0B2C4A] hover:bg-gray-200 transition"
        >
          Volver
        </button>

        <div className="flex justify-center mb-0">
          <Image src="/logo.png" alt="INTRA Logo" width={260} height={160} />
        </div>

        <h1 className="text-2xl font-bold text-center text-[#0B2C4A]">
          Inicia sesión
        </h1>

        <p className="mt-2 text-sm text-center text-gray-600">
          Accede para continuar en INTRA
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-[#0B2C4A] font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="text-sm text-[#0B2C4A] font-medium">
              Contraseña
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="tu contraseña"
            />
          </div>

          {msg && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-600">
              <p>{msg}</p>

              {needsEmailVerification && email && (
                <a
                  className="mt-2 inline-block font-semibold text-[#0B2C4A] hover:underline"
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                >
                  Reenviar correo de verificación
                </a>
              )}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#0B2C4A] text-white py-2 font-semibold hover:scale-105 transition disabled:opacity-60"
            type="submit"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-sm text-center text-gray-500">
            ¿No tienes cuenta?{" "}
            <a
              className="text-[#0B2C4A] font-semibold hover:underline"
              href="/register"
            >
              Regístrate
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}
