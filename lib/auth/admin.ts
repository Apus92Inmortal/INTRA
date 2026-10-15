import "server-only"

import { createClient } from "@/lib/supabase/server"

function parseCsvEnv(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

function getAdminAllowlists() {
  return {
    adminUserIds: parseCsvEnv(process.env.ADMIN_USER_IDS),
  }
}

export function isConfiguredAdmin(user: { id: string; email?: string | null }) {
  const { adminUserIds } = getAdminAllowlists()
  // Email strings do not prove account ownership when Auth auto-confirms signup.
  return adminUserIds.has(user.id)
}

// Identity-only guard for enrollment/challenge. Never use it for admin data
// or service-role operations: those must call requireAdminUser below.
export async function requireConfiguredAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Debes iniciar sesión para continuar.")
  }

  const { adminUserIds } = getAdminAllowlists()

  if (adminUserIds.size === 0) {
    throw new Error(
      "Panel admin no configurado. Define ADMIN_USER_IDS en el entorno."
    )
  }

  if (!isConfiguredAdmin(user)) {
    throw new Error("No autorizado para acceder a este panel.")
  }

  return { supabase, user }
}

export class AdminMfaRequiredError extends Error {
  constructor() {
    super("Verifica el código de tu aplicación de autenticación para entrar a Admin.")
    this.name = "AdminMfaRequiredError"
  }
}

export async function requireAdminUser() {
  const { supabase, user } = await requireConfiguredAdminUser()
  // getClaims verifies the signature/expiry (or checks with Auth for symmetric
  // signing keys). Neither decoded cookies nor user_metadata authorize MFA.
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims || data.claims.sub !== user.id) {
    throw new Error("No pudimos verificar tu sesión. Vuelve a iniciar sesión.")
  }
  if (data.claims.aal !== "aal2") {
    throw new AdminMfaRequiredError()
  }
  return { supabase, user }
}
