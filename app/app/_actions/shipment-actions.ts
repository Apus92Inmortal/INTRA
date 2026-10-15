"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CancelShipmentResult = { success: boolean; error?: string };
const GENERIC_CANCEL_ERROR = "No pudimos cancelar este envío. Intenta nuevamente.";
const NOT_CANCELLABLE_FROM_DASHBOARD_ERROR = "Este envío ya no se puede cancelar desde aquí.";

export async function cancelPendingPaymentShipmentAction(shipmentId: string): Promise<CancelShipmentResult> {
  try {
    const normalizedShipmentId = shipmentId.trim();
    if (!normalizedShipmentId) return { success: false, error: GENERIC_CANCEL_ERROR };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: GENERIC_CANCEL_ERROR };
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("cancel_pending_payment_shipment", {
      p_shipment_id: normalizedShipmentId, p_actor_id: user.id,
    });
    if (error || !data || typeof data !== "object" || data.success !== true) {
      return { success: false, error: !error && data?.error === "shipment_not_cancellable"
        ? NOT_CANCELLABLE_FROM_DASHBOARD_ERROR : GENERIC_CANCEL_ERROR };
    }
    revalidatePath("/app");
    revalidatePath("/app/shipments");
    revalidatePath("/app/matches");
    return { success: true };
  } catch {
    return { success: false, error: GENERIC_CANCEL_ERROR };
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: GENERIC_CANCEL_ERROR };
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("cancel_waiting_traveler_shipment", {
      p_shipment_id: normalizedShipmentId,
      p_actor_id: user.id,
    });
    if (error || !data || typeof data !== "object" || data.success !== true) {
      return {
        success: false,
        error: !error && data?.error === "shipment_not_cancellable"
          ? NOT_CANCELLABLE_FROM_DASHBOARD_ERROR
          : GENERIC_CANCEL_ERROR,
      };
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
