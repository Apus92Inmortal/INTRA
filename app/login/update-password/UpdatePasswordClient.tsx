"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, LockKeyhole } from "lucide-react"
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
  const [message, setMessage] = useState<string | null>(
    initialError ? getUpdatePasswordErrorMessage(initialError) : null
  )
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
      setMessage(validationError)
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
    setMessage("Ya puedes iniciar sesión con tu nueva contraseña.")

    await supabase.auth.signOut()
  }

  return (
    <main className="intra-page-shell p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <div className="intra-card w-full max-w-md overflow-hidden p-6 sm:p-8">
          <Link
            href="/app?tab=login"
            className="inline-flex rounded-[var(--intra-radius-sm)] border border-intra-border-soft bg-intra-card p-3 shadow-[var(--intra-shadow-base)] transition hover:scale-[1.01]"
          >
            <Image
              src="/logo.png"
              alt="INTRA"
              width={280}
              height={180}
              className="h-auto w-[150px] sm:w-[170px]"
              priority
            />
          </Link>

          <div className="mt-6">
            <div className="mb-4 hidden h-12 w-12 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-info-soft text-intra-info sm:flex">
              <LockKeyhole className="intra-icon-2xl" aria-hidden="true" />
            </div>
            <h1 className="intra-h1">
              {isSuccess ? "Contraseña actualizada" : "Nueva contraseña"}
            </h1>
            <p className="intra-body mt-2">
              {isSuccess
                ? "Ya puedes iniciar sesión con tu nueva contraseña."
                : "Usa una contraseña segura para proteger tu cuenta."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                className={`flex items-start gap-3 rounded-[var(--intra-radius-xs)] border p-4 intra-caption ${
                  isSuccess
                    ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                    : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
                )}
                <span>{message}</span>
              </div>
            ) : null}

            <button
              disabled={loading || isSuccess}
              className="intra-btn intra-btn-primary w-full"
              type="submit"
            >
              {loading ? "Guardando..." : isSuccess ? "Contraseña actualizada" : "Guardar contraseña"}
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
