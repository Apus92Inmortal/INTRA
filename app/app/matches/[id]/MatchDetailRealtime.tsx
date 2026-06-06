"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Props = {
  matchId: string;
  shipmentId: string | null;
};

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

const MATCH_DETAIL_CHANNEL_NAME = "match-detail";
const MATCH_DETAIL_POLL_INTERVAL_MS = 8_000;
const MATCH_DETAIL_REFRESH_DEBOUNCE_MS = 700;
const MATCH_DETAIL_REFRESH_MIN_GAP_MS = 1500;
const REALTIME_DEBUG_STORAGE_KEY = "intraRealtimeDebug";

function isRealtimeDebugEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(REALTIME_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function debugRealtime(message: string, detail?: unknown) {
  if (!isRealtimeDebugEnabled()) {
    return;
  }

  console.info(`[intra-realtime] ${MATCH_DETAIL_CHANNEL_NAME}: ${message}`, detail ?? "");
}

function isPageVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export default function MatchDetailRealtime({ matchId, shipmentId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRefreshRef = useRef(0);

  const safeRefresh = useCallback((source: "event" | "poll" | "visible") => {
    if (!isPageVisible()) {
      debugRealtime("refresh skipped while hidden", { source });
      return;
    }

    const now = Date.now();

    if (now - lastRefreshRef.current < MATCH_DETAIL_REFRESH_MIN_GAP_MS) {
      debugRealtime("refresh skipped by min gap", { source });
      return;
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      if (!isPageVisible()) {
        debugRealtime("refresh skipped before execution while hidden", { source });
        return;
      }

      lastRefreshRef.current = Date.now();
      debugRealtime("router.refresh()", { source });
      router.refresh();
    }, MATCH_DETAIL_REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const channelName = `${MATCH_DETAIL_CHANNEL_NAME}-${matchId}-${shipmentId ?? "no-shipment"}`;

    const handleRealtimeEvent = (payload: RealtimePayload) => {
      debugRealtime("event received", {
        channel: channelName,
        table: payload.table,
        event: payload.eventType,
      });
      safeRefresh("event");
    };

    let channel = supabase
      .channel(channelName)

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        handleRealtimeEvent
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
          handleRealtimeEvent
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payments",
            filter: `shipment_id=eq.${shipmentId}`,
          },
          handleRealtimeEvent
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "shipment_evidence",
            filter: `shipment_id=eq.${shipmentId}`,
          },
          handleRealtimeEvent
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "shipment_report_events",
            filter: `shipment_id=eq.${shipmentId}`,
          },
          handleRealtimeEvent
        );
    } else {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipments",
        },
        handleRealtimeEvent
      );
    }

    channel.subscribe((status: string) => {
      debugRealtime("subscribe status", { channel: channelName, status });
    });

    pollIntervalRef.current = setInterval(() => {
      safeRefresh("poll");
    }, MATCH_DETAIL_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        safeRefresh("visible");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [matchId, safeRefresh, shipmentId, supabase]);

  return null;
}
