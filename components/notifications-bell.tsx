"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
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

export function NotificationsBell() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications(currentUserId: string) {
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
    setItems(rows);
    setUnreadCount(rows.filter((n) => !n.is_read).length);
  }

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
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: now } : n))
    );

    setUnreadCount((prev) => Math.max(0, prev - 1));
    return true;
  }

  async function markNotificationsForMatchAsRead(matchId: string) {
    const idsToMark = items
      .filter(
        (n) =>
          !n.is_read &&
          n.related_match_id === matchId &&
          n.type === "new_message"
      )
      .map((n) => n.id);

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
      prev.map((n) =>
        idsToMark.includes(n.id) ? { ...n, is_read: true, read_at: now } : n
      )
    );

    setUnreadCount((prev) => Math.max(0, prev - idsToMark.length));
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
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at ?? now,
      }))
    );

    setUnreadCount(0);
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (item.related_match_id && item.type === "new_message") {
      await markNotificationsForMatchAsRead(item.related_match_id);
    } else if (!item.is_read) {
      await markOneAsRead(item.id);
    }

    setOpen(false);

    if (!item.related_match_id) return;

    if (item.type === "new_message") {
      router.push(`/app/matches/${item.related_match_id}/chat`);
      return;
    }

    router.push(`/app/matches/${item.related_match_id}`);
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
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newItem = payload.new as NotificationItem;

          if (newItem.user_id !== userId) return;

          setItems((prev) => [newItem, ...prev].slice(0, 20));

          if (!newItem.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const updated = payload.new as NotificationItem;

          if (updated.user_id !== userId) return;

          setItems((prev) => {
            const exists = prev.some((n) => n.id === updated.id);

            const merged = exists
              ? prev.map((n) => (n.id === updated.id ? updated : n))
              : [updated, ...prev].slice(0, 20);

            setUnreadCount(merged.filter((n) => !n.is_read).length);
            return merged;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
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
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 hover:bg-slate-100"
        aria-label="Notificaciones"
        type="button"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 text-center text-xs text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 rounded-xl border bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Notificaciones</h3>
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:underline"
              type="button"
            >
              Marcar todas como leídas
            </button>
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tienes notificaciones.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition hover:bg-slate-50 ${
                    item.is_read ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {item.title ?? "Nueva notificación"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.message ?? ""}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>

                    {!item.is_read && (
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}