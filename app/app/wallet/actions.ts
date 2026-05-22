"use server"

import { revalidatePath } from "next/cache"
import { requireAdminUser } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type ActionResult = {
  success: boolean
  error?: string
  message?: string
}

type PayoutAccountInput = {
  id?: string
  accountHolderName: string
  documentNumber: string
  bankName: string
  accountType: string
  accountNumber: string
  brebKey: string
  isDefault: boolean
}

const ALLOWED_ACCOUNT_TYPES = new Set(["ahorros", "corriente", "nequi", "daviplata"])
const ALLOWED_PAYOUT_STATUSES = new Set(["approved", "rejected", "paid"])

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Debes iniciar sesión para continuar.")
  }

  return { supabase, user }
}

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "on" || value === "1"
}

function toTrimmedString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizePayoutAccount(formData: FormData): PayoutAccountInput {
  const accountType = toTrimmedString(formData.get("accountType"))

  return {
    id: toTrimmedString(formData.get("id")) || undefined,
    accountHolderName: toTrimmedString(formData.get("accountHolderName")),
    documentNumber: toTrimmedString(formData.get("documentNumber")),
    bankName: toTrimmedString(formData.get("bankName")),
    accountType,
    accountNumber: toTrimmedString(formData.get("accountNumber")),
    brebKey: toTrimmedString(formData.get("brebKey")),
    isDefault: parseBoolean(formData.get("isDefault")),
  }
}

function validatePayoutAccount(input: PayoutAccountInput) {
  if (!ALLOWED_ACCOUNT_TYPES.has(input.accountType)) {
    return "Selecciona un método de retiro válido."
  }

  if (!input.accountHolderName) {
    return "El nombre del titular es obligatorio."
  }

  if (!input.documentNumber) {
    return "El documento es obligatorio."
  }

  if (!input.accountNumber) {
    return "El número de cuenta o celular es obligatorio."
  }

  if ((input.accountType === "ahorros" || input.accountType === "corriente") && !input.bankName) {
    return "La entidad bancaria es obligatoria para cuentas bancarias."
  }

  return null
}

export async function savePayoutAccountAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser()
    const payload = normalizePayoutAccount(formData)
    const validationError = validatePayoutAccount(payload)

    if (validationError) {
      return { success: false, error: validationError }
    }

    const { data: existingAccounts, error: accountsError } = await supabase
      .from("traveler_payout_accounts")
      .select("id")
      .eq("traveler_user_id", user.id)

    if (accountsError) {
      return { success: false, error: accountsError.message }
    }

    const shouldBeDefault = payload.isDefault || (existingAccounts?.length ?? 0) === 0
    const admin = createAdminClient()

    if (shouldBeDefault) {
      const { error: resetDefaultError } = await admin
        .from("traveler_payout_accounts")
        .update({ is_default: false })
        .eq("traveler_user_id", user.id)

      if (resetDefaultError) {
        return { success: false, error: resetDefaultError.message }
      }
    }

    const row = {
      traveler_user_id: user.id,
      account_holder_name: payload.accountHolderName,
      document_number: payload.documentNumber,
      bank_name:
        payload.accountType === "nequi" || payload.accountType === "daviplata"
          ? payload.accountType === "nequi"
            ? "Nequi"
            : "Daviplata"
          : payload.bankName || null,
      account_type: payload.accountType,
      account_number: payload.accountNumber,
      breb_key: payload.brebKey || null,
      is_default: shouldBeDefault,
      verification_status: "pending",
      verified_at: null,
      verified_by: null,
      verification_notes: null,
    }

    if (payload.id) {
      const { data: ownAccount, error: ownAccountError } = await supabase
        .from("traveler_payout_accounts")
        .select("id")
        .eq("id", payload.id)
        .eq("traveler_user_id", user.id)
        .maybeSingle()

      if (ownAccountError || !ownAccount) {
        return {
          success: false,
          error: ownAccountError?.message ?? "No encontramos la cuenta a editar.",
        }
      }

      const { error } = await admin
        .from("traveler_payout_accounts")
        .update(row)
        .eq("id", payload.id)
        .eq("traveler_user_id", user.id)

      if (error) {
        return { success: false, error: error.message }
      }
    } else {
      const { error } = await admin.from("traveler_payout_accounts").insert(row)

      if (error) {
        return { success: false, error: error.message }
      }
    }

    revalidatePath("/app/wallet")
    revalidatePath("/app/wallet/payout")
    revalidatePath("/app/wallet/payout/accounts")

    return {
      success: true,
      message: payload.id ? "Cuenta actualizada." : "Cuenta agregada.",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos guardar la cuenta.",
    }
  }
}

export async function deletePayoutAccountAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser()
    const accountId = toTrimmedString(formData.get("id"))

    if (!accountId) {
      return { success: false, error: "No llegó la cuenta a eliminar." }
    }

    const { data: ownAccount, error: ownAccountError } = await supabase
      .from("traveler_payout_accounts")
      .select("id, is_default")
      .eq("id", accountId)
      .eq("traveler_user_id", user.id)
      .maybeSingle()

    if (ownAccountError || !ownAccount) {
      return {
        success: false,
        error: ownAccountError?.message ?? "No encontramos la cuenta a eliminar.",
      }
    }

    const admin = createAdminClient()
    const { error: deleteError } = await admin
      .from("traveler_payout_accounts")
      .delete()
      .eq("id", accountId)
      .eq("traveler_user_id", user.id)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    if (ownAccount.is_default) {
      const { data: fallbackAccount } = await supabase
        .from("traveler_payout_accounts")
        .select("id")
        .eq("traveler_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (fallbackAccount?.id) {
        await admin
          .from("traveler_payout_accounts")
          .update({ is_default: true })
          .eq("id", fallbackAccount.id)
          .eq("traveler_user_id", user.id)
      }
    }

    revalidatePath("/app/wallet")
    revalidatePath("/app/wallet/payout")
    revalidatePath("/app/wallet/payout/accounts")

    return { success: true, message: "Cuenta eliminada." }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos eliminar la cuenta.",
    }
  }
}

export async function requestPayoutAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser()
    const rawAmount = toTrimmedString(formData.get("amount"))
    const payoutAccountId = toTrimmedString(formData.get("payoutAccountId"))
    const note = toTrimmedString(formData.get("note"))
    const amount = Number(rawAmount.replace(/[^\d.-]/g, ""))

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Ingresa un monto válido." }
    }

    const { data, error } = await supabase.rpc("request_payout", {
      p_amount: amount,
      p_payout_account_id: payoutAccountId || null,
      p_note: note || null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      return {
        success: false,
        error:
          typeof data.error === "string"
            ? data.error
            : "No pudimos crear la solicitud de retiro.",
      }
    }

    revalidatePath("/app/wallet")
    revalidatePath("/app/wallet/history")
    revalidatePath("/app/wallet/payout")
    revalidatePath("/app/admin/payouts")

    return { success: true, message: "Solicitud de retiro enviada." }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos crear la solicitud de retiro.",
    }
  }
}

export async function updatePayoutStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireAdminUser()
    const payoutId = toTrimmedString(formData.get("payoutId"))
    const status = toTrimmedString(formData.get("status"))
    const reviewNotes = toTrimmedString(formData.get("reviewNotes"))
    const paidReference = toTrimmedString(formData.get("paidReference"))

    if (!payoutId) {
      return { success: false, error: "No llegó el retiro a actualizar." }
    }

    if (!ALLOWED_PAYOUT_STATUSES.has(status)) {
      return { success: false, error: "Estado de retiro no válido." }
    }

    if (!user.id) {
      return { success: false, error: "No pudimos validar la sesión actual." }
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc("admin_update_payout_status", {
      p_payout_id: payoutId,
      p_status: status,
      p_review_notes: reviewNotes || null,
      p_paid_reference: paidReference || null,
      p_admin_id: user.id,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      return {
        success: false,
        error:
          typeof data.error === "string"
            ? data.error
            : "No pudimos actualizar el retiro.",
      }
    }

    revalidatePath("/app/wallet")
    revalidatePath("/app/wallet/history")
    revalidatePath("/app/wallet/payout")
    revalidatePath("/app/admin/payouts")

    return {
      success: true,
      message:
        status === "approved"
          ? "Retiro aprobado."
          : status === "rejected"
            ? "Retiro rechazado."
            : "Retiro marcado como pagado.",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos actualizar el retiro.",
    }
  }
}
