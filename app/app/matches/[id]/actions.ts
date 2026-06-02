"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getReviewWindowState } from "@/lib/reviews";

type ReviewPaymentRow = {
  created_at: string | null;
  delivered_at: string | null;
  updated_at: string | null;
};

const ACTIVE_SHIPMENT_ALERT_ERROR =
  "Este envío tiene una alerta activa de paquete sospechoso. Debe ser revisada antes de continuar.";

async function hasShipmentEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shipmentId: string,
  evidenceType: "pickup_photo" | "delivery_photo"
) {
  const { data, error } = await supabase
    .from("shipment_evidence")
    .select("id")
    .eq("shipment_id", shipmentId)
    .eq("evidence_type", evidenceType)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return {
      success: false,
      error:
        evidenceType === "pickup_photo"
          ? "Debes subir evidencia de recogida antes de marcar el paquete como recogido."
          : "Debes subir evidencia de entrega antes de reportar la entrega.",
    };
  }

  return { success: true };
}

async function hasActiveShipmentAlert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shipmentId: string
) {
  const { data, error } = await supabase
    .from("shipment_report_events")
    .select("id")
    .eq("shipment_id", shipmentId)
    .in("status", ["open", "reviewing"])
    .limit(1)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (data) {
    return { success: false, error: ACTIVE_SHIPMENT_ALERT_ERROR };
  }

  return { success: true };
}

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
    revalidatePath("/app");

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
    revalidatePath("/app");

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
      .select("id, shipment_id, status")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return {
        success: false,
        error: matchError?.message ?? "No se encontro el match",
      };
    }

    const { data: cancelResult, error: cancelError } = await supabase.rpc(
      "cancel_match",
      {
        p_match_id: matchId,
      }
    );

    if (cancelError) {
      return { success: false, error: cancelError.message };
    }

    if (
      cancelResult &&
      typeof cancelResult === "object" &&
      "success" in cancelResult &&
      cancelResult.success === false
    ) {
      return {
        success: false,
        error:
          typeof cancelResult.error === "string"
            ? cancelResult.error
            : "No se pudo cancelar el match",
      };
    }

    revalidatePath(`/app/matches/${matchId}`);
    revalidatePath("/app/matches");
    revalidatePath("/app");

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
    const activeAlertCheck = await hasActiveShipmentAlert(supabase, shipmentId);

    if (!activeAlertCheck.success) {
      return { success: false, error: activeAlertCheck.error };
    }

    const evidenceCheck = await hasShipmentEvidence(supabase, shipmentId, "pickup_photo");

    if (!evidenceCheck.success) {
      return { success: false, error: evidenceCheck.error };
    }

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

export async function markDeliveredAction(shipmentId: string) {
  try {
    if (!shipmentId) {
      return { success: false, error: "No llego el ID del shipment" };
    }

    const supabase = await createClient();
    const activeAlertCheck = await hasActiveShipmentAlert(supabase, shipmentId);

    if (!activeAlertCheck.success) {
      return { success: false, error: activeAlertCheck.error };
    }

    const evidenceCheck = await hasShipmentEvidence(supabase, shipmentId, "delivery_photo");

    if (!evidenceCheck.success) {
      return { success: false, error: evidenceCheck.error };
    }

    const { error } = await supabase.rpc("mark_shipment_delivered", {
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
          : "Error al marcar el paquete como entregado",
    };
  }
}

export async function confirmDeliveryAction(shipmentId: string) {
  try {
    if (!shipmentId) {
      return { success: false, error: "No llego el ID del shipment" };
    }

    const supabase = await createClient();
    const activeAlertCheck = await hasActiveShipmentAlert(supabase, shipmentId);

    if (!activeAlertCheck.success) {
      return { success: false, error: activeAlertCheck.error };
    }

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

export async function openDisputeAction(matchId: string) {
  try {
    if (!matchId) {
      return { success: false, error: "No llego el ID del match" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("open_dispute", {
      p_match_id: matchId,
      p_reason: "Disputa abierta desde la app",
    });

    if (error) {
      return { success: false, error: error.message };
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
            : "No se pudo abrir la disputa",
      };
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
          : "Error inesperado al abrir la disputa",
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
  revalidatePath("/app");
}

export async function markDeliveredFormAction(
  shipmentId: string,
  matchId: string
): Promise<void> {
  const result = await markDeliveredAction(shipmentId);

  if (!result.success) {
    throw new Error(result.error || "Error al marcar el paquete como entregado");
  }

  revalidatePath(`/app/matches/${matchId}`);
  revalidatePath("/app/matches");
  revalidatePath("/app");
}

export async function openDisputeFormAction(matchId: string): Promise<void> {
  const result = await openDisputeAction(matchId);

  if (!result.success) {
    throw new Error(result.error || "Error al abrir la disputa");
  }

  revalidatePath(`/app/matches/${matchId}`);
  revalidatePath("/app/matches");
  revalidatePath("/app");
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
  revalidatePath("/app");
}

export async function createReviewAction(
  matchId: string,
  rating: number
) {
  try {
    if (!matchId) {
      return { success: false, error: "No llegó el ID del match" };
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { success: false, error: "Selecciona una calificación entre 1 y 5 estrellas" };
    }

    const supabase = await createClient();

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        id,
        status,
        created_at,
        shipments (id, status),
        payments (delivered_at, updated_at, created_at)
      `)
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return {
        success: false,
        error: matchError?.message ?? "No se encontró el match",
      };
    }

    const shipment = Array.isArray(match.shipments) ? match.shipments[0] : match.shipments;
    const payments: ReviewPaymentRow[] = Array.isArray(match.payments)
      ? (match.payments as ReviewPaymentRow[])
      : [];
    const latestPayment = payments
      .filter(Boolean)
      .sort((first, second) => {
        const firstDate = new Date(first.created_at ?? first.updated_at ?? 0).getTime();
        const secondDate = new Date(second.created_at ?? second.updated_at ?? 0).getTime();
        return secondDate - firstDate;
      })[0];
    const isReviewStage =
      match.status === "completed" ||
      shipment?.status === "delivered" ||
      Boolean(latestPayment?.delivered_at);

    if (!isReviewStage) {
      return {
        success: false,
        error: "Solo puedes calificar cuando el match esté completado",
      };
    }

    const reviewWindow = getReviewWindowState(
      latestPayment?.delivered_at ??
        (match.status === "completed" ? latestPayment?.updated_at ?? match.created_at : null),
      new Date()
    );

    if (reviewWindow.isExpired) {
      return {
        success: false,
        error: "La ventana de calificación de 12 horas ya terminó",
      };
    }

    const { data, error } = await supabase.rpc("create_review", {
      p_match_id: matchId,
      p_rating: rating,
      p_comment: null,
    });

    if (error) {
      return { success: false, error: error.message };
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
            : "No se pudo crear la review",
      };
    }

    revalidatePath(`/app/matches/${matchId}`);
    revalidatePath(`/app/matches/${matchId}/chat`);
    revalidatePath("/app/matches");
    revalidatePath("/app/profile");
    revalidatePath("/app");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al crear la review",
    };
  }
}
