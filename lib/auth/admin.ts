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
    adminEmails: new Set(
      Array.from(parseCsvEnv(process.env.ADMIN_EMAILS)).map((email) =>
        email.toLowerCase()
      )
    ),
  }
}

export function isConfiguredAdmin(user: { id: string; email?: string | null }) {
  const { adminUserIds, adminEmails } = getAdminAllowlists()
  const normalizedEmail = user.email?.trim().toLowerCase() ?? ""

  return adminUserIds.has(user.id) || (normalizedEmail ? adminEmails.has(normalizedEmail) : false)
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

  const { adminUserIds, adminEmails } = getAdminAllowlists()

  if (adminUserIds.size === 0 && adminEmails.size === 0) {
    throw new Error(
      "Panel admin no configurado. Define ADMIN_USER_IDS o ADMIN_EMAILS en el entorno."
    )
  }

  if (!isConfiguredAdmin(user)) {
    throw new Error("No autorizado para acceder a este panel.")
  }

  return { supabase, user }
}
