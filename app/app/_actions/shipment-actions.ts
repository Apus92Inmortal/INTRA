"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CancelShipmentResult = {
  success: boolean;
  error?: string;
};

type ShipmentRow = {
  id: string;
  owner_id: string;
  status: string | null;
};

type PaymentRow = {
  id: string;
  amount: number | null;
  gross_amount?: number | null;
  traveler_amount?: number | null;
  gateway_fee_actual?: number | null;
  gateway_fee_estimated?: number | null;
  status: string | null;
  gateway_status: string | null;
  refund_status: string | null;
  dispute_status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type MatchRow = {
  id: string;
  status: string | null;
  trip?: { traveler_id: string | null } | { traveler_id: string | null }[] | null;
};

type ReportEventRow = {
  id: string;
  status: string | null;
};

type WalletLedgerRow = {
  entry_type: string | null;
};

const CANCELLABLE_SHIPMENT_STATUSES = new Set(["open", "matched"]);
const ACTIVE_WAITING_TRAVELER_SHIPMENT_STATUSES = new Set(["open"]);
const PROTECTED_PAYMENT_STATUSES = new Set([
  "approved",
  "held",
  "paid",
  "processing",
  "protected",
  "released",
  "succeeded",
  "success",
]);
const READY_REFUNDABLE_PAYMENT_STATUSES = new Set(["held"]);
const PROTECTED_GATEWAY_STATUSES = new Set([
  "approved",
  "paid",
  "protected",
  "succeeded",
  "success",
]);
const ACTIVE_MATCH_STATUSES = new Set(["pending", "accepted", "completed"]);
const ACTIVE_REPORT_STATUSES = new Set(["open", "reviewing"]);
const GENERIC_CANCEL_ERROR = "No pudimos cancelar este envío. Intenta nuevamente.";
const NOT_CANCELLABLE_FROM_DASHBOARD_ERROR = "Este envío ya no se puede cancelar desde aquí.";

function normalizeStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() ?? "";
}

function normalizeMetadata(metadata: Record<string, unknown> | null | undefined) {
  return metadata && typeof metadata === "object" ? metadata : {};
}

function mergeMetadata(
  metadata: Record<string, unknown> | null | undefined,
  extra: Record<string, unknown>
) {
  return {
    ...normalizeMetadata(metadata),
    ...extra,
  };
}

function getTripRelation(match: MatchRow) {
  if (!match.trip) {
    return null;
  }

  return Array.isArray(match.trip) ? match.trip[0] ?? null : match.trip;
}

function hasProtectedPayment(payment: PaymentRow | null) {
  if (!payment) {
    return false;
  }

  return (
    PROTECTED_PAYMENT_STATUSES.has(normalizeStatus(payment.status)) ||
    PROTECTED_GATEWAY_STATUSES.has(normalizeStatus(payment.gateway_status)) ||
    normalizeStatus(payment.refund_status || "none") !== "none"
  );
}

function hasManualRefundFlag(metadata: Record<string, unknown> | null | undefined) {
  return String(metadata?.manual_refund_required ?? "false").toLowerCase() === "true";
}

async function ensureWalletForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ success: true; walletId: string } | { success: false; error: string }> {
  const { data: wallet, error } = await admin
    .from("wallets")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (error || !wallet?.id) {
    return { success: false, error: error?.message ?? GENERIC_CANCEL_ERROR };
  }

  return { success: true, walletId: wallet.id };
}

async function syncWalletSummary(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await admin.rpc("sync_wallet_balance", {
    p_user_id: userId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cancelPendingPaymentShipmentAction(
  shipmentId: string
): Promise<CancelShipmentResult> {
  try {
    const normalizedShipmentId = shipmentId.trim();

    if (!normalizedShipmentId) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    const admin = createAdminClient();

    const { data: shipmentData, error: shipmentError } = await admin
      .from("shipments")
      .select("id, owner_id, status")
      .eq("id", normalizedShipmentId)
      .maybeSingle();

    const shipment = (shipmentData ?? null) as ShipmentRow | null;

    if (shipmentError || !shipment || shipment.owner_id !== user.id) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    if (!CANCELLABLE_SHIPMENT_STATUSES.has(normalizeStatus(shipment.status))) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    const { data: paymentData, error: paymentError } = await admin
      .from("payments")
      .select("id, status, gateway_status, refund_status")
      .eq("shipment_id", normalizedShipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestPayment = (paymentData ?? null) as PaymentRow | null;

    if (paymentError || hasProtectedPayment(latestPayment)) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    const { data: matchesData, error: matchesError } = await admin
      .from("matches")
      .select("id, status")
      .eq("shipment_id", normalizedShipmentId);

    if (matchesError) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    const matches = ((matchesData ?? []) as MatchRow[]).filter(Boolean);
    const hasNonPendingActiveMatch = matches.some((match) =>
      ["accepted", "completed"].includes(normalizeStatus(match.status))
    );

    if (hasNonPendingActiveMatch) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    const { error: cancelPendingMatchesError } = await admin
      .from("matches")
      .update({ status: "cancelled" })
      .eq("shipment_id", normalizedShipmentId)
      .eq("status", "pending");

    if (cancelPendingMatchesError) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    const { data: cancelledShipment, error: cancelShipmentError } = await admin
      .from("shipments")
      .update({ status: "cancelled" })
      .eq("id", normalizedShipmentId)
      .in("status", Array.from(CANCELLABLE_SHIPMENT_STATUSES))
      .select("id")
      .maybeSingle();

    if (cancelShipmentError) {
      return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
    }

    if (!cancelledShipment) {
      return { success: false, error: "Este envío ya no se puede cancelar desde aquí." };
    }

    revalidatePath("/app");
    revalidatePath("/app/matches");

    return { success: true };
  } catch {
    return { success: false, error: "No pudimos cancelar este envío. Intenta nuevamente." };
  }
}

export async function cancelActiveWaitingTravelerShipmentAction(
  shipmentId: string
): Promise<CancelShipmentResult> {
  try {
    const normalizedShipmentId = shipmentId.trim();

    if (!normalizedShipmentId) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    const admin = createAdminClient();
    const { data: shipmentData, error: shipmentError } = await admin
      .from("shipments")
      .select("id, owner_id, status")
      .eq("id", normalizedShipmentId)
      .maybeSingle();

    const shipment = (shipmentData ?? null) as ShipmentRow | null;

    if (shipmentError || !shipment || shipment.owner_id !== user.id) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    if (!ACTIVE_WAITING_TRAVELER_SHIPMENT_STATUSES.has(normalizeStatus(shipment.status))) {
      return { success: false, error: NOT_CANCELLABLE_FROM_DASHBOARD_ERROR };
    }

    const { data: paymentData, error: paymentError } = await admin
      .from("payments")
      .select("id, amount, gross_amount, traveler_amount, gateway_fee_actual, gateway_fee_estimated, status, gateway_status, refund_status, dispute_status, metadata")
      .eq("shipment_id", normalizedShipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestPayment = (paymentData ?? null) as PaymentRow | null;

    if (paymentError || !latestPayment) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    if (
      !READY_REFUNDABLE_PAYMENT_STATUSES.has(normalizeStatus(latestPayment.status)) ||
      normalizeStatus(latestPayment.gateway_status) !== "approved" ||
      normalizeStatus(latestPayment.refund_status || "none") !== "none" ||
      normalizeStatus(latestPayment.dispute_status || "none") !== "none" ||
      hasManualRefundFlag(latestPayment.metadata)
    ) {
      return { success: false, error: NOT_CANCELLABLE_FROM_DASHBOARD_ERROR };
    }

    const { data: matchesData, error: matchesError } = await admin
      .from("matches")
      .select("id, status, trip:trips!matches_trip_id_fkey(traveler_id)")
      .eq("shipment_id", normalizedShipmentId);

    if (matchesError) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    const matches = ((matchesData ?? []) as MatchRow[]).filter(Boolean);
    const hasActiveMatch = matches.some((match) => ACTIVE_MATCH_STATUSES.has(normalizeStatus(match.status)));

    if (hasActiveMatch) {
      return { success: false, error: NOT_CANCELLABLE_FROM_DASHBOARD_ERROR };
    }

    const { data: reportEventsData, error: reportEventsError } = await admin
      .from("shipment_report_events")
      .select("id, status")
      .eq("shipment_id", normalizedShipmentId)
      .in("status", Array.from(ACTIVE_REPORT_STATUSES));

    if (reportEventsError) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    const hasActiveReport = ((reportEventsData ?? []) as ReportEventRow[]).some((report) =>
      ACTIVE_REPORT_STATUSES.has(normalizeStatus(report.status))
    );

    if (hasActiveReport) {
      return { success: false, error: NOT_CANCELLABLE_FROM_DASHBOARD_ERROR };
    }

    const { data: existingLedgerData, error: existingLedgerError } = await admin
      .from("wallet_ledger")
      .select("entry_type")
      .eq("payment_id", latestPayment.id);

    if (existingLedgerError) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    const existingEntryTypes = new Set(
      ((existingLedgerData ?? []) as WalletLedgerRow[]).map((entry) => entry.entry_type).filter(Boolean)
    );

    if (existingEntryTypes.has("release_available_credit")) {
      return { success: false, error: NOT_CANCELLABLE_FROM_DASHBOARD_ERROR };
    }

    const now = new Date().toISOString();
    const grossPaymentAmount = Number(latestPayment.amount ?? latestPayment.gross_amount ?? 0);
    const gatewayFeeAmount = Math.max(
      0,
      Number(latestPayment.gateway_fee_actual ?? latestPayment.gateway_fee_estimated ?? 0)
    );
    const customerRefundAmount = Math.max(grossPaymentAmount - gatewayFeeAmount, 0);

    if (
      !Number.isFinite(grossPaymentAmount) ||
      grossPaymentAmount <= 0 ||
      !Number.isFinite(gatewayFeeAmount) ||
      !Number.isFinite(customerRefundAmount) ||
      customerRefundAmount <= 0
    ) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    const customerWalletResult = await ensureWalletForUser(admin, shipment.owner_id);

    if (!customerWalletResult.success) {
      return customerWalletResult;
    }

    const historicalTravelerMatch = matches.find((match) => getTripRelation(match)?.traveler_id);
    const historicalTravelerId = historicalTravelerMatch
      ? getTripRelation(historicalTravelerMatch)?.traveler_id ?? null
      : null;
    const travelerAmount = Number(latestPayment.traveler_amount ?? 0);

    if (
      historicalTravelerId &&
      travelerAmount > 0 &&
      existingEntryTypes.has("payment_hold") &&
      !existingEntryTypes.has("refund_pending_debit")
    ) {
      const travelerWalletResult = await ensureWalletForUser(admin, historicalTravelerId);

      if (!travelerWalletResult.success) {
        return travelerWalletResult;
      }

      const { error: travelerLedgerError } = await admin.from("wallet_ledger").insert({
        wallet_id: travelerWalletResult.walletId,
        user_id: historicalTravelerId,
        payment_id: latestPayment.id,
        match_id: historicalTravelerMatch?.id ?? null,
        payout_id: null,
        entry_type: "refund_pending_debit",
        balance_type: "pending",
        direction: "debit",
        amount: travelerAmount,
        description: "Reverso de retención temporal por cancelación de envío sin viajero activo",
        metadata: {
          source: "dashboard_waiting_traveler_cancel",
          shipment_id: normalizedShipmentId,
          cancelled_by: user.id,
          cancelled_at: now,
          gross_payment_amount: grossPaymentAmount,
          gateway_fee_amount: gatewayFeeAmount,
          wallet_refund_amount: customerRefundAmount,
        },
      });

      if (travelerLedgerError) {
        return { success: false, error: GENERIC_CANCEL_ERROR };
      }

      const travelerSyncResult = await syncWalletSummary(admin, historicalTravelerId);

      if (!travelerSyncResult.success) {
        return travelerSyncResult;
      }
    }

    if (!existingEntryTypes.has("refund_available_credit")) {
      const { error: customerLedgerError } = await admin.from("wallet_ledger").insert({
        wallet_id: customerWalletResult.walletId,
        user_id: shipment.owner_id,
        payment_id: latestPayment.id,
        match_id: null,
        payout_id: null,
        entry_type: "refund_available_credit",
        balance_type: "available",
        direction: "credit",
        amount: customerRefundAmount,
        description: "Devolución a Wallet por cancelación de envío sin viajero asignado",
        metadata: {
          source: "dashboard_waiting_traveler_cancel",
          shipment_id: normalizedShipmentId,
          cancelled_by: user.id,
          cancelled_at: now,
          gross_payment_amount: grossPaymentAmount,
          gateway_fee_amount: gatewayFeeAmount,
          wallet_refund_amount: customerRefundAmount,
        },
      });

      if (customerLedgerError) {
        return { success: false, error: GENERIC_CANCEL_ERROR };
      }
    }

    const customerSyncResult = await syncWalletSummary(admin, shipment.owner_id);

    if (!customerSyncResult.success) {
      return customerSyncResult;
    }

    const paymentMetadata = mergeMetadata(latestPayment.metadata, {
      refund_reason: "dashboard_waiting_traveler_cancel",
      wallet_refund_processed: true,
      wallet_refund_amount: customerRefundAmount,
      gross_payment_amount: grossPaymentAmount,
      gateway_fee_amount: gatewayFeeAmount,
      gateway_fee_excluded_from_wallet_refund: true,
      cancelled_shipment_id: normalizedShipmentId,
      cancelled_by: user.id,
      cancelled_at: now,
    });

    const { data: updatedPayment, error: paymentUpdateError } = await admin
      .from("payments")
      .update({
        status: "refunded",
        refund_status: "refunded",
        refund_reason: "dashboard_waiting_traveler_cancel",
        refund_processed_at: now,
        refunded_at: now,
        updated_at: now,
        metadata: paymentMetadata,
      })
      .eq("id", latestPayment.id)
      .eq("shipment_id", normalizedShipmentId)
      .eq("status", latestPayment.status)
      .eq("refund_status", "none")
      .select("id")
      .maybeSingle();

    if (paymentUpdateError) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    if (!updatedPayment) {
      return { success: false, error: NOT_CANCELLABLE_FROM_DASHBOARD_ERROR };
    }

    const { data: cancelledShipment, error: cancelShipmentError } = await admin
      .from("shipments")
      .update({ status: "cancelled" })
      .eq("id", normalizedShipmentId)
      .eq("owner_id", user.id)
      .eq("status", "open")
      .select("id")
      .maybeSingle();

    if (cancelShipmentError) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    if (!cancelledShipment) {
      return { success: false, error: NOT_CANCELLABLE_FROM_DASHBOARD_ERROR };
    }

    revalidatePath("/app");
    revalidatePath("/app/shipments");
    revalidatePath("/app/wallet");
    revalidatePath("/app/matches");

    return { success: true };
  } catch {
    return { success: false, error: GENERIC_CANCEL_ERROR };
  }
}
