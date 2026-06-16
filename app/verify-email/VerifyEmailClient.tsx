"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, MailCheck, Send } from "lucide-react"
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
  const [message, setMessage] = useState<string | null>(
    initialError ? getResendVerificationErrorMessage(initialError) : null
  )
  const [messageTone, setMessageTone] = useState<"success" | "error">(
    initialError ? "error" : "success"
  )
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
      setMessageTone("error")
      setMessage("Necesitamos un correo válido para reenviar la verificación.")
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
      setMessageTone("error")
      setMessage(getResendVerificationErrorMessage(error.message))
      return
    }

    setCooldown(RESEND_COOLDOWN_SECONDS)
    setMessageTone("success")
    setMessage("Te reenviamos el correo de verificación.")
  }

  return (
    <main className="intra-page-shell p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <div className="intra-card w-full max-w-md p-6 text-center sm:p-8">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="INTRA Logo" width={220} height={136} className="h-auto w-[160px]" priority />
          </div>

          {status === "verified" ? (
            <>
              <div className="mx-auto mt-6 hidden h-12 w-12 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-success-soft text-intra-text-success sm:flex">
                <CheckCircle2 className="intra-icon-2xl" aria-hidden="true" />
              </div>
              <h1 className="intra-h1 mt-4">Correo verificado</h1>
              <p className="intra-body mt-3">
                Tu cuenta ya está lista para entrar a INTRA.
              </p>

              <div className="mt-6 rounded-[var(--intra-radius-xs)] border border-intra-success-border bg-intra-success-soft p-4 intra-caption text-intra-text-success">
                Correo verificado correctamente.
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={continueHref}
                  className="intra-btn intra-btn-primary w-full"
                >
                  Entrar a INTRA
                </Link>
                <Link
                  href="/app?tab=login"
                  className="intra-btn intra-btn-secondary w-full"
                >
                  Volver a entrar
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mt-6 hidden h-12 w-12 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-info-soft text-intra-info sm:flex">
                <MailCheck className="intra-icon-2xl" aria-hidden="true" />
              </div>
              <h1 className="intra-h1 mt-4">Verifica tu correo</h1>

              <p className="intra-body mt-3">
                Te enviamos un enlace para confirmar tu cuenta
                {email ? (
                  <>
                    {" "}a <span className="intra-body-strong">{email}</span>.
                  </>
                ) : (
                  "."
                )}
              </p>

              <div className="intra-card-compact mt-6 bg-intra-bg-app p-4 text-left">
                <p className="intra-body-strong">Ayuda rápida</p>
                <p className="intra-body mt-1">
                  Revisa tu bandeja de entrada. Si no aparece, mira spam o promociones.
                </p>
              </div>

              {message ? (
                <div
                  className={`mt-4 flex items-start gap-3 rounded-[var(--intra-radius-xs)] border p-4 text-left intra-caption ${
                    messageTone === "success"
                      ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                      : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                  }`}
                >
                  {messageTone === "success" ? (
                    <CheckCircle2 className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{message}</span>
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="intra-btn intra-btn-primary w-full"
                >
                  <Send className="intra-icon-md" aria-hidden="true" />
                  {loading
                    ? "Reenviando..."
                    : cooldown > 0
                      ? `Reenviar en ${cooldown}s`
                      : "Reenviar correo"}
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
