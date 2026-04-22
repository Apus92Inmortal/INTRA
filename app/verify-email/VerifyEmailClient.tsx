"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

type VerifyEmailClientProps = {
  email?: string
}

function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

export default function VerifyEmailClient({ email = "" }: VerifyEmailClientProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleResend = async () => {
    if (!email) {
      setMsg("❌ No encontré el correo para reenviar la verificación.")
      return
    }

    setLoading(true)
    setMsg(null)

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    })

    setLoading(false)

    if (error) {
      setMsg("❌ " + error.message)
      return
    }

    setMsg("✅ Te reenviamos el correo de verificación.")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-400 p-6">
      <div className="w-full max-w-md rounded-2xl shadow-lg bg-white p-8 text-center">
        <div className="flex justify-center mb-0">
          <Image src="/logo.png" alt="INTRA Logo" width={260} height={160} />
        </div>

        <h1 className="text-2xl font-bold text-[#0B2C4A]">
          Revisa tu correo
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Te enviamos un enlace de verificación a{" "}
          <span className="font-semibold text-[#0B2C4A]">
            {email || "tu correo"}
          </span>
          . Abre ese mensaje y confirma tu cuenta para poder entrar a INTRA.
        </p>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left text-sm text-gray-600">
          <p>Qué hacer ahora:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Revisa tu bandeja de entrada.</li>
            <li>Si no aparece, busca en spam o promociones.</li>
            <li>Después de confirmar, vuelve a INTRA desde el enlace del correo.</li>
          </ul>
        </div>

        {msg && (
          <div className="mt-4 rounded-md border border-gray-200 bg-white p-3 text-sm text-[#0B2C4A]">
            {msg}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="w-full rounded-xl bg-[#0B2C4A] py-2 font-semibold text-white hover:scale-105 transition disabled:opacity-60"
          >
            {loading ? "Reenviando..." : "Reenviar correo"}
          </button>

          <Link
            href="/login"
            className="inline-block text-sm font-semibold text-[#0B2C4A] hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  )
}
