import { isSafeInternalPath } from "@/lib/safe-next"

const publicAppUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://intra-chi.vercel.app"

// Nota operativa: la verificacion de email queda lista en codigo.

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
  const url = new URL("/auth/callback", publicAppUrl)

  if (isSafeInternalPath(nextPath)) {
    url.searchParams.set("next", nextPath)
  }

  return url.toString()
}

export function getSignupEmailRedirectUrl(nextPath?: string | null) {
  return buildBrowserAuthCallbackUrl(getVerifyEmailSuccessPath(nextPath))
}

export function getPasswordRecoveryRedirectUrl() {
  return new URL("/login/update-password", publicAppUrl).toString()
}

export function getResetPasswordErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Estamos recibiendo muchas solicitudes. Intenta nuevamente en unos minutos."
  }

  if (normalized.includes("invalid email") || normalized.includes("correo") && normalized.includes("válido")) {
    return "Escribe un correo válido para enviarte el enlace."
  }

  if (normalized.includes("user not found") || normalized.includes("not found")) {
    return "Si existe una cuenta con ese correo, enviaremos un enlace para cambiar tu contraseña."
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "No pudimos enviar el enlace. Revisa tu conexión e intenta nuevamente."
  }

  return "No pudimos enviar el enlace. Intenta nuevamente."
}

export function getResendVerificationErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Estamos recibiendo muchas solicitudes. Intenta reenviar el correo más tarde."
  }

  if (normalized.includes("email rate limit exceeded")) {
    return "No pudimos reenviar el correo en este momento. Intenta más tarde."
  }

  if (normalized.includes("invalid email") || normalized.includes("email")) {
    return "Necesitamos un correo válido para reenviar la verificación."
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "No pudimos reenviar el correo. Revisa tu conexión e intenta nuevamente."
  }

  return "No pudimos reenviar el correo. Intenta nuevamente."
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
    return "El enlace para cambiar tu contraseña es inválido o expiró. Solicita uno nuevo."
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "No pudimos actualizar la contraseña. Revisa tu conexión e intenta nuevamente."
  }

  return "No pudimos actualizar la contraseña. Intenta nuevamente."
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
