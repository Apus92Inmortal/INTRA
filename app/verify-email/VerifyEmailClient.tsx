"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  getResendVerificationErrorMessage,
  getSignupEmailRedirectUrl,
} from "@/lib/auth-flows"
import { getSafeInternalPath, isSafeInternalPath } from "@/lib/safe-next"

type VerifyEmailClientProps = {
  email?: string
  next?: string
  status?: "verified" | null
  initialError?: string | null
}

const RESEND_COOLDOWN_SECONDS = 45

export default function VerifyEmailClient({
  email = "",
  next,
  status = null,
  initialError = null,
}: VerifyEmailClientProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(initialError)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return

    const interval = window.setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [cooldown])

  const backHref = useMemo(() => {
    if (isSafeInternalPath(next)) {
      return `/app?tab=login&next=${encodeURIComponent(next)}`
    }

    return "/app?tab=login"
  }, [next])

  const continueHref = getSafeInternalPath(next)

  const handleResend = async () => {
    if (!email) {
      setMessage("❌ No encontré el correo para reenviar la verificación.")
      return
    }

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getSignupEmailRedirectUrl(next),
      },
    })

    setLoading(false)

    if (error) {
      setMessage(getResendVerificationErrorMessage(error.message))
      return
    }

    setCooldown(RESEND_COOLDOWN_SECONDS)
    setMessage("✅ Te reenviamos el correo de verificación.")
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-400 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 text-center shadow-[0_24px_70px_rgba(11,44,74,0.16)] sm:p-10">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="INTRA Logo" width={260} height={160} />
          </div>

          {status === "verified" ? (
            <>
              <h1 className="mt-6 text-3xl font-bold text-[#0B2C4A]">Email verificado</h1>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Tu correo ya quedó confirmado. Ya puedes entrar y continuar dentro de INTRA.
              </p>

              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                ✅ La validación del enlace salió bien.
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={continueHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Continuar
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
                >
                  Ir al login
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-6 text-3xl font-bold text-[#0B2C4A]">Revisa tu correo</h1>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Te enviaremos un enlace de verificación a{" "}
                <span className="font-semibold text-[#0B2C4A]">{email || "tu correo"}</span>.
                Cuando en Supabase se active <span className="font-semibold">Confirm email</span>,
                esta pantalla y el reenvío quedarán listos para producción sin desarrollo adicional.
              </p>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left text-sm text-gray-600">
                <p className="font-semibold text-[#0B2C4A]">Qué hacer ahora</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Revisa tu bandeja de entrada.</li>
                  <li>Si no aparece, busca en spam o promociones.</li>
                  <li>Después de confirmar, vuelve a INTRA desde el enlace del correo.</li>
                </ul>
              </div>

              {message ? (
                <div
                  className={`mt-4 rounded-2xl border p-4 text-sm ${
                    message.startsWith("✅")
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="w-full rounded-2xl bg-[#0B2C4A] py-3 font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {loading
                    ? "Reenviando..."
                    : cooldown > 0
                      ? `Reenviar en ${cooldown}s`
                      : "Reenviar email de verificación"}
                </button>

                <Link
                  href={backHref}
                  className="inline-block text-sm font-semibold text-[#0B2C4A] hover:underline"
                >
                  Volver a iniciar sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
