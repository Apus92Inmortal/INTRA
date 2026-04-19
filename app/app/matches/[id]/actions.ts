"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acceptMatchAction(matchId: string) {
  try {
    if (!matchId) {
      return { success: false, error: "No llego el ID del match" };
    }

    const supabase = await createClient();

    const { error: acceptError } = await supabase.rpc("accept_match", {
      p_match_id: matchId,
    });

    if (acceptError) {
      return { success: false, error: acceptError.message };
    }

    revalidatePath(`/app/matches/${matchId}`);
    revalidatePath("/app/matches");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al aceptar el match",
    };
  }
}

export async function rejectMatchAction(matchId: string) {
  try {
    if (!matchId) {
      return { success: false, error: "No llego el ID del match" };
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("reject_match", {
      p_match_id: matchId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/app/matches/${matchId}`);
    revalidatePath("/app/matches");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al rechazar el match",
    };
  }
}

export async function cancelMatchAction(matchId: string) {
  try {
    if (!matchId) {
      return { success: false, error: "No llego el ID del match" };
    }

    const supabase = await createClient();

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, shipment_id")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return {
        success: false,
        error: matchError?.message ?? "No se encontro el match",
      };
    }

    const { data: payment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("id, status")
      .eq("shipment_id", match.shipment_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentLookupError) {
      return { success: false, error: paymentLookupError.message };
    }

    if (!payment) {
      return {
        success: false,
        error: "No se encontro un pago asociado a este envio",
      };
    }

    const previousPaymentStatus = payment.status;

    if (payment.status !== "refunded") {
      const { error: refundError } = await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("id", payment.id);

      if (refundError) {
        return { success: false, error: refundError.message };
      }
    }

    const { error: cancelError } = await supabase
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", matchId);

    if (cancelError) {
      if (previousPaymentStatus !== "refunded") {
        await supabase
          .from("payments")
          .update({ status: previousPaymentStatus })
          .eq("id", payment.id);
      }

      return { success: false, error: cancelError.message };
    }

    revalidatePath(`/app/matches/${matchId}`);
    revalidatePath("/app/matches");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al cancelar el match",
    };
  }
}

export async function markInTransitAction(shipmentId: string) {
  try {
    if (!shipmentId) {
      return { success: false, error: "No llego el ID del shipment" };
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("mark_shipment_in_transit", {
      p_shipment_id: shipmentId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al marcar en transito",
    };
  }
}

export async function confirmDeliveryAction(shipmentId: string) {
  try {
    if (!shipmentId) {
      return { success: false, error: "No llego el ID del shipment" };
    }

    const supabase = await createClient();

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("id")
      .eq("id", shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return {
        success: false,
        error: shipmentError?.message ?? "No se encontro el shipment",
      };
    }

    const { error } = await supabase.rpc("confirm_shipment_delivery", {
      p_shipment_id: shipmentId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: payment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("id")
      .eq("shipment_id", shipment.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentLookupError) {
      return { success: false, error: paymentLookupError.message };
    }

    if (!payment) {
      return {
        success: false,
        error: "No se encontro un pago asociado a este envio",
      };
    }

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "released",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (paymentUpdateError) {
      return { success: false, error: paymentUpdateError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al confirmar la entrega",
    };
  }
}

export async function markInTransitFormAction(
  shipmentId: string,
  matchId: string
): Promise<void> {
  const result = await markInTransitAction(shipmentId);

  if (!result.success) {
    throw new Error(result.error || "Error al marcar en transito");
  }

  revalidatePath(`/app/matches/${matchId}`);
  revalidatePath("/app/matches");
}

export async function confirmDeliveryFormAction(
  shipmentId: string,
  matchId: string
): Promise<void> {
  const result = await confirmDeliveryAction(shipmentId);

  if (!result.success) {
    throw new Error(result.error || "Error al confirmar la entrega");
  }

  revalidatePath(`/app/matches/${matchId}`);
  revalidatePath("/app/matches");
}
