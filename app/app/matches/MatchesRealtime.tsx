"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  currentUserId: string;
};

type MessageInsertPayload = {
  new: {
    sender_id?: string | null;
  } | null;
};

export default function MatchesRealtime({ currentUserId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      router.refresh();
    }, 200);
  }, [router]);

  useEffect(() => {
    const channel = supabase
      .channel(`matches-realtime-${currentUserId}`)

      // NUEVOS MENSAJES
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: MessageInsertPayload) => {
          console.log("📩 Nuevo mensaje:", payload.new);

          // Solo refrescar si el mensaje no es mío
          if (payload.new?.sender_id !== currentUserId) {
            safeRefresh();
          }
        }
      )

      // CAMBIOS EN MATCHES
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          console.log("🤝 Cambio en match");
          safeRefresh();
        }
      )

      // CAMBIOS EN SHIPMENTS
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipments",
        },
        () => {
          console.log("📦 Cambio en shipment");
          safeRefresh();
        }
      )

      .subscribe((status: string) => {
        console.log("REALTIME STATUS:", status);
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [currentUserId, safeRefresh, supabase]);

  return null;
}
