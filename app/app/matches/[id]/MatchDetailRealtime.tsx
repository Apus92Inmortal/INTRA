"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  matchId: string;
};

export default function MatchDetailRealtime({ matchId }: Props) {
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
      .channel(`match-detail-${matchId}`)

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
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
  }, [supabase, router, matchId]);

  return null;
}