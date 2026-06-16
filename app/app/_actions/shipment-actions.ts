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
  status: string | null;
  gateway_status: string | null;
  refund_status: string | null;
};

type MatchRow = {
  id: string;
  status: string | null;
};

const CANCELLABLE_SHIPMENT_STATUSES = new Set(["open", "matched"]);
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
const PROTECTED_GATEWAY_STATUSES = new Set([
  "approved",
  "paid",
  "protected",
  "succeeded",
  "success",
]);

function normalizeStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() ?? "";
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
