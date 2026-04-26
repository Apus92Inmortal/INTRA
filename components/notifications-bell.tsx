"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Handshake,
  MessageCircle,
  Package,
  Trash2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NotificationItem = {
  id: string;
  user_id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  related_match_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type MatchNotificationRelation = {
  id: string;
  shipment: { owner_id: string | null } | { owner_id: string | null }[] | null;
  trip: { traveler_id: string | null } | { traveler_id: string | null }[] | null;
};

type ProfileNameRow = {
  id: string;
  full_name: string | null;
};

const SWIPE_ACTION_WIDTH = 112;
const SWIPE_OPEN_THRESHOLD = 56;

function pickJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getRelativeTimeLabel(dateString: string) {
  const now = new Date();
  const target = new Date(dateString);
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const diffDays = Math.round((today - targetDay) / 86400000);

  if (diffDays === 1) {
    return "Ayer";
  }

  const safeDays = Math.max(1, diffDays);
  return `Hace ${safeDays} día${safeDays === 1 ? "" : "s"}`;
}

function truncateText(value: string | null | undefined, maxLength = 90) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function getNotificationVisual(type: string | null) {
  switch (type) {
    case "new_message":
      return {
        icon: MessageCircle,
        iconClassName: "text-[#0B2C4A]",
        badgeClassName: "bg-[#EEF2F7]",
      };
    case "shipment_in_transit":
    case "delivery_confirmed":
      return {
        icon: Package,
        iconClassName: "text-[#0B2C4A]",
        badgeClassName: "bg-[#EEF2F7]",
      };
    case "payment_released":
    case "refund_processed":
      return {
        icon: Wallet,
        iconClassName: "text-[#2ECC71]",
        badgeClassName: "bg-[#EFFBF4]",
      };
    case "dispute_opened":
      return {
        icon: AlertTriangle,
        iconClassName: "text-[#F39C12]",
        badgeClassName: "bg-[#FFF4E5]",
      };
    case "match_requested":
    case "match_accepted":
    case "match_rejected":
    case "match_cancelled":
      return {
        icon: Handshake,
        iconClassName: "text-[#2ECC71]",
        badgeClassName: "bg-[#EFFBF4]",
      };
    default:
      return {
        icon: Bell,
        iconClassName: "text-[#0B2C4A]",
        badgeClassName: "bg-[#EEF2F7]",
      };
  }
}

function getNotificationTitle(item: NotificationItem, counterpartName?: string) {
  switch (item.type) {
    case "new_message":
      return counterpartName
        ? `${counterpartName} te envió un mensaje`
        : item.title ?? "Nuevo mensaje";
    case "match_requested":
      return counterpartName
        ? `${counterpartName} quiere transportar tu envío`
        : item.title ?? "Nueva solicitud";
    case "match_accepted":
      return counterpartName
        ? `${counterpartName} aceptó tu solicitud`
        : item.title ?? "Solicitud aceptada";
    case "match_rejected":
      return counterpartName
        ? `${counterpartName} rechazó tu solicitud`
        : item.title ?? "Solicitud rechazada";
    case "match_cancelled":
      return counterpartName
        ? `${counterpartName} canceló el match`
        : item.title ?? "Match cancelado";
    case "shipment_in_transit":
      return counterpartName
        ? `${counterpartName} puso tu envío en camino`
        : item.title ?? "Tu envío está en camino";
    case "delivery_confirmed":
      return counterpartName
        ? `${counterpartName} confirmó la entrega`
        : item.title ?? "Entrega confirmada";
    case "dispute_opened":
      return counterpartName
        ? `${counterpartName} abrió una disputa`
        : item.title ?? "Disputa abierta";
    default:
      return item.title ?? "Nueva notificación";
  }
}

function getNotificationBody(item: NotificationItem) {
  if (item.type === "new_message") {
    return truncateText(item.message, 60);
  }

  return truncateText(item.message, 90);
}

export function NotificationsBell() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counterpartNames, setCounterpartNames] = useState<Record<string, string>>({});
  const [animateBadge, setAnimateBadge] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousUnreadCountRef = useRef(0);
  const badgeAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const pointerStartXRef = useRef(0);
  const pointerStartOffsetRef = useRef(0);
  const suppressClickRef = useRef(false);

  const loadCounterpartNames = useCallback(
    async (currentUserId: string, rows: NotificationItem[]) => {
      const matchIds = Array.from(
        new Set(rows.map((row) => row.related_match_id).filter(Boolean))
      ) as string[];

      if (matchIds.length === 0) {
        setCounterpartNames({});
        return;
      }

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          `
            id,
            shipment:shipments!matches_shipment_id_fkey(owner_id),
            trip:trips!matches_trip_id_fkey(traveler_id)
          `
        )
        .in("id", matchIds);

      if (matchesError) {
        console.error(
          "Error loading match relations for notifications:",
          matchesError.message
        );
        return;
      }

      const relations = ((matchesData ?? []) as MatchNotificationRelation[]).filter(Boolean);
      const counterpartIdByMatchId = new Map<string, string>();

      for (const relation of relations) {
        const shipment = pickJoinedRow(relation.shipment);
        const trip = pickJoinedRow(relation.trip);
        const ownerId = shipment?.owner_id ?? null;
        const travelerId = trip?.traveler_id ?? null;
        const counterpartId =
          ownerId === currentUserId
            ? travelerId
            : travelerId === currentUserId
              ? ownerId
              : ownerId ?? travelerId;

        if (counterpartId) {
          counterpartIdByMatchId.set(relation.id, counterpartId);
        }
      }

      const counterpartIds = Array.from(new Set(counterpartIdByMatchId.values()));
      if (counterpartIds.length === 0) {
        setCounterpartNames({});
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", counterpartIds);

      if (profilesError) {
        console.error(
          "Error loading notification counterpart profiles:",
          profilesError.message
        );
        return;
      }

      const profileNameById = new Map<string, string>(
        ((profilesData ?? []) as ProfileNameRow[]).map((profile: ProfileNameRow) => [
          profile.id,
          profile.full_name?.trim() || "La otra persona",
        ])
      );

      const nextNames: Record<string, string> = {};
      for (const [matchId, counterpartId] of counterpartIdByMatchId.entries()) {
        nextNames[matchId] = profileNameById.get(counterpartId) ?? "La otra persona";
      }

      setCounterpartNames(nextNames);
    },
    [supabase]
  );

  const loadNotifications = useCallback(
    async (currentUserId: string) => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, user_id, title, message, type, related_match_id, is_read, read_at, created_at"
        )
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading notifications:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      const rows = (data ?? []) as NotificationItem[];
      const nextUnreadCount = rows.filter((notification) => !notification.is_read).length;

      if (nextUnreadCount > previousUnreadCountRef.current) {
        setAnimateBadge(true);

        if (badgeAnimationTimeoutRef.current) {
          clearTimeout(badgeAnimationTimeoutRef.current);
        }

        badgeAnimationTimeoutRef.current = setTimeout(() => {
          setAnimateBadge(false);
        }, 1200);
      }

      previousUnreadCountRef.current = nextUnreadCount;
      setItems(rows);
      setUnreadCount(nextUnreadCount);
      await loadCounterpartNames(currentUserId, rows);
    },
    [loadCounterpartNames, supabase]
  );

  useEffect(() => {
    return () => {
      if (badgeAnimationTimeoutRef.current) {
        clearTimeout(badgeAnimationTimeoutRef.current);
      }
    };
  }, []);

  const removeNotificationsFromState = useCallback((ids: string[]) => {
    const idSet = new Set(ids);

    setItems((prev) => prev.filter((notification) => !idSet.has(notification.id)));
    setUnreadCount((prev) => {
      const removedUnread = items.filter(
        (notification) => idSet.has(notification.id) && !notification.is_read
      ).length;
      const nextCount = Math.max(0, prev - removedUnread);
      previousUnreadCountRef.current = nextCount;
      return nextCount;
    });
    setSwipedId((prev) => (prev && ids.includes(prev) ? null : prev));
  }, [items]);

  async function markOneAsRead(id: string) {
    const { error } = await supabase.rpc("mark_notification_as_read", {
      p_notification_id: id,
    });

    if (error) {
      console.error("Error marking notification as read:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return false;
    }

    const now = new Date().toISOString();

    setItems((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true, read_at: now }
          : notification
      )
    );

    setUnreadCount((prev) => {
      const nextCount = Math.max(0, prev - 1);
      previousUnreadCountRef.current = nextCount;
      return nextCount;
    });
    return true;
  }

  async function markNotificationsForMatchAsRead(matchId: string) {
    const idsToMark = items
      .filter(
        (notification) =>
          !notification.is_read &&
          notification.related_match_id === matchId &&
          notification.type === "new_message"
      )
      .map((notification) => notification.id);

    if (idsToMark.length === 0) {
      return true;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: now,
      })
      .in("id", idsToMark);

    if (error) {
      console.error("Error marking match notifications as read:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return false;
    }

    setItems((prev) =>
      prev.map((notification) =>
        idsToMark.includes(notification.id)
          ? { ...notification, is_read: true, read_at: now }
          : notification
      )
    );

    setUnreadCount((prev) => {
      const nextCount = Math.max(0, prev - idsToMark.length);
      previousUnreadCountRef.current = nextCount;
      return nextCount;
    });
    return true;
  }

  async function markAllAsRead() {
    const { error } = await supabase.rpc("mark_all_notifications_as_read");

    if (error) {
      console.error("Error marking all notifications as read:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    const now = new Date().toISOString();

    setItems((prev) =>
      prev.map((notification) => ({
        ...notification,
        is_read: true,
        read_at: notification.read_at ?? now,
      }))
    );

    previousUnreadCountRef.current = 0;
    setUnreadCount(0);
  }

  async function deleteNotificationById(notificationId: string) {
    setDeletingId(notificationId);

    const { data, error } = await supabase.rpc("delete_notification", {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error("Error deleting notification:", error.message);
      setDeletingId(null);
      return;
    }

    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      console.error("Notification delete rejected:", data);
      setDeletingId(null);
      return;
    }

    removeNotificationsFromState([notificationId]);
    setDeletingId(null);
  }

  async function clearAllNotifications() {
    setClearingAll(true);

    const { data, error } = await supabase.rpc("clear_user_notifications", {
      p_only_read: false,
    });

    if (error) {
      console.error("Error clearing notifications:", error.message);
      setClearingAll(false);
      return;
    }

    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      console.error("Clear notifications rejected:", data);
      setClearingAll(false);
      return;
    }

    previousUnreadCountRef.current = 0;
    setItems([]);
    setUnreadCount(0);
    setCounterpartNames({});
    setSwipedId(null);
    setShowClearAllModal(false);
    setClearingAll(false);
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (swipedId === item.id) {
      setSwipedId(null);
      return;
    }

    if (item.related_match_id && item.type === "new_message") {
      await markNotificationsForMatchAsRead(item.related_match_id);
    } else if (!item.is_read) {
      await markOneAsRead(item.id);
    }

    setOpen(false);
    setSwipedId(null);

    if (!item.related_match_id) return;

    if (item.type === "new_message") {
      router.push(`/app/matches/${item.related_match_id}/chat`);
      return;
    }

    router.push(`/app/matches/${item.related_match_id}`);
  }

  function handlePointerDown(notificationId: string) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      if (deletingId || clearingAll) return;

      suppressClickRef.current = false;
      activeDragIdRef.current = notificationId;
      pointerStartXRef.current = event.clientX;
      pointerStartOffsetRef.current = swipedId === notificationId ? -SWIPE_ACTION_WIDTH : 0;
      setActiveDragId(notificationId);
      setDragOffset(pointerStartOffsetRef.current);
      event.currentTarget.setPointerCapture(event.pointerId);
    };
  }

  function handlePointerMove(notificationId: string) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      if (activeDragIdRef.current !== notificationId) return;

      const deltaX = event.clientX - pointerStartXRef.current;
      const nextOffset = Math.min(
        0,
        Math.max(-SWIPE_ACTION_WIDTH, pointerStartOffsetRef.current + deltaX)
      );

      if (Math.abs(deltaX) > 8) {
        suppressClickRef.current = true;
      }

      setDragOffset(nextOffset);
    };
  }

  function handlePointerEnd(notificationId: string) {
    return () => {
      if (activeDragIdRef.current !== notificationId) return;

      const shouldStayOpen = dragOffset <= -SWIPE_OPEN_THRESHOLD;

      setActiveDragId(null);
      activeDragIdRef.current = null;
      setDragOffset(0);
      setSwipedId(shouldStayOpen ? notificationId : null);
    };
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting current user:", error.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setUserId(null);
        setItems([]);
        setUnreadCount(0);
        setCounterpartNames({});
        setLoading(false);
        return;
      }

      if (!mounted) return;

      setUserId(user.id);
      await loadNotifications(user.id);
      setLoading(false);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [loadNotifications, supabase]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await loadNotifications(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await loadNotifications(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await loadNotifications(userId);
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void loadNotifications(userId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, supabase, userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setShowClearAllModal(false);
        setSwipedId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#0B2C4A] transition hover:bg-slate-50"
        aria-label="Notificaciones"
        type="button"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={`absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 text-center text-xs text-white ${
              animateBadge ? "animate-pulse" : ""
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-20 z-50 flex max-h-[calc(100dvh-6rem)] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-xl sm:absolute sm:right-0 sm:left-auto sm:top-auto sm:mt-2 sm:w-[24rem] sm:max-h-96">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#0B2C4A]">Notificaciones</h3>
              <p className="mt-1 text-xs text-slate-400">Desliza una tarjeta para mostrar borrar</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={markAllAsRead}
                className="min-h-11 text-sm text-blue-600 hover:underline"
                type="button"
                disabled={items.length === 0}
              >
                Marcar leídas
              </button>
              <button
                onClick={() => setShowClearAllModal(true)}
                className="min-h-11 text-sm text-red-600 hover:underline disabled:text-slate-300"
                type="button"
                disabled={items.length === 0}
              >
                Borrar todo
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain pb-4">
            {loading ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 p-4 text-center">
                <p className="text-sm font-semibold text-[#0B2C4A]">Sin novedades 🎉</p>
                <p className="mt-1 text-sm text-slate-500">
                  Publica un envío o un viaje para empezar a ver actividad aquí.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push("/app/shipments/new");
                    }}
                    type="button"
                    className="min-h-11 flex-1 rounded-xl bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#27ae60]"
                  >
                    Publicar envío
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push("/app/trips/new");
                    }}
                    type="button"
                    className="min-h-11 flex-1 rounded-xl border border-[#0B2C4A]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
                  >
                    Publicar viaje
                  </button>
                </div>
              </div>
            ) : (
              items.map((item) => {
                const counterpartName = item.related_match_id
                  ? counterpartNames[item.related_match_id]
                  : undefined;
                const visual = getNotificationVisual(item.type);
                const Icon = visual.icon;
                const offset =
                  activeDragId === item.id
                    ? dragOffset
                    : swipedId === item.id
                      ? -SWIPE_ACTION_WIDTH
                      : 0;
                const isDeleting = deletingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="relative overflow-hidden rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteNotificationById(item.id);
                      }}
                      disabled={Boolean(deletingId) || clearingAll}
                      className="absolute inset-0 flex w-full items-center justify-end rounded-xl bg-red-500 pr-5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Trash2 className="h-4 w-4" />
                        <span>{isDeleting ? "Borrando" : "Borrar"}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => void handleNotificationClick(item)}
                      onPointerDown={handlePointerDown(item.id)}
                      onPointerMove={handlePointerMove(item.id)}
                      onPointerUp={handlePointerEnd(item.id)}
                      onPointerCancel={handlePointerEnd(item.id)}
                      type="button"
                      disabled={clearingAll || isDeleting}
                      className={`min-h-11 relative z-10 w-full rounded-xl border p-3 text-left transition ${
                        item.is_read ? "bg-white" : "bg-slate-50"
                      }`}
                      style={{
                        transform: `translateX(${offset}px)`,
                        transition:
                          activeDragId === item.id
                            ? "none"
                            : "transform 180ms ease, background-color 150ms ease",
                        touchAction: "pan-y",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${visual.badgeClassName}`}
                        >
                          <Icon className={`h-4 w-4 ${visual.iconClassName}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-medium text-slate-900">
                                {getNotificationTitle(item, counterpartName)}
                              </p>
                              <p className="mt-1 break-words text-sm text-slate-600">
                                {getNotificationBody(item)}
                              </p>
                              <p className="mt-2 text-xs text-slate-400">
                                {getRelativeTimeLabel(item.created_at)}
                              </p>
                            </div>

                            {!item.is_read && (
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {open && showClearAllModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-semibold text-[#0B2C4A]">Borrar todas las notificaciones</h4>
            <p className="mt-2 text-sm text-slate-500">
              Esto eliminará tanto las leídas como las no leídas. Esta acción no se puede deshacer.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="min-h-11 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
                disabled={clearingAll}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void clearAllNotifications()}
                className="min-h-11 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                disabled={clearingAll}
              >
                {clearingAll ? "Borrando..." : "Sí, borrar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
