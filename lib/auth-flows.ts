import { isSafeInternalPath } from "@/lib/safe-next"

// Nota operativa: la verificación de email queda lista en código,
// pero debe activarse en Supabase Dashboard cuando el proyecto salga
// del plan free y deje de ser un bloqueo el límite de emails por hora.

export function isUnconfirmedEmailMessage(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed") ||
    (normalized.includes("correo") && normalized.includes("confirm"))
  )
}

export function getVerifyEmailSuccessPath(nextPath?: string | null) {
  const params = new URLSearchParams({ status: "verified" })

  if (isSafeInternalPath(nextPath)) {
    params.set("next", nextPath)
  }

  return `/verify-email?${params.toString()}`
}

export function buildBrowserAuthCallbackUrl(nextPath?: string | null) {
  const url = new URL("/auth/callback", window.location.origin)

  if (isSafeInternalPath(nextPath)) {
    url.searchParams.set("next", nextPath)
  }

  return url.toString()
}

export function getSignupEmailRedirectUrl(nextPath?: string | null) {
  return buildBrowserAuthCallbackUrl(getVerifyEmailSuccessPath(nextPath))
}

export function getPasswordRecoveryRedirectUrl() {
  return new URL("/login/update-password", window.location.origin).toString()
}

export function getResetPasswordErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "❌ Supabase bloqueó temporalmente el envío por límite de correos. Inténtalo de nuevo en un rato."
  }

  if (normalized.includes("invalid email") || normalized.includes("correo") && normalized.includes("válido")) {
    return "❌ Escribe un correo válido para enviarte el enlace."
  }

  if (normalized.includes("user not found") || normalized.includes("not found")) {
    return "❌ No encontré una cuenta registrada con ese correo."
  }

  return "❌ " + message
}

export function getResendVerificationErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "❌ Se alcanzó el límite de correos de verificación. Inténtalo de nuevo más tarde."
  }

  if (normalized.includes("email rate limit exceeded")) {
    return "❌ Supabase alcanzó el límite de verificación por hora del plan actual."
  }

  return "❌ " + message
}

export function getUpdatePasswordErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("session") ||
    normalized.includes("token") ||
    normalized.includes("expired") ||
    normalized.includes("otp") ||
    normalized.includes("invalid")
  ) {
    return "❌ El enlace para cambiar tu contraseña es inválido o expiró. Solicita uno nuevo."
  }

  return "❌ " + message
}

export function validatePasswordChange(password: string, confirmPassword: string) {
  if (password.length < 6) {
    return "La nueva contraseña debe tener al menos 6 caracteres."
  }

  if (password !== confirmPassword) {
    return "Las contraseñas no coinciden."
  }

  return null
}
