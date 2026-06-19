import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Obtiene la lista de IDs de usuario configurados como administradores
 * desde la variable de entorno ADMIN_USER_IDS.
 */
function getAdminUserIds(): string[] {
  const env = process.env.ADMIN_USER_IDS ?? ""
  return env
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
}

interface AdminNotificationPayload {
  type: string
  title: string
  message: string
  related_match_id?: string | null
}

/**
 * Notifica a todos los administradores configurados.
 * Es una operación no bloqueante; si falla, se loguea pero no lanza error.
 */
export async function notifyAdmins(payload: AdminNotificationPayload) {
  const adminIds = getAdminUserIds()

  if (adminIds.length === 0) {
    console.warn("No hay administradores configurados en ADMIN_USER_IDS para notificar.")
    return
  }

  try {
    const supabase = createAdminClient()

    const notifications = adminIds.map((userId) => ({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      related_match_id: payload.related_match_id ?? null,
      is_read: false,
    }))

    const { error } = await supabase.from("notifications").insert(notifications)

    if (error) {
      console.error("Error al notificar a los administradores:", error.message)
    }
  } catch (err) {
    console.error("Excepción inesperada al notificar a los administradores:", err)
  }
}
