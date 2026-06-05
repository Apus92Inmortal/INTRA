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
    }, 700);
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
          safeRefresh();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        () => {
          safeRefresh();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipment_report_events",
        },
        () => {
          safeRefresh();
        }
      )

      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [currentUserId, safeRefresh, supabase]);

  return null;
}
