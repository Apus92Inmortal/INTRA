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

    // 1. Validar estado actual: No permitir enviar si ya está verificado o pendiente
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
      .select("id, verification_status, metadata")
      .eq("user_id", user.id)
      .single();

    if (verificationError || !verification || verification.verification_status !== "pending") {
      return { success: false, error: "No hay verificación pendiente para notificar." };
    }

    // Anti-spam básico: Validar que el envío es reciente (últimos 5 minutos)
    const metadata = verification.metadata as Record<string, unknown> | null;
    const submittedAt = metadata?.submitted_at;
    if (typeof submittedAt === "string") {
      const submittedDate = new Date(submittedAt);
      const now = new Date();
      const diffMs = Math.abs(now.getTime() - submittedDate.getTime());
      if (diffMs > 5 * 60 * 1000) {
        return { success: false, error: "La notificación ya fue procesada o el envío no es reciente." };
      }
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
