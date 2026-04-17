"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  currentUserId: string;
};

export default function MarketRealtime({ currentUserId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef(0);

  function safeRefresh() {
    const now = Date.now();

    // evita refreshes demasiado seguidos
    if (now - lastRefreshRef.current < 1500) {
      return;
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      lastRefreshRef.current = Date.now();
      router.refresh();
    }, 300);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`market-realtime-${currentUserId}`)

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

      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [supabase, router, currentUserId]);

  return null;
}