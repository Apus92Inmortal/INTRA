"use server"

import { revalidatePath } from "next/cache"
import { requireAdminUser } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"

type ActionResult = {
  success: boolean
  error?: string
  message?: string
}

const ALLOWED_VERIFICATION_STATUSES = new Set(["verified", "rejected"])

function toTrimmedString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

export async function reviewUserVerificationAction(formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireAdminUser()
    const verificationId = toTrimmedString(formData.get("verificationId"))
    const status = toTrimmedString(formData.get("status"))
    const rejectionReason = toTrimmedString(formData.get("rejectionReason"))

    if (!verificationId) {
      return { success: false, error: "No llegó la verificación a revisar." }
    }

    if (!ALLOWED_VERIFICATION_STATUSES.has(status)) {
      return { success: false, error: "Estado de verificación no válido." }
    }

    if (status === "rejected" && !rejectionReason) {
      return { success: false, error: "Escribe el motivo del rechazo para continuar." }
    }

    const admin = createAdminClient()
    const { data: verification, error: verificationError } = await admin
      .from("user_verifications")
      .select("id")
      .eq("id", verificationId)
      .maybeSingle()

    if (verificationError || !verification) {
      return {
        success: false,
        error: verificationError?.message ?? "No encontramos la verificación solicitada.",
      }
    }

    const patch = {
      verification_status: status,
      rejection_reason: status === "rejected" ? rejectionReason : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await admin
      .from("user_verifications")
      .update(patch)
      .eq("id", verificationId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath("/app/admin")
    revalidatePath("/app/admin/verifications")
    revalidatePath("/app/profile")
    revalidatePath("/app")

    return {
      success: true,
      message: status === "verified" ? "Cuenta verificada." : "Verificación rechazada.",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos actualizar la verificación.",
    }
  }
}

