"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  getUpdatePasswordErrorMessage,
  validatePasswordChange,
} from "@/lib/auth-flows"

type UpdatePasswordClientProps = {
  initialError?: string | null
}

export default function UpdatePasswordClient({
  initialError = null,
}: UpdatePasswordClientProps) {
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(initialError)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!isSuccess) return

    const timeout = window.setTimeout(() => {
      window.location.assign("/login")
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [isSuccess])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)

    const validationError = validatePasswordChange(password, confirmPassword)

    if (validationError) {
      setMessage(`❌ ${validationError}`)
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (error) {
      setMessage(getUpdatePasswordErrorMessage(error.message))
      return
    }

    setIsSuccess(true)
    setMessage("✅ Tu contraseña quedó actualizada. Te llevaremos al login.")

    await supabase.auth.signOut()
  }

  return (
    <main className="intra-page-shell p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="intra-card w-full max-w-md overflow-hidden p-8 sm:p-10">
          <Link
            href="/login"
            className="inline-flex rounded-3xl bg-white/96 p-4 shadow-[0_18px_50px_rgba(8,26,44,0.12)] ring-1 ring-gray-100 transition hover:scale-[1.01] sm:p-5"
          >
            <Image
              src="/logo.png"
              alt="INTRA"
              width={280}
              height={180}
              className="h-auto w-[180px] sm:w-[220px]"
              priority
            />
          </Link>

          <div className="mt-8">
            <h1 className="intra-h1">Crea tu nueva contraseña</h1>
            <p className="intra-body mt-2">
              Usa una contraseña nueva de mínimo 6 caracteres para volver a entrar a INTRA.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="intra-label">Nueva contraseña</label>
              <input
                className="intra-input mt-1"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                placeholder="mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="intra-label">Confirma la contraseña</label>
              <input
                className="intra-input mt-1"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                placeholder="repite la contraseña"
              />
            </div>

            {message ? (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  isSuccess
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              disabled={loading || isSuccess}
              className="intra-btn intra-btn-primary w-full"
              type="submit"
            >
              {loading ? "Guardando..." : isSuccess ? "Redirigiendo..." : "Guardar nueva contraseña"}
            </button>
          </form>

          <p className="intra-body mt-5">
            ¿Prefieres empezar de nuevo?{" "}
            <Link href="/login/reset-password" className="intra-link">
              Solicitar otro enlace
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
