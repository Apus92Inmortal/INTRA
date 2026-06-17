"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { AlertCircle, CheckCircle2, Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  getPasswordRecoveryRedirectUrl,
  getResetPasswordErrorMessage,
} from "@/lib/auth-flows"

export default function ResetPasswordClient() {
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordRecoveryRedirectUrl(),
    })

    setLoading(false)

    if (error) {
      setError(getResetPasswordErrorMessage(error.message))
      return
    }

    setSuccess(true)
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

          {success ? (
            <div className="mt-6 space-y-5">
              <div className="hidden h-12 w-12 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-success-soft text-intra-text-success sm:flex">
                <CheckCircle2 className="intra-icon-2xl" aria-hidden="true" />
              </div>
              <div>
                <h1 className="intra-h1">Revisa tu correo</h1>
                <p className="intra-body mt-2">
                  Si existe una cuenta con ese correo, enviaremos un enlace para cambiar tu contraseña.
                </p>
              </div>

              <div className="intra-card-compact bg-intra-bg-app p-4">
                <p className="intra-body-strong">Siguiente paso</p>
                <p className="intra-body mt-1">Abre el enlace del correo para crear una nueva contraseña.</p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/app?tab=login"
                  className="intra-btn intra-btn-primary w-full"
                >
                  Volver a entrar
                </Link>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="intra-btn intra-btn-secondary w-full"
                >
                  Enviar a otro correo
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <h1 className="intra-h1">Recupera tu contraseña</h1>
                <p className="intra-body mt-2">
                  Te enviaremos un enlace para volver a entrar.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="intra-label">Correo</label>
                  <input
                    className="intra-input mt-1"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                {error ? (
                  <div className="intra-alert-danger flex items-start gap-3">
                    <AlertCircle className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="intra-btn intra-btn-primary w-full"
                  type="submit"
                >
                  <Send className="intra-icon-md" aria-hidden="true" />
                  {loading ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>

              <p className="intra-body mt-5">
                ¿Recordaste tu contraseña?{" "}
                <Link href="/app?tab=login" className="intra-link mt-1 block sm:mt-0 sm:inline">
                  Volver a entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
