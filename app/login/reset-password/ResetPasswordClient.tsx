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
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-400 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white p-8 shadow-[0_24px_70px_rgba(11,44,74,0.16)] sm:p-10">
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
                <h1 className="text-3xl font-bold text-[#0B2C4A]">Revisa tu correo</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Si encontramos una cuenta con <span className="font-semibold">{email}</span>,
                  te enviamos un enlace para cambiar tu contraseña.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-[#EEF2F7] p-4 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-[#0B2C4A]">Qué hacer ahora</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Abre el correo desde tu bandeja principal o spam.</li>
                  <li>Usa el enlace desde el mismo dispositivo si puedes.</li>
                  <li>Cuando abras el link, llegarás a la pantalla para definir tu nueva contraseña.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Volver a iniciar sesión
                </Link>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
                >
                  Enviar a otro correo
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <h1 className="text-3xl font-bold text-[#0B2C4A]">Recupera tu contraseña</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#0B2C4A]">Email</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="tu@email.com"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#0B2C4A] py-3 font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60"
                  type="submit"
                >
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>

              <p className="mt-5 text-sm text-slate-600">
                ¿Recordaste tu contraseña?{" "}
                <Link href="/login" className="font-semibold text-[#0B2C4A] hover:underline">
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
