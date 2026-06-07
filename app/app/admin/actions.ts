"use server"

import { revalidatePath } from "next/cache"
import { requireAdminUser } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"

type ActionResult = {
  success: boolean
  error?: string
  message?: string
}

type JsonObject = Record<string, unknown>

type WalletRow = {
  id: string
}

type WalletLedgerSummaryRow = {
  entry_type: string | null
  balance_type: string | null
  direction: string | null
  amount: number | null
}

type DisputePaymentRow = {
  id: string
  match_id: string | null
  shipment_id: string | null
  status: string | null
  dispute_status: string | null
  dispute_reason: string | null
  dispute_opened_at: string | null
  dispute_resolved_at: string | null
  traveler_delivered_at: string | null
  amount: number | null
  traveler_amount: number | null
  metadata: JsonObject | null
}

type MatchAdminRow = {
  id: string
  shipment_id: string | null
  trip_id: string | null
  status: string | null
  resolution_notes: string | null
  resolved_at: string | null
}

type TripAdminRow = {
  id: string
  traveler_id: string
}

const ALLOWED_VERIFICATION_STATUSES = new Set(["verified", "rejected"])
const ALLOWED_PAYOUT_ACCOUNT_STATUSES = new Set(["verified", "rejected"])
const ALLOWED_DISPUTE_ACTIONS = new Set(["reviewing", "customer_refund", "traveler_release", "rejected"])
const ALLOWED_ALERT_ACTIONS = new Set([
  "reviewing",
  "allow_shipment",
  "reject_shipment",
  "escalate_to_dispute",
  "reprogram",
  "cancel_match",
  "dismiss",
])

function toTrimmedString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function toPositiveAmount(raw: string) {
  const numeric = Number(raw.replace(/[^\d.-]/g, ""))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function asJsonObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {}
}

function mergeMetadata(base: unknown, patch: JsonObject) {
  return {
    ...asJsonObject(base),
    ...patch,
  }
}

async function ensureWalletForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ success: true; walletId: string } | { success: false; error: string }> {
  const now = new Date().toISOString()

  const { data: wallet, error: walletError } = await admin
    .from("wallets")
    .upsert(
      {
        user_id: userId,
        updated_at: now,
      },
      {
        onConflict: "user_id",
      }
    )
    .select("id")
    .single()

  if (walletError || !wallet) {
    return {
      success: false,
      error: walletError?.message ?? "No pudimos asegurar la wallet requerida.",
    }
  }

  return {
    success: true,
    walletId: (wallet as WalletRow).id,
  }
}

async function syncWalletSummary(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<ActionResult> {
  const now = new Date().toISOString()

  const { data: ledgerRows, error: ledgerRowsError } = await admin
    .from("wallet_ledger")
    .select("entry_type, balance_type, direction, amount")
    .eq("user_id", userId)

  if (ledgerRowsError) {
    return {
      success: false,
      error: ledgerRowsError.message,
    }
  }

  const summary = ((ledgerRows ?? []) as WalletLedgerSummaryRow[]).reduce(
    (acc, row) => {
      const amount = Number(row.amount ?? 0)

      if (row.balance_type === "available") {
        acc.available += row.direction === "debit" ? -amount : amount
      }

      if (row.balance_type === "pending") {
        acc.pending += row.direction === "debit" ? -amount : amount
      }

      if (row.entry_type === "release_available_credit") {
        acc.totalEarned += amount
      }

      if (row.entry_type === "payout_paid_debit") {
        acc.totalWithdrawn += amount
      }

      return acc
    },
    {
      available: 0,
      pending: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
    }
  )

  const { error: walletUpdateError } = await admin
    .from("wallets")
    .update({
      available_balance: summary.available,
      pending_balance: summary.pending,
      total_earned: summary.totalEarned,
      total_withdrawn: summary.totalWithdrawn,
      updated_at: now,
    })
    .eq("user_id", userId)

  if (walletUpdateError) {
    return {
      success: false,
      error: walletUpdateError.message,
    }
  }

  return { success: true }
}

async function insertParticipantNotifications(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    matchId: string | null
    customerUserId: string | null
    travelerUserId: string | null
    customerTitle: string
    customerMessage: string
    travelerTitle: string
    travelerMessage: string
  }
) {
  const rows = [] as Array<{
    user_id: string
    type: string
    title: string
    message: string
    related_match_id: string | null
    is_read: boolean
  }>

  if (input.customerUserId) {
    rows.push({
      user_id: input.customerUserId,
      type: "admin_case_update",
      title: input.customerTitle,
      message: input.customerMessage,
      related_match_id: input.matchId,
      is_read: false,
    })
  }

  if (input.travelerUserId && input.travelerUserId !== input.customerUserId) {
    rows.push({
      user_id: input.travelerUserId,
      type: "admin_case_update",
      title: input.travelerTitle,
      message: input.travelerMessage,
      related_match_id: input.matchId,
      is_read: false,
    })
  }

  if (rows.length > 0) {
    await admin.from("notifications").insert(rows)
  }
}

function revalidateAdminDisputePaths(matchId?: string | null) {
  revalidatePath("/app/admin")
  revalidatePath("/app/admin/disputes")
  revalidatePath("/app/wallet")
  revalidatePath("/app/wallet/history")
  revalidatePath("/app/matches")
  revalidatePath("/app")

  if (matchId) {
    revalidatePath(`/app/matches/${matchId}`)
  }
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
      .select("id, user_id")
      .eq("id", verificationId)
      .maybeSingle()

    if (verificationError || !verification) {
      return {
        success: false,
        error: verificationError?.message ?? "No encontramos la verificación solicitada.",
      }
    }

    const travelerUserId = typeof verification.user_id === "string" ? verification.user_id : null
    const { count: verifiedAccountsCount } = travelerUserId
      ? await admin
          .from("traveler_payout_accounts")
          .select("id", { count: "exact", head: true })
          .eq("traveler_user_id", travelerUserId)
          .eq("verification_status", "verified")
      : { count: 0 }

    const patch = {
      verification_status: status,
      verification_level:
        status === "verified" && (verifiedAccountsCount ?? 0) > 0
          ? "payout_verified"
          : status === "verified"
            ? "identity_verified"
            : "basic_verified",
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

    await admin.from("app_audit_logs").insert({
      actor_id: user.id,
      event_type: "user_verification_reviewed",
      entity_type: "user_verification",
      entity_id: verificationId,
      metadata: {
        status,
        verification_level: patch.verification_level,
        user_id: travelerUserId,
      },
    })

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

export async function reviewPayoutAccountAction(formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireAdminUser()
    const accountId = toTrimmedString(formData.get("accountId"))
    const status = toTrimmedString(formData.get("status"))
    const verificationNotes = toTrimmedString(formData.get("verificationNotes"))

    if (!accountId) {
      return { success: false, error: "No llego la cuenta de retiro a revisar." }
    }

    if (!ALLOWED_PAYOUT_ACCOUNT_STATUSES.has(status)) {
      return { success: false, error: "Estado de cuenta no valido." }
    }

    if (status === "rejected" && !verificationNotes) {
      return { success: false, error: "Escribe una nota para rechazar la cuenta." }
    }

    const admin = createAdminClient()
    const { data: account, error: accountError } = await admin
      .from("traveler_payout_accounts")
      .select("id, traveler_user_id")
      .eq("id", accountId)
      .maybeSingle()

    if (accountError || !account) {
      return {
        success: false,
        error: accountError?.message ?? "No encontramos la cuenta de retiro.",
      }
    }

    const now = new Date().toISOString()
    const travelerUserId = account.traveler_user_id as string

    const { error: updateError } = await admin
      .from("traveler_payout_accounts")
      .update({
        verification_status: status,
        verified_at: status === "verified" ? now : null,
        verified_by: status === "verified" ? user.id : null,
        verification_notes: verificationNotes || null,
        updated_at: now,
      })
      .eq("id", accountId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    const { data: verification } = await admin
      .from("user_verifications")
      .select("user_id, verification_status, verification_level")
      .eq("user_id", travelerUserId)
      .maybeSingle()

    const { count: verifiedAccountsCount } = await admin
      .from("traveler_payout_accounts")
      .select("id", { count: "exact", head: true })
      .eq("traveler_user_id", travelerUserId)
      .eq("verification_status", "verified")

    const hasVerifiedIdentity = verification?.verification_status === "verified"
    const nextVerificationLevel =
      hasVerifiedIdentity && (verifiedAccountsCount ?? 0) > 0
        ? "payout_verified"
        : hasVerifiedIdentity
          ? "identity_verified"
          : verification?.verification_level ?? "basic_verified"

    const { error: verificationUpdateError } = await admin.from("user_verifications").upsert(
      {
        user_id: travelerUserId,
        verification_level: nextVerificationLevel,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )

    if (verificationUpdateError) {
      return { success: false, error: verificationUpdateError.message }
    }

    await admin.from("app_audit_logs").insert({
      actor_id: user.id,
      event_type: "payout_account_reviewed",
      entity_type: "traveler_payout_account",
      entity_id: accountId,
      metadata: {
        traveler_user_id: travelerUserId,
        status,
        verification_level: nextVerificationLevel,
      },
    })

    revalidatePath("/app/admin")
    revalidatePath("/app/admin/payouts")
    revalidatePath("/app/wallet")
    revalidatePath("/app/wallet/payout")
    revalidatePath("/app/wallet/payout/accounts")
    revalidatePath("/app/profile")

    if (status === "verified" && !hasVerifiedIdentity) {
      return {
        success: true,
        message: "Cuenta verificada. Falta aprobar identidad para habilitar retiros.",
      }
    }

    return {
      success: true,
      message: status === "verified" ? "Cuenta de retiro verificada." : "Cuenta de retiro rechazada.",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos revisar la cuenta de retiro.",
    }
  }
}

export async function reviewDisputeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireAdminUser()
    const paymentId = toTrimmedString(formData.get("paymentId"))
    const matchIdInput = toTrimmedString(formData.get("matchId"))
    const action = toTrimmedString(formData.get("action"))
    const resolutionNotes = toTrimmedString(formData.get("resolutionNotes"))
    const refundAmount = toPositiveAmount(toTrimmedString(formData.get("refundAmount")))

    if (!paymentId) {
      return { success: false, error: "No llegó la disputa a revisar." }
    }

    if (!ALLOWED_DISPUTE_ACTIONS.has(action)) {
      return { success: false, error: "Acción de disputa no válida." }
    }

    if (action === "customer_refund" && !refundAmount) {
      return { success: false, error: "Escribe un monto válido para la devolución manual." }
    }

    if (action !== "reviewing" && !resolutionNotes) {
      return { success: false, error: "Escribe una nota operativa antes de cerrar la disputa." }
    }

    const admin = createAdminClient()
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select(
        "id, match_id, shipment_id, status, dispute_status, dispute_reason, dispute_opened_at, dispute_resolved_at, traveler_delivered_at, amount, traveler_amount, metadata"
      )
      .eq("id", paymentId)
      .maybeSingle()

    if (paymentError || !payment) {
      return {
        success: false,
        error: paymentError?.message ?? "No encontramos el pago asociado a esta disputa.",
      }
    }

    const resolvedMatchId = matchIdInput || payment.match_id || ""

    if (!resolvedMatchId) {
      return { success: false, error: "No pudimos ubicar el match de esta disputa." }
    }

    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("id, shipment_id, trip_id, status, resolution_notes, resolved_at")
      .eq("id", resolvedMatchId)
      .maybeSingle()

    if (matchError || !match) {
      return {
        success: false,
        error: matchError?.message ?? "No encontramos el match asociado a esta disputa.",
      }
    }

    const [{ data: shipment, error: shipmentError }, { data: trip, error: tripError }] = await Promise.all([
      admin
        .from("shipments")
        .select("id, owner_id, status, tracking_code")
        .eq("id", match.shipment_id)
        .maybeSingle(),
      admin
        .from("trips")
        .select("id, traveler_id")
        .eq("id", match.trip_id)
        .maybeSingle(),
    ])

    if (shipmentError || !shipment || tripError || !trip) {
      return {
        success: false,
        error:
          shipmentError?.message ?? tripError?.message ?? "No pudimos cargar las partes asociadas a la disputa.",
      }
    }

    const now = new Date().toISOString()
    const paymentMeta = asJsonObject(payment.metadata)

    if (action === "reviewing") {
      const { error: updateError } = await admin
        .from("payments")
        .update({
          metadata: mergeMetadata(paymentMeta, {
            admin_dispute_status: "reviewing",
            admin_dispute_reviewed_by: user.id,
            admin_dispute_reviewed_at: now,
            admin_dispute_notes: resolutionNotes || null,
          }),
          updated_at: now,
        })
        .eq("id", payment.id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      revalidateAdminDisputePaths(resolvedMatchId)
      return { success: true, message: "Disputa marcada en revisión." }
    }

    if (payment.dispute_status !== "open") {
      return { success: false, error: "Esta disputa ya no está abierta para resolución." }
    }

    const resolutionMeta = mergeMetadata(paymentMeta, {
      admin_dispute_status: "resolved",
      admin_dispute_resolution: action,
      admin_dispute_resolved_by: user.id,
      admin_dispute_resolved_at: now,
      admin_dispute_notes: resolutionNotes || null,
      admin_dispute_refund_amount: action === "customer_refund" ? refundAmount : null,
    })

    if (action === "customer_refund") {
      const resolvedRefundAmount = refundAmount ?? 0
      const travelerAmount = Number(payment.traveler_amount ?? payment.amount ?? 0)
      const ledgerReason = resolutionNotes || `Devolución manual por disputa · ${shipment.tracking_code ?? resolvedMatchId}`

      const [customerWalletResult, travelerWalletResult, existingEntriesResult] = await Promise.all([
        ensureWalletForUser(admin, shipment.owner_id),
        ensureWalletForUser(admin, trip.traveler_id),
        admin
          .from("wallet_ledger")
          .select("entry_type")
          .eq("payment_id", payment.id),
      ])

      if (!customerWalletResult.success) {
        return customerWalletResult
      }

      if (!travelerWalletResult.success) {
        return travelerWalletResult
      }

      const customerWalletId = customerWalletResult.walletId
      const travelerWalletId = travelerWalletResult.walletId

      if (existingEntriesResult.error) {
        return {
          success: false,
          error: existingEntriesResult.error.message,
        }
      }

      const existingEntryTypes = new Set((existingEntriesResult.data ?? []).map((row) => row.entry_type).filter(Boolean))
      const ledgerRowsToInsert: Array<{
        wallet_id: string
        user_id: string
        payment_id: string
        match_id: string
        payout_id: null
        entry_type: string
        balance_type: "available" | "pending"
        direction: "credit" | "debit"
        amount: number
        description: string
        metadata: Record<string, unknown>
      }> = []

      if (travelerAmount > 0 && existingEntryTypes.has("payment_hold") && !existingEntryTypes.has("refund_pending_debit")) {
        ledgerRowsToInsert.push({
          wallet_id: travelerWalletId,
          user_id: trip.traveler_id,
          payment_id: payment.id,
          match_id: resolvedMatchId,
          payout_id: null,
          entry_type: "refund_pending_debit",
          balance_type: "pending",
          direction: "debit",
          amount: travelerAmount,
          description: "Reverso de retención temporal por disputa resuelta a favor del cliente",
          metadata: {
            source: "admin_dispute_customer_refund",
            reason: ledgerReason,
          },
        })
      }

      if (travelerAmount > 0 && existingEntryTypes.has("release_available_credit") && !existingEntryTypes.has("refund_available_debit")) {
        ledgerRowsToInsert.push({
          wallet_id: travelerWalletId,
          user_id: trip.traveler_id,
          payment_id: payment.id,
          match_id: resolvedMatchId,
          payout_id: null,
          entry_type: "refund_available_debit",
          balance_type: "available",
          direction: "debit",
          amount: travelerAmount,
          description: "Ajuste de saldo por disputa resuelta a favor del cliente",
          metadata: {
            source: "admin_dispute_customer_refund",
            reason: ledgerReason,
          },
        })
      }

      if (!existingEntryTypes.has("refund_available_credit")) {
        ledgerRowsToInsert.push({
          wallet_id: customerWalletId,
          user_id: shipment.owner_id,
          payment_id: payment.id,
          match_id: resolvedMatchId,
          payout_id: null,
          entry_type: "refund_available_credit",
          balance_type: "available",
          direction: "credit",
          amount: resolvedRefundAmount,
          description: ledgerReason,
          metadata: {
            source: "admin_dispute_customer_refund",
            reason: ledgerReason,
          },
        })
      }

      if (ledgerRowsToInsert.length > 0) {
        const { error: ledgerInsertError } = await admin.from("wallet_ledger").insert(ledgerRowsToInsert)

        if (ledgerInsertError) {
          return {
            success: false,
            error: ledgerInsertError.message,
          }
        }
      }

      const [customerSyncResult, travelerSyncResult] = await Promise.all([
        syncWalletSummary(admin, shipment.owner_id),
        syncWalletSummary(admin, trip.traveler_id),
      ])

      if (!customerSyncResult.success) {
        return customerSyncResult
      }

      if (!travelerSyncResult.success) {
        return travelerSyncResult
      }

      const [{ error: paymentUpdateError }, { error: matchUpdateError }] = await Promise.all([
        admin
          .from("payments")
          .update({
            status: "refunded",
            refund_status: "refunded",
            refund_reason: resolutionNotes || "dispute_customer_refund",
            refund_processed_at: now,
            refund_admin_id: user.id,
            refunded_at: now,
            dispute_status: "resolved",
            dispute_resolved_at: now,
            updated_at: now,
            metadata: resolutionMeta,
          })
          .eq("id", payment.id),
        admin
          .from("matches")
          .update({
            status: "resolved",
            resolved_at: now,
            resolution_notes: resolutionNotes || "Disputa resuelta a favor del cliente con devolución manual.",
          })
          .eq("id", resolvedMatchId),
      ])

      if (paymentUpdateError || matchUpdateError) {
        return {
          success: false,
          error: paymentUpdateError?.message ?? matchUpdateError?.message ?? "No pudimos cerrar la disputa.",
        }
      }

      await insertParticipantNotifications(admin, {
        matchId: resolvedMatchId,
        customerUserId: shipment.owner_id,
        travelerUserId: trip.traveler_id,
        customerTitle: "Tu disputa fue resuelta",
        customerMessage: `Acreditamos ${resolvedRefundAmount.toLocaleString("es-CO")} COP a tu wallet como devolución.`,
        travelerTitle: "Disputa resuelta a favor del cliente",
        travelerMessage: "La administración resolvió la disputa a favor del cliente, devolvió el saldo al cliente y retiró la retención del pago en tu wallet.",
      })

      revalidateAdminDisputePaths(resolvedMatchId)
      return { success: true, message: "Disputa resuelta a favor del cliente." }
    }

    if (action === "traveler_release") {
      if (shipment.status === "in_transit" && payment.traveler_delivered_at) {
        await admin.from("shipments").update({ status: "delivered" }).eq("id", shipment.id)
      }

      const { data: releaseResult, error: releaseError } = await admin.rpc("release_payment", {
        p_payment_id: payment.id,
        p_reason: "admin_dispute_resolution",
      })

      if (releaseError) {
        return { success: false, error: releaseError.message }
      }

      if (releaseResult && typeof releaseResult === "object" && "success" in releaseResult && releaseResult.success === false) {
        return {
          success: false,
          error: typeof releaseResult.error === "string" ? releaseResult.error : "No se pudo liberar el pago.",
        }
      }

      const [{ error: paymentUpdateError }, { error: matchUpdateError }] = await Promise.all([
        admin
          .from("payments")
          .update({
            dispute_status: "resolved",
            dispute_resolved_at: now,
            updated_at: now,
            metadata: resolutionMeta,
          })
          .eq("id", payment.id),
        admin
          .from("matches")
          .update({
            status: "resolved",
            resolved_at: now,
            resolution_notes: resolutionNotes || "Disputa resuelta a favor del viajero y pago liberado.",
          })
          .eq("id", resolvedMatchId),
      ])

      if (paymentUpdateError || matchUpdateError) {
        return {
          success: false,
          error: paymentUpdateError?.message ?? matchUpdateError?.message ?? "No pudimos cerrar la disputa.",
        }
      }

      await insertParticipantNotifications(admin, {
        matchId: resolvedMatchId,
        customerUserId: shipment.owner_id,
        travelerUserId: trip.traveler_id,
        customerTitle: "Tu disputa fue resuelta",
        customerMessage: "La administración resolvió la disputa a favor del viajero y liberó el pago correspondiente.",
        travelerTitle: "Disputa resuelta a tu favor",
        travelerMessage: "La administración resolvió la disputa a tu favor y liberó el pago a tu wallet.",
      })

      revalidateAdminDisputePaths(resolvedMatchId)
      return { success: true, message: "Disputa resuelta a favor del viajero." }
    }

    const [{ error: paymentUpdateError }, { error: matchUpdateError }] = await Promise.all([
      admin
        .from("payments")
        .update({
          dispute_status: "resolved",
          dispute_resolved_at: now,
          updated_at: now,
          metadata: resolutionMeta,
        })
        .eq("id", payment.id),
      admin
        .from("matches")
        .update({
          status: "resolved",
          resolved_at: now,
          resolution_notes: resolutionNotes || "Disputa cerrada sin movimiento de dinero.",
        })
        .eq("id", resolvedMatchId),
    ])

    if (paymentUpdateError || matchUpdateError) {
      return {
        success: false,
        error: paymentUpdateError?.message ?? matchUpdateError?.message ?? "No pudimos cerrar la disputa.",
      }
    }

    await insertParticipantNotifications(admin, {
      matchId: resolvedMatchId,
      customerUserId: shipment.owner_id,
      travelerUserId: trip.traveler_id,
      customerTitle: "Tu disputa fue cerrada",
      customerMessage: "La administración cerró la disputa sin movimiento de dinero adicional.",
      travelerTitle: "La disputa fue cerrada",
      travelerMessage: "La administración cerró la disputa sin movimiento de dinero adicional.",
    })

    revalidateAdminDisputePaths(resolvedMatchId)
    return { success: true, message: "Disputa cerrada sin movimiento de dinero." }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos revisar la disputa.",
    }
  }
}

export async function reviewShipmentAlertAction(formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireAdminUser()
    const reportId = toTrimmedString(formData.get("reportId"))
    const action = toTrimmedString(formData.get("action"))
    const resolutionNotes = toTrimmedString(formData.get("resolutionNotes"))

    if (!reportId) {
      return { success: false, error: "No llegó la alerta a revisar." }
    }

    if (!ALLOWED_ALERT_ACTIONS.has(action)) {
      return { success: false, error: "Acción de alerta no válida." }
    }

    const admin = createAdminClient()
    const { data: report, error: reportError } = await admin
      .from("shipment_report_events")
      .select("id, shipment_id, match_id, reported_by, report_type, reason, status, created_at, resolved_at, metadata")
      .eq("id", reportId)
      .maybeSingle()

    if (reportError || !report) {
      return {
        success: false,
        error: reportError?.message ?? "No encontramos la alerta solicitada.",
      }
    }

    const [{ data: shipment, error: shipmentError }, matchResult] = await Promise.all([
      admin
        .from("shipments")
        .select("id, owner_id, status, tracking_code")
        .eq("id", report.shipment_id)
        .maybeSingle(),
      report.match_id
        ? admin
            .from("matches")
            .select("id, shipment_id, trip_id, status, resolution_notes, resolved_at")
            .eq("id", report.match_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (shipmentError || !shipment) {
      return {
        success: false,
        error: shipmentError?.message ?? "No pudimos cargar el envío asociado a la alerta.",
      }
    }

    const match = (matchResult.data ?? null) as MatchAdminRow | null
    const matchError = matchResult.error

    if (report.match_id && (matchError || !match)) {
      return {
        success: false,
        error: matchError?.message ?? "No pudimos cargar el match asociado a la alerta.",
      }
    }

    const tripResult = match?.trip_id
      ? await admin.from("trips").select("id, traveler_id").eq("id", match.trip_id).maybeSingle()
      : { data: null, error: null }

    if (match?.trip_id && (tripResult.error || !tripResult.data)) {
      return {
        success: false,
        error: tripResult.error?.message ?? "No pudimos cargar el viaje asociado a la alerta.",
      }
    }

    const trip = (tripResult.data ?? null) as TripAdminRow | null
    const paymentResult = match?.id
      ? await admin
          .from("payments")
          .select(
            "id, match_id, shipment_id, status, dispute_status, dispute_reason, dispute_opened_at, dispute_resolved_at, traveler_delivered_at, amount, traveler_amount, metadata"
          )
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null }

    if (match?.id && paymentResult.error) {
      return {
        success: false,
        error: paymentResult.error.message,
      }
    }

    const payment = (paymentResult.data ?? null) as DisputePaymentRow | null
    const now = new Date().toISOString()
    const reportMeta = asJsonObject(report.metadata)
    const travelerId = trip?.traveler_id ?? null
    const customerId = shipment.owner_id

    if (action === "reviewing") {
      const { error: updateError } = await admin
        .from("shipment_report_events")
        .update({
          status: "reviewing",
          metadata: mergeMetadata(reportMeta, {
            admin_alert_status: "reviewing",
            admin_reviewed_by: user.id,
            admin_reviewed_at: now,
            admin_review_notes: resolutionNotes || null,
          }),
        })
        .eq("id", report.id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      revalidateAdminDisputePaths(report.match_id)
      return { success: true, message: "Alerta marcada en revisión." }
    }

    if (report.status === "resolved") {
      return { success: false, error: "Esta alerta ya fue resuelta." }
    }

    const resolvedReportMeta = mergeMetadata(reportMeta, {
      admin_alert_status: "resolved",
      admin_resolution_action: action,
      admin_resolved_by: user.id,
      admin_resolved_at: now,
      admin_resolution_notes: resolutionNotes || null,
    })

    if (action === "escalate_to_dispute") {
      if (!match?.id || !payment?.id) {
        return { success: false, error: "La alerta no tiene un pago asociado para escalar a disputa." }
      }

      if (payment.status !== "held") {
        return { success: false, error: "Solo se pueden escalar pagos retenidos a disputa." }
      }

      if (payment.dispute_status === "open") {
        return { success: false, error: "Este caso ya tiene una disputa abierta." }
      }

      const [{ error: matchUpdateError }, { error: paymentUpdateError }, { error: reportUpdateError }] = await Promise.all([
        admin
          .from("matches")
          .update({
            status: "disputed",
            disputed_at: now,
            resolved_at: null,
            resolution_notes: null,
          })
          .eq("id", match.id),
        admin
          .from("payments")
          .update({
            dispute_status: "open",
            dispute_reason: resolutionNotes || `Escalada desde alerta: ${report.reason}`,
            dispute_opened_at: now,
            updated_at: now,
            metadata: mergeMetadata(payment.metadata, {
              admin_dispute_status: "open",
              escalated_from_report_id: report.id,
            }),
          })
          .eq("id", payment.id),
        admin
          .from("shipment_report_events")
          .update({
            status: "resolved",
            resolved_at: now,
            metadata: mergeMetadata(resolvedReportMeta, {
              escalated_to_dispute: true,
            }),
          })
          .eq("id", report.id),
      ])

      if (matchUpdateError || paymentUpdateError || reportUpdateError) {
        return {
          success: false,
          error:
            matchUpdateError?.message ??
            paymentUpdateError?.message ??
            reportUpdateError?.message ??
            "No pudimos escalar la alerta a disputa.",
        }
      }

      await insertParticipantNotifications(admin, {
        matchId: match.id,
        customerUserId: customerId,
        travelerUserId: travelerId,
        customerTitle: "Se abrió una disputa",
        customerMessage: "La administración escaló la alerta a disputa para revisar el caso con mayor detalle.",
        travelerTitle: "Tu alerta fue escalada a disputa",
        travelerMessage: "La administración escaló la alerta a disputa para revisar el caso con mayor detalle.",
      })

      revalidateAdminDisputePaths(match.id)
      return { success: true, message: "Alerta escalada a disputa." }
    }

    if (action === "reject_shipment" || action === "cancel_match") {
      const updates = [
        admin
          .from("shipment_report_events")
          .update({
            status: "resolved",
            resolved_at: now,
            metadata: resolvedReportMeta,
          })
          .eq("id", report.id),
      ]

      if (match?.id) {
        updates.push(
          admin
            .from("matches")
            .update({
              status: "cancelled",
              resolved_at: now,
              resolution_notes:
                resolutionNotes ||
                (action === "reject_shipment"
                  ? "El envío fue rechazado por revisión administrativa."
                  : "El match fue cancelado por revisión administrativa."),
            })
            .eq("id", match.id)
        )
      }

      if (shipment.status !== "delivered") {
        updates.push(admin.from("shipments").update({ status: "cancelled" }).eq("id", shipment.id))
      }

      if (payment?.id && payment.status === "held") {
        if (travelerId) {
          const travelerWalletResult = await ensureWalletForUser(admin, travelerId)

          if (!travelerWalletResult.success) {
            return travelerWalletResult
          }

          const { data: existingEntries, error: existingEntriesError } = await admin
            .from("wallet_ledger")
            .select("entry_type")
            .eq("payment_id", payment.id)

          if (existingEntriesError) {
            return { success: false, error: existingEntriesError.message }
          }

          const existingEntryTypes = new Set((existingEntries ?? []).map((row) => row.entry_type).filter(Boolean))
          const travelerAmount = Number(payment.traveler_amount ?? payment.amount ?? 0)

          if (
            travelerAmount > 0 &&
            existingEntryTypes.has("payment_hold") &&
            !existingEntryTypes.has("refund_pending_debit")
          ) {
            const { error: ledgerInsertError } = await admin.from("wallet_ledger").insert({
              wallet_id: travelerWalletResult.walletId,
              user_id: travelerId,
              payment_id: payment.id,
              match_id: match?.id ?? null,
              payout_id: null,
              entry_type: "refund_pending_debit",
              balance_type: "pending",
              direction: "debit",
              amount: travelerAmount,
              description: "Reverso de retención temporal por revisión administrativa",
              metadata: {
                source: "admin_alert_resolution",
                reason: action === "reject_shipment" ? "shipment_rejected_by_admin" : "match_cancelled_by_admin",
                report_id: report.id,
              },
            })

            if (ledgerInsertError) {
              return { success: false, error: ledgerInsertError.message }
            }

            const syncResult = await syncWalletSummary(admin, travelerId)

            if (!syncResult.success) {
              return syncResult
            }
          }
        }

        updates.push(
          admin
            .from("payments")
            .update({
              refund_status: "manual_required",
              refund_reason: action === "reject_shipment" ? "shipment_rejected_by_admin" : "match_cancelled_by_admin",
              refund_requested_at: now,
              updated_at: now,
              metadata: mergeMetadata(payment.metadata, {
                manual_refund_required: true,
                manual_refund_reason: action === "reject_shipment" ? "shipment_rejected_by_admin" : "match_cancelled_by_admin",
                flagged_from_report_id: report.id,
                flagged_at: now,
              }),
            })
            .eq("id", payment.id)
        )
      }

      await Promise.all(updates)

      await insertParticipantNotifications(admin, {
        matchId: match?.id ?? report.match_id,
        customerUserId: customerId,
        travelerUserId: travelerId,
        customerTitle: "Caso administrativo resuelto",
        customerMessage:
          action === "reject_shipment"
            ? "La administración rechazó el envío y dejó el caso resuelto para revisión manual."
            : "La administración canceló el match y dejó el caso resuelto para revisión manual.",
        travelerTitle: "Caso administrativo resuelto",
        travelerMessage:
          action === "reject_shipment"
            ? "La administración rechazó el envío y cerró la alerta."
            : "La administración canceló el match y cerró la alerta.",
      })

      revalidateAdminDisputePaths(report.match_id)
      return {
        success: true,
        message: action === "reject_shipment" ? "Envío rechazado y alerta resuelta." : "Match cancelado y alerta resuelta.",
      }
    }

    const { error: reportUpdateError } = await admin
      .from("shipment_report_events")
      .update({
        status: "resolved",
        resolved_at: now,
        metadata: resolvedReportMeta,
      })
      .eq("id", report.id)

    if (reportUpdateError) {
      return { success: false, error: reportUpdateError.message }
    }

    const alertMessageByAction: Record<string, { customer: string; traveler: string; message: string }> = {
      allow_shipment: {
        customer: "La alerta fue revisada y el envío puede continuar normalmente.",
        traveler: "La alerta fue revisada y puedes continuar con el envío.",
        message: "Alerta resuelta: envío autorizado.",
      },
      reprogram: {
        customer: "La administración registró una reprogramación para continuar con este caso.",
        traveler: "La administración registró una reprogramación para continuar con este caso.",
        message: "Alerta resuelta con reprogramación.",
      },
      dismiss: {
        customer: "La administración cerró la alerta sin acciones adicionales.",
        traveler: "La administración cerró la alerta sin acciones adicionales.",
        message: "Alerta cerrada sin acciones adicionales.",
      },
    }

    const alertCopy = alertMessageByAction[action]

    if (alertCopy) {
      await insertParticipantNotifications(admin, {
        matchId: match?.id ?? report.match_id,
        customerUserId: customerId,
        travelerUserId: travelerId,
        customerTitle: "Actualización de alerta",
        customerMessage: alertCopy.customer,
        travelerTitle: "Actualización de alerta",
        travelerMessage: alertCopy.traveler,
      })
    }

    revalidateAdminDisputePaths(report.match_id)
    return { success: true, message: alertCopy?.message ?? "Alerta actualizada." }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No pudimos revisar la alerta.",
    }
  }
}
