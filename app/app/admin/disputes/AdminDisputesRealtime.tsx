"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const ADMIN_DISPUTES_POLL_INTERVAL_MS = 25_000
const ADMIN_DISPUTES_REFRESH_DEBOUNCE_MS = 800

export default function AdminDisputesRealtime() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const safeRefresh = useCallback(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    refreshTimeoutRef.current = setTimeout(() => {
      router.refresh()
    }, ADMIN_DISPUTES_REFRESH_DEBOUNCE_MS)
  }, [router])

  useEffect(() => {
    const channel = supabase
      .channel("admin-disputes-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipment_report_events",
        },
        () => {
          safeRefresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipment_evidence",
        },
        () => {
          safeRefresh()
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
          safeRefresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          safeRefresh()
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
          safeRefresh()
        }
      )
      .subscribe()

    pollIntervalRef.current = setInterval(() => {
      safeRefresh()
    }, ADMIN_DISPUTES_POLL_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        safeRefresh()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [safeRefresh, supabase])

  return null
}
