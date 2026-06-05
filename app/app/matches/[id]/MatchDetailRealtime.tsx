"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  matchId: string;
  shipmentId: string | null;
};

export default function MatchDetailRealtime({ matchId, shipmentId }: Props) {
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
    let channel = supabase
      .channel(`match-detail-${matchId}-${shipmentId ?? "no-shipment"}`)

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
      );

    if (shipmentId) {
      channel = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "shipments",
            filter: `id=eq.${shipmentId}`,
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
            filter: `shipment_id=eq.${shipmentId}`,
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
            table: "shipment_evidence",
            filter: `shipment_id=eq.${shipmentId}`,
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
            filter: `shipment_id=eq.${shipmentId}`,
          },
          () => {
            safeRefresh();
          }
        );
    } else {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipments",
        },
        () => {
          safeRefresh();
        }
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [matchId, safeRefresh, shipmentId, supabase]);

  return null;
}
