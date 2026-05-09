"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
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

          {success ? (
            <div className="mt-8 space-y-5">
              <div>
                <h1 className="intra-h1">Revisa tu correo</h1>
                <p className="intra-body mt-2">
                  Si encontramos una cuenta con <span className="font-semibold">{email}</span>,
                  te enviamos un enlace para cambiar tu contraseña.
                </p>
              </div>

              <div className="intra-card-compact bg-[#EEF2F7] p-4">
                <p className="intra-body-strong">Qué hacer ahora</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Abre el correo desde tu bandeja principal o spam.</li>
                  <li>Usa el enlace desde el mismo dispositivo si puedes.</li>
                  <li>Cuando abras el link, llegarás a la pantalla para definir tu nueva contraseña.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="intra-btn intra-btn-primary w-full"
                >
                  Volver a iniciar sesión
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
              <div className="mt-8">
                <h1 className="intra-h1">Recupera tu contraseña</h1>
                <p className="intra-body mt-2">
                  Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="intra-label">Email</label>
                  <input
                    className="intra-input mt-1"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="tu@email.com"
                  />
                </div>

                {error ? (
                  <div className="intra-alert-danger">
                    {error}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="intra-btn intra-btn-primary w-full"
                  type="submit"
                >
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>

              <p className="intra-body mt-5">
                ¿Recordaste tu contraseña?{" "}
                <Link href="/login" className="intra-link">
                  Volver a iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
