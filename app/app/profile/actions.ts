"use server";

import { createClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/notifications/admin";

/**
 * Notifica a los administradores sobre una nueva verificación de usuario enviada.
 * Se valida que el usuario tenga una verificación pendiente antes de disparar.
 */
export async function notifyAdminUserVerificationAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado." };
    }

    // Validar que el usuario tiene una verificación pendiente
    const { data: verification, error: verificationError } = await supabase
      .from("user_verifications")
      .select("id, verification_status")
      .eq("user_id", user.id)
      .single();

    if (verificationError || !verification || verification.verification_status !== "pending") {
      return { success: false, error: "No hay verificación pendiente para notificar." };
    }

    await notifyAdmins({
      type: "admin_user_verification_submitted",
      title: "Nueva verificación de usuario",
      message: "Un usuario envió información para verificación.",
    });

    return { success: true };
  } catch (error) {
    console.error("Error en notifyAdminUserVerificationAction:", error);
    return { success: false, error: "No se pudo notificar a los administradores." };
  }
}
