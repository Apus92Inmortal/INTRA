"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Props = {
  currentUserId: string;
};

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

const MARKET_CHANNEL_NAME = "market-realtime";
const MARKET_POLL_INTERVAL_MS = 12_000;
const MARKET_REFRESH_DEBOUNCE_MS = 700;
const MARKET_REFRESH_MIN_GAP_MS = 1500;
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

  console.info(`[intra-realtime] ${MARKET_CHANNEL_NAME}: ${message}`, detail ?? "");
}

function isPageVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export default function MarketRealtime({ currentUserId }: Props) {
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

    if (now - lastRefreshRef.current < MARKET_REFRESH_MIN_GAP_MS) {
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
    }, MARKET_REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const channelName = `${MARKET_CHANNEL_NAME}-${currentUserId}`;

    const handleRealtimeEvent = (payload: RealtimePayload) => {
      debugRealtime("event received", {
        channel: channelName,
        table: payload.table,
        event: payload.eventType,
      });
      safeRefresh("event");
    };

    const channel = supabase
      .channel(channelName)

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        handleRealtimeEvent
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipments",
        },
        handleRealtimeEvent
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `user_id=eq.${currentUserId}`,
        },
        handleRealtimeEvent
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        handleRealtimeEvent
      )

      .subscribe((status: string) => {
        debugRealtime("subscribe status", { channel: channelName, status });
      });

    pollIntervalRef.current = setInterval(() => {
      safeRefresh("poll");
    }, MARKET_POLL_INTERVAL_MS);

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
  }, [currentUserId, safeRefresh, supabase]);

  return null;
}
