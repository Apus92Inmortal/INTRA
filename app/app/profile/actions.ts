"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmins } from "@/lib/notifications/admin";

export type SubmitVerificationPayload = {
  documentPhotoUrl: string;
  selfieUrl: string;
  termsVersion: string;
  metadata?: Record<string, unknown>;
};

/**
 * Procesa el envío o re-envío de una verificación de identidad.
 * Usa el cliente administrativo para asegurar que solo los campos permitidos sean modificados
 * y forzar el estado a 'pending', evitando escaladas de privilegios vía RLS.
 */
export async function submitUserVerificationAction(payload: SubmitVerificationPayload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado." };
    }

    const admin = createAdminClient();

    // 1. Validar ownership y formato de paths de archivos (Seguridad SEC-001)
    const documentPrefix = `${user.id}/document.`;
    const selfiePrefix = `${user.id}/selfie.`;

    if (
      !payload.documentPhotoUrl.startsWith(documentPrefix) ||
      !payload.selfieUrl.startsWith(selfiePrefix)
    ) {
      return {
        success: false,
        error: "Los archivos de verificación no pertenecen al usuario autenticado o tienen un formato inválido.",
      };
    }

    // 2. Validar estado actual: No permitir enviar si ya está verificado o pendiente
    const { data: existing } = await admin
      .from("user_verifications")
      .select("verification_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.verification_status === "verified") {
      return { success: false, error: "Tu cuenta ya está verificada." };
    }

    if (existing?.verification_status === "pending") {
      return { success: false, error: "Ya tienes una verificación en revisión." };
    }

    // 2. Realizar el upsert seguro
    // Solo enviamos los campos que el usuario tiene permitido "proponer"
    // Los campos admin (reviewed_at, reviewed_by, rejection_reason) se resetean
    const { error: upsertError } = await admin.from("user_verifications").upsert(
      {
        user_id: user.id,
        verification_status: "pending",
        document_photo_url: payload.documentPhotoUrl,
        selfie_url: payload.selfieUrl,
        terms_version: payload.termsVersion,
        data_consent_accepted_at: new Date().toISOString(),
        rejection_reason: null,
        reviewed_at: null,
        reviewed_by: null,
        verification_level: "basic_verified",
        updated_at: new Date().toISOString(),
        metadata: {
          ...payload.metadata,
          source: "profile_verification_panel_action",
          submitted_at: new Date().toISOString(),
        },
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    // 3. Notificar a administradores (asíncrono)
    try {
      await notifyAdmins({
        type: "admin_user_verification_submitted",
        title: "Nueva verificación de usuario",
        message: "Un usuario envió información para verificación.",
      });
    } catch (notifyError) {
      console.error("Error al notificar admins:", notifyError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error en submitUserVerificationAction:", error);
    return { success: false, error: "No se pudo procesar la verificación." };
  }
}
