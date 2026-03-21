"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  currentUserId: string;
};

export default function MatchesRealtime({ currentUserId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function safeRefresh() {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      router.refresh();
    }, 200);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`matches-realtime-${currentUserId}`)

      // 👇 SOLO MENSAJES RELEVANTES
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("📩 Nuevo mensaje:", payload.new);

          // ⚠️ SOLO refrescar si el mensaje NO es mío
          if (payload.new.sender_id !== currentUserId) {
            safeRefresh();
          }
        }
      )

      // 👇 CAMBIOS EN MATCHES (lectura, estado, etc)
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

      .subscribe((status) => {
        console.log("REALTIME STATUS:", status);
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [supabase, router, currentUserId]);

  return null;
}