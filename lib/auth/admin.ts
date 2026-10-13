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

export async function requireAdminUser() {
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
