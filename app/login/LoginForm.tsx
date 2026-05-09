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
    <main className="intra-page-shell flex items-center justify-center p-6">
      <div className="intra-card relative w-full max-w-md p-8">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="intra-btn intra-btn-secondary absolute left-5 top-5 min-h-10 rounded-full px-3 py-1.5"
        >
          Volver
        </button>

        <div className="mb-2 flex justify-center">
          <Image src="/logo.png" alt="INTRA Logo" width={260} height={160} />
        </div>

        <h1 className="intra-h2 text-center">Inicia sesión</h1>

        <p className="intra-body mt-2 text-center">
          Accede para continuar en INTRA
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="intra-label">Email</label>
            <input
              className="intra-input mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="intra-label">Contraseña</label>
            <input
              className="intra-input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="tu contraseña"
            />
          </div>

          {msg && (
            <div className="intra-alert-danger">
              <p>{msg}</p>

              {needsEmailVerification && email && (
                <a
                  className="intra-link mt-2 inline-block"
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                >
                  Reenviar correo de verificación
                </a>
              )}
            </div>
          )}

          <button
            disabled={loading}
            className="intra-btn intra-btn-primary w-full"
            type="submit"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="intra-body text-center">
            ¿No tienes cuenta?{" "}
            <a
              className="intra-link"
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
