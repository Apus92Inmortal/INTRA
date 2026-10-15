"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import type { AuthChangeEvent, AuthSession, Factor as AuthFactor } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import {
  IntraCard, IntraFieldMessage, IntraInput, IntraPrimaryButton, IntraSelect,
} from "@/components/ui/intra-foundation"

type Enrollment = { id: string; qr: string }
type Factor = { id: string }

function privateQrSource(qr: string) {
  // The Auth SDK prefixes its SVG with this data URI. Encode the SVG as
  // image content; never insert it as HTML or send it to an image optimizer.
  const prefix = "data:image/svg+xml;utf-8,"
  const svg = qr.startsWith(prefix) ? qr.slice(prefix.length) : qr
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (parsed.querySelector("parsererror") || parsed.documentElement.localName !== "svg" ||
    parsed.documentElement.namespaceURI !== "http://www.w3.org/2000/svg") return null
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
}

export default function SecurityClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [factors, setFactors] = useState<Factor[]>([])
  const [pendingFactors, setPendingFactors] = useState<Factor[]>([])
  const [factorId, setFactorId] = useState("")
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const operation = useRef(false)
  const identityLive = useRef(true)
  const sessionEpoch = useRef(0)

  const invalidateSession = useCallback(() => {
    identityLive.current = false
    sessionEpoch.current += 1
    setEnrollment(null)
    setCode("")
    setFactors([])
    setPendingFactors([])
    setFactorId("")
    setLoaded(false)
    setVerified(false)
    setBusy(false)
    setError("Tu sesión cambió. Vuelve a iniciar sesión antes de continuar.")
  }, [])

  function sessionIsCurrent(epoch: number) {
    return identityLive.current && sessionEpoch.current === epoch
  }

  async function hasSameIdentity(epoch: number) {
    const { data, error: identityError } = await supabase.auth.getClaims()
    if (!sessionIsCurrent(epoch)) return false
    if (identityError || data?.claims.sub !== userId) {
      invalidateSession()
      return false
    }
    return true
  }

  useEffect(() => {
    let active = true
    identityLive.current = true
    const epoch = sessionEpoch.current
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: AuthSession | null) => {
        if (event === "SIGNED_OUT" || (session && session.user.id !== userId)) {
          active = false
          invalidateSession()
        }
      },
    )
    // Read-only initialization. Enrollment occurs only on the explicit CTA,
    // so StrictMode, reloads and prefetching cannot create extra factors.
    void (async () => {
      try {
        const [listed, claims] = await Promise.all([
          supabase.auth.mfa.listFactors(), supabase.auth.getClaims(),
        ])
        if (!active || !identityLive.current || sessionEpoch.current !== epoch) return
        if (listed.error || !listed.data || claims.error || !claims.data?.claims) {
          setError("No pudimos cargar la verificación. Recarga la página e intenta nuevamente.")
          return
        }
        if (claims.data.claims.sub !== userId) {
          invalidateSession()
          return
        }
        const totp: AuthFactor[] = listed.data.totp.filter((f: AuthFactor) => f.status === "verified")
        const pending = listed.data.all.filter((f: AuthFactor) => f.factor_type === "totp" && f.status === "unverified")
        setFactors(totp.map(f => ({ id: f.id })))
        setPendingFactors(pending.map((f: AuthFactor) => ({ id: f.id })))
        setFactorId(totp[0]?.id ?? "")
        setVerified(claims.data.claims.aal === "aal2")
        setLoaded(true)
      } catch {
        if (active && identityLive.current && sessionEpoch.current === epoch) {
          setError("No pudimos cargar la verificación. Recarga la página e intenta nuevamente.")
        }
      }
    })()
    return () => {
      active = false
      identityLive.current = false
      sessionEpoch.current += 1
      subscription.unsubscribe()
    }
  }, [supabase, userId, invalidateSession])

  async function enroll() {
    if (operation.current || !loaded) return
    operation.current = true
    setBusy(true)
    setError(null)
    const epoch = sessionEpoch.current
    try {
      if (!await hasSameIdentity(epoch)) return
      // A second tab or a reload may already have left a factor unfinished.
      // Never consume another factor slot before checking the current list.
      const listed = await supabase.auth.mfa.listFactors()
      if (!sessionIsCurrent(epoch)) return
      if (listed.error || !listed.data) {
        setError("No pudimos cargar la verificación. Recarga la página e intenta nuevamente.")
        return
      }
      const pending = listed.data.all.filter((f: AuthFactor) => f.factor_type === "totp" && f.status === "unverified")
      if (pending.length > 0) {
        setPendingFactors(pending.map((f: AuthFactor) => ({ id: f.id })))
        setError("Hay una activación pendiente. Solicita ayuda al responsable de INTRA antes de iniciar otra.")
        return
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp", issuer: "INTRA",
      })
      if (!sessionIsCurrent(epoch)) return
      if (enrollError || !data || data.type !== "totp") {
        setError(enrollError?.code === "too_many_enrolled_mfa_factors"
          ? "Hay varias activaciones pendientes. Espera antes de intentar de nuevo o solicita ayuda al responsable de INTRA."
          : "No pudimos activar la verificación. Intenta nuevamente o solicita ayuda al responsable de INTRA.")
        return
      }
      const qr = privateQrSource(data.totp.qr_code)
      setPendingFactors([{ id: data.id }])
      if (!qr) {
        setError("No pudimos mostrar el código QR. Recarga la página y solicita ayuda si el problema continúa.")
        return
      }
      // Only the private QR remains in component memory while enrolling.
      // Do not persist the response, its secret, QR or verification codes.
      setEnrollment({ id: data.id, qr })
      setFactorId(data.id)
    } catch {
      if (sessionIsCurrent(epoch)) setError("No pudimos activar la verificación. Revisa tu conexión e intenta nuevamente.")
    } finally {
      operation.current = false
      if (sessionIsCurrent(epoch)) setBusy(false)
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (operation.current) return
    setError(null)
    if (!/^\d{6}$/.test(code) || !factorId) {
      setError("Escribe el código de seis dígitos de tu aplicación de autenticación.")
      return
    }
    operation.current = true
    setBusy(true)
    const epoch = sessionEpoch.current
    try {
      if (!await hasSameIdentity(epoch)) return
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (!sessionIsCurrent(epoch)) return
      setCode("")
      if (verifyError) {
        setError("No pudimos verificar el código. Usa el código actual e intenta nuevamente.")
        return
      }
      // Verification saves the upgraded session/cookies in the SDK. Remove
      // the setup QR immediately, then independently check the current JWT.
      setEnrollment(null)
      setPendingFactors(current => current.filter(f => f.id !== factorId))
      setFactors(current => [{ id: factorId }, ...current.filter(f => f.id !== factorId)])
      const [claims, listed] = await Promise.all([
        supabase.auth.getClaims(), supabase.auth.mfa.listFactors(),
      ])
      if (!sessionIsCurrent(epoch)) return
      if (claims.error || claims.data?.claims.sub !== userId || claims.data?.claims.aal !== "aal2" || listed.error ||
        !listed.data?.totp.some((f: AuthFactor) => f.id === factorId && f.status === "verified")) {
        setError("No pudimos confirmar la verificación. Recarga la página e intenta nuevamente.")
        return
      }
      setVerified(true)
      router.replace("/app/admin")
      router.refresh()
    } catch {
      if (sessionIsCurrent(epoch)) {
        setCode("")
        setError("No pudimos verificar el código. Revisa tu conexión e intenta nuevamente.")
      }
    } finally {
      operation.current = false
      if (sessionIsCurrent(epoch)) setBusy(false)
    }
  }

  const needsEnrollment = factors.length === 0 && pendingFactors.length === 0 && !enrollment
  const needsCleanup = factors.length === 0 && pendingFactors.length > 0 && !enrollment

  return (
    <IntraCard className="space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <ShieldCheck className="intra-icon-lg text-intra-blue" aria-hidden="true" />
        <h1 className="intra-title">Protege el acceso a Admin</h1>
        <p className="intra-body">
          {verified ? "Tu sesión está verificada. Puedes entrar a Admin." :
            "Admin requiere un código de tu aplicación de autenticación."}
        </p>
      </div>

      {!loaded && !error ? <p className="intra-body" role="status">Cargando verificación...</p> : null}

      {loaded && verified ? (
        <Link href="/app/admin" className="intra-btn intra-btn-primary w-full">Entrar a Admin</Link>
      ) : loaded && needsCleanup ? (
        <div className="space-y-3">
          {/* Auth has no status-conditional delete: another tab could verify
              a factor after listing it. Never unenroll from this recovery UI. */}
          <p className="intra-body">Hay {pendingFactors.length === 1 ? "una activación" : `${pendingFactors.length} activaciones`} sin terminar. No iniciaremos otra para evitar duplicados. Solicita al responsable de INTRA que revise la activación y después recarga esta página.</p>
        </div>
      ) : loaded && needsEnrollment ? (
        <div className="space-y-3">
          <p className="intra-body">Actívala con una aplicación de autenticación en tu dispositivo.</p>
          <IntraPrimaryButton className="w-full" isLoading={busy} onClick={enroll}>
            {busy ? "Activando..." : "Activar verificación"}
          </IntraPrimaryButton>
        </div>
      ) : loaded ? (
        <form onSubmit={verify} noValidate className="space-y-4">
          {enrollment ? (
            <div className="space-y-3">
              <p className="intra-body">Escanea este código QR con tu aplicación de autenticación.</p>
              <Image src={enrollment.qr} alt="Código QR privado para activar la verificación"
                width={240} height={240} unoptimized referrerPolicy="no-referrer"
                className="mx-auto h-auto max-w-full" />
              <p className="intra-caption">No compartas ni guardes capturas de este código QR.</p>
            </div>
          ) : factors.length > 1 ? (
            <div>
              <label htmlFor="admin-mfa-factor" className="intra-label">Dispositivo de autenticación</label>
              <IntraSelect id="admin-mfa-factor" value={factorId} disabled={busy}
                onChange={event => setFactorId(event.target.value)} className="mt-1">
                {factors.map((f, index) => <option key={f.id} value={f.id}>Dispositivo {index + 1}</option>)}
              </IntraSelect>
            </div>
          ) : null}
          <div>
            <label htmlFor="admin-mfa-code" className="intra-label">Código de autenticación</label>
            <IntraInput id="admin-mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy}
              onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-invalid={Boolean(error)} aria-describedby={error ? "admin-mfa-error" : undefined}
              className="mt-1" />
            {error ? <IntraFieldMessage id="admin-mfa-error" role="alert">{error}</IntraFieldMessage> : null}
          </div>
          <IntraPrimaryButton className="w-full" type="submit" isLoading={busy}>
            {busy ? "Verificando..." : "Verificar código"}
          </IntraPrimaryButton>
        </form>
      ) : null}

      {error && (!loaded || needsEnrollment || needsCleanup || verified) ? <IntraFieldMessage role="alert">{error}</IntraFieldMessage> : null}
      <p className="intra-caption">
        Si perdiste tu dispositivo, solicita ayuda al responsable de INTRA para recuperar el acceso.
      </p>
      <Link href="/app/profile" className="intra-btn intra-btn-secondary w-full">Volver a Perfil</Link>
    </IntraCard>
  )
}
