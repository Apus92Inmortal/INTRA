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
    <main className="intra-page-shell p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="intra-card w-full max-w-md p-8 text-center sm:p-10">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="INTRA Logo" width={260} height={160} />
          </div>

          {status === "verified" ? (
            <>
              <h1 className="intra-h1 mt-6">Email verificado</h1>
              <p className="intra-body mt-3">
                Tu correo ya quedó confirmado. Ya puedes entrar y continuar dentro de INTRA.
              </p>

              <div className="mt-6 rounded-2xl border border-intra-success-border bg-intra-success-soft p-4 text-sm text-intra-text-success">
                ✅ La validación del enlace salió bien.
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={continueHref}
                  className="intra-btn intra-btn-primary w-full"
                >
                  Continuar
                </Link>
                <Link
                  href="/login"
                  className="intra-btn intra-btn-secondary w-full"
                >
                  Ir al login
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="intra-h1 mt-6">Revisa tu correo</h1>

              <p className="intra-body mt-3">
                Te enviaremos un enlace de verificación a{" "}
                <span className="intra-body-strong">{email || "tu correo"}</span>.
                Cuando en Supabase se active <span className="font-semibold">Confirm email</span>,
                esta pantalla y el reenvío quedarán listos para producción sin desarrollo adicional.
              </p>

              <div className="intra-card-compact mt-6 bg-intra-bg-app p-4 text-left">
                <p className="intra-body-strong">Qué hacer ahora</p>
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
                      ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                      : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
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
                  className="intra-btn intra-btn-primary w-full"
                >
                  {loading
                    ? "Reenviando..."
                    : cooldown > 0
                      ? `Reenviar en ${cooldown}s`
                      : "Reenviar email de verificación"}
                </button>

                <Link
                  href={backHref}
                  className="intra-link inline-block"
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
