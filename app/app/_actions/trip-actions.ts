"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CloseTripResult = {
  success: boolean;
  error?: string;
  cancelledCount?: number;
};

export async function closeTripAction(tripId: string): Promise<CloseTripResult> {
  try {
    if (!tripId) {
      return { success: false, error: "No llegó el ID del viaje" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("close_trip", {
      p_trip_id: tripId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || typeof data !== "object") {
      return { success: false, error: "No se pudo cerrar el viaje" };
    }

    if ("success" in data && data.success === false) {
      return {
        success: false,
        error: typeof data.error === "string" ? data.error : "No se pudo cerrar el viaje",
      };
    }

    const cancelledMatchIds = Array.isArray(data.cancelled_match_ids)
      ? (data.cancelled_match_ids as unknown[]).filter(
          (value): value is string => typeof value === "string"
        )
      : [];

    revalidatePath("/app");
    revalidatePath("/app/market");
    revalidatePath("/app/matches");

    for (const matchId of cancelledMatchIds) {
      revalidatePath(`/app/matches/${matchId}`);
      revalidatePath(`/app/matches/${matchId}/chat`);
    }

    return {
      success: true,
      cancelledCount: typeof data.cancelled_count === "number" ? data.cancelled_count : 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado al cerrar el viaje",
    };
  }
}
