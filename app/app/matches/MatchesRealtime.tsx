"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Props = {
  currentUserId: string;
};

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;
type MessageInsertPayload = RealtimePostgresChangesPayload<{ sender_id?: string | null }>;

const MATCHES_CHANNEL_NAME = "matches-realtime";
const MATCHES_POLL_INTERVAL_MS = 10_000;
const MATCHES_REFRESH_DEBOUNCE_MS = 700;
const MATCHES_REFRESH_MIN_GAP_MS = 1500;
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

  console.info(`[intra-realtime] ${MATCHES_CHANNEL_NAME}: ${message}`, detail ?? "");
}

function isPageVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export default function MatchesRealtime({ currentUserId }: Props) {
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

    if (now - lastRefreshRef.current < MATCHES_REFRESH_MIN_GAP_MS) {
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
    }, MATCHES_REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const channelName = `${MATCHES_CHANNEL_NAME}-${currentUserId}`;

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

      // NUEVOS MENSAJES
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: MessageInsertPayload) => {
          debugRealtime("event received", {
            channel: channelName,
            table: payload.table,
            event: payload.eventType,
          });

          const senderId = "sender_id" in payload.new ? payload.new.sender_id : null;

          // Solo refrescar si el mensaje no es mío
          if (senderId !== currentUserId) {
            safeRefresh("event");
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
        handleRealtimeEvent
      )

      // CAMBIOS EN SHIPMENTS
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
        },
        handleRealtimeEvent
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipment_report_events",
        },
        handleRealtimeEvent
      )

      .subscribe((status: string) => {
        debugRealtime("subscribe status", { channel: channelName, status });
      });

    pollIntervalRef.current = setInterval(() => {
      safeRefresh("poll");
    }, MATCHES_POLL_INTERVAL_MS);

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
