"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acceptMatchAction(matchId: string) {
  try {
    if (!matchId) {
      return { success: false, error: "No llegó el ID del match" };
    }

    const supabase = await createClient();

    const { error: acceptError } = await supabase.rpc("accept_match", {
      p_match_id: matchId,
    });

    if (acceptError) {
      return { success: false, error: acceptError.message };
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      match_id: matchId,
      amount: 0,
      status: "held",
    });

    if (paymentError) {
      return { success: false, error: paymentError.message };
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
      return { success: false, error: "No llegó el ID del match" };
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
      return { success: false, error: "No llegó el ID del match" };
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("cancel_match", {
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
          : "Error inesperado al cancelar el match",
    };
  }
}

export async function markInTransitAction(shipmentId: string) {
  try {
    if (!shipmentId) {
      return { success: false, error: "No llegó el ID del shipment" };
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
          : "Error al marcar en tránsito",
    };
  }
}

export async function confirmDeliveryAction(shipmentId: string) {
  try {
    if (!shipmentId) {
      return { success: false, error: "No llegó el ID del shipment" };
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("confirm_shipment_delivery", {
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
          : "Error al confirmar la entrega",
    };
  }
}

export async function markInTransitAndRevalidateAction(
  shipmentId: string,
  matchId: string
) {
  try {
    const result = await markInTransitAction(shipmentId);

    if (!result.success) {
      return result;
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
          : "Error al marcar en tránsito",
    };
  }
}

export async function confirmDeliveryAndRevalidateAction(
  shipmentId: string,
  matchId: string
) {
  try {
    const result = await confirmDeliveryAction(shipmentId);

    if (!result.success) {
      return result;
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
          : "Error al confirmar la entrega",
    };
  }
}