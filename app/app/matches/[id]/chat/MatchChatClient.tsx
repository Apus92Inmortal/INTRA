"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type Props = {
  matchId: string;
  currentUserId: string;
  otherUserId: string;
  currentUserName: string;
  otherUserName: string;
  otherUserAvgRating: number | null;
  otherUserTotalReviews: number;
  shipmentTrackingCode: string | null;
  shipmentRouteLabel: string;
  shipmentDescription: string | null;
  initialMessages: Message[];
  viewerRole: "traveler" | "owner";
  lastReadByOwner: string | null;
  lastReadByTraveler: string | null;
};

type BroadcastPayload<T> = {
  payload?: T | null;
};

type TypingPayload = BroadcastPayload<{
  senderId?: string | null;
}>;

type ReadReceiptPayload = BroadcastPayload<{
  readerId?: string | null;
  viewerRole?: "owner" | "traveler" | null;
  readAt?: string | null;
}>;

type MessageInsertPayload = {
  new: Message;
};

type MatchUpdatePayload = {
  new: {
    last_read_by_owner: string | null;
    last_read_by_traveler: string | null;
  };
};

function formatMessageTime(dateString: string) {
  const date = new Date(dateString);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "p. m." : "a. m.";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${ampm}`;
}

function sortMessages(list: Message[]) {
  return [...list].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function mergeMessages(prev: Message[], incoming: Message[]) {
  const map = new Map<string, Message>();

  for (const msg of prev) {
    map.set(msg.id, msg);
  }

  for (const msg of incoming) {
    map.set(msg.id, msg);
  }

  return sortMessages(Array.from(map.values()));
}

function latestTimestamp(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;

  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function getMessagePreview(message: string, maxLength = 60) {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "IN";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function MatchChatClient({
  matchId,
  currentUserId,
  otherUserId,
  currentUserName,
  otherUserName,
  initialMessages,
  viewerRole,
  lastReadByOwner,
  lastReadByTraveler,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<Message[]>(
    sortMessages(initialMessages)
  );
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [readStateOverrides, setReadStateOverrides] = useState({
    lastReadByOwner: null as string | null,
    lastReadByTraveler: null as string | null,
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const channelReadyRef = useRef(false);
  const markingReadRef = useRef(false);
  const lastMarkedReadAtRef = useRef<string | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const hasAutoScrolledInitiallyRef = useRef(false);
  const previousLastMessageIdRef = useRef<string | null>(
    initialMessages[initialMessages.length - 1]?.id ?? null
  );
  const readStateRef = useRef({
    lastReadByOwner,
    lastReadByTraveler,
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const otherUserRoleLabel = viewerRole === "owner" ? "Viajero" : "Cliente";
  const otherUserInitials = getInitials(otherUserName);

  const readState = useMemo(
    () => ({
      lastReadByOwner: latestTimestamp(
        lastReadByOwner,
        readStateOverrides.lastReadByOwner
      ),
      lastReadByTraveler: latestTimestamp(
        lastReadByTraveler,
        readStateOverrides.lastReadByTraveler
      ),
    }),
    [
      lastReadByOwner,
      lastReadByTraveler,
      readStateOverrides.lastReadByOwner,
      readStateOverrides.lastReadByTraveler,
    ]
  );

  useEffect(() => {
    readStateRef.current = readState;
  }, [readState]);

  useEffect(() => {
    channelReadyRef.current = channelReady;
  }, [channelReady]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [newMessage]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const updateShouldStickToBottom = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;

    const distanceToBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

    shouldStickToBottomRef.current = distanceToBottom < 80;
  }, []);

  function getOtherUserLastRead() {
    return viewerRole === "owner"
      ? readState.lastReadByTraveler
      : readState.lastReadByOwner;
  }

  function isMessageRead(msg: Message) {
    if (msg.sender_id !== currentUserId) return false;

    const otherUserLastRead = getOtherUserLastRead();
    if (!otherUserLastRead) return false;

    return (
      new Date(msg.created_at).getTime() <=
      new Date(otherUserLastRead).getTime()
    );
  }

  function sendTypingEvent() {
    const channel = messagesChannelRef.current;
    if (!channel || !channelReadyRef.current) return;

    channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        matchId,
        senderId: currentUserId,
      },
    });
  }

  const sendReadReceipt = useCallback((readAt: string) => {
    const channel = messagesChannelRef.current;
    if (!channel || !channelReadyRef.current) return;

    channel.send({
      type: "broadcast",
      event: "read_receipt",
      payload: {
        matchId,
        readerId: currentUserId,
        viewerRole,
        readAt,
      },
    });
  }, [currentUserId, matchId, viewerRole]);

  const refreshMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, match_id, sender_id, message, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error refreshing messages:", error.message);
      return;
    }

    if (!data) return;

    setMessages((prev) => mergeMessages(prev, data as Message[]));
  }, [matchId, supabase]);

  const refreshReadState = useCallback(async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("last_read_by_owner, last_read_by_traveler")
      .eq("id", matchId)
      .single();

    if (error) {
      console.error("Error refreshing read state:", error.message);
      return;
    }

    if (!data) return;

    setReadStateOverrides({
      lastReadByOwner: data.last_read_by_owner,
      lastReadByTraveler: data.last_read_by_traveler,
    });
  }, [matchId, supabase]);

  const markChatNotificationsAsRead = useCallback(async () => {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: now,
      })
      .eq("related_match_id", matchId)
      .eq("type", "new_message")
      .eq("is_read", false);

    if (error) {
      console.error("Error marking chat notifications as read:", error.message);
    }
  }, [matchId, supabase]);

  const markIncomingMessageAsRead = useCallback(
    async (readAt: string) => {
      if (!channelReadyRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (!document.hasFocus()) return;
      if (markingReadRef.current) return;
      if (lastMarkedReadAtRef.current === readAt) return;

      markingReadRef.current = true;

      const { error } = await supabase.rpc("mark_match_read", {
        p_match_id: matchId,
        p_read_at: readAt,
      });

      if (error) {
        console.error("Error marking incoming message as read:", error.message);
        markingReadRef.current = false;
        return;
      }

      setReadStateOverrides((prev) => ({
        ...prev,
        ...(viewerRole === "owner"
          ? { lastReadByOwner: readAt }
          : { lastReadByTraveler: readAt }),
      }));

      lastMarkedReadAtRef.current = readAt;

      sendReadReceipt(readAt);
      await markChatNotificationsAsRead();

      markingReadRef.current = false;
    },
    [
      markChatNotificationsAsRead,
      matchId,
      sendReadReceipt,
      supabase,
      viewerRole,
    ]
  );

  const markAsReadNow = useCallback(async () => {
    if (!channelReadyRef.current) return;
    if (document.visibilityState !== "visible") return;
    if (!document.hasFocus()) return;
    if (markingReadRef.current) return;

    const myLastRead =
      viewerRole === "owner"
        ? readStateRef.current.lastReadByOwner
        : readStateRef.current.lastReadByTraveler;

    const unreadIncoming = messages
      .filter((msg) => msg.sender_id !== currentUserId)
      .filter((msg) => {
        if (!myLastRead) return true;
        return (
          new Date(msg.created_at).getTime() > new Date(myLastRead).getTime()
        );
      });

    if (unreadIncoming.length === 0) return;

    const lastUnread = unreadIncoming[unreadIncoming.length - 1];
    await markIncomingMessageAsRead(lastUnread.created_at);
  }, [currentUserId, markIncomingMessageAsRead, messages, viewerRole]);

  useEffect(() => {
    if (!hasAutoScrolledInitiallyRef.current) {
      scrollToBottom("auto");
      hasAutoScrolledInitiallyRef.current = true;
      previousLastMessageIdRef.current =
        messages[messages.length - 1]?.id ?? previousLastMessageIdRef.current;
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.id === previousLastMessageIdRef.current) {
      return;
    }

    const shouldAutoScroll =
      shouldStickToBottomRef.current || lastMessage.sender_id === currentUserId;

    previousLastMessageIdRef.current = lastMessage.id;

    if (shouldAutoScroll) {
      scrollToBottom(lastMessage.sender_id === currentUserId ? "smooth" : "auto");
    }
  }, [currentUserId, messages, scrollToBottom]);

  useEffect(() => {
    let isActive = true;

    const messagesChannel = supabase.channel(`messages-${matchId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: "" },
      },
    });

    messagesChannelRef.current = messagesChannel;

    messagesChannel
      .on("broadcast", { event: "typing" }, (payload: TypingPayload) => {
        const senderId = payload.payload?.senderId;

        if (!senderId || senderId === currentUserId) return;

        setOtherUserTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setOtherUserTyping(false);
        }, 1500);
      })
      .on("broadcast", { event: "read_receipt" }, (payload: ReadReceiptPayload) => {
        const readerId = payload.payload?.readerId;
        const incomingRole = payload.payload?.viewerRole;
        const readAt = payload.payload?.readAt;

        if (!readerId || !incomingRole || !readAt) return;
        if (readerId === currentUserId) return;

        setReadStateOverrides((prev) => ({
          ...prev,
          ...(incomingRole === "owner"
            ? { lastReadByOwner: readAt }
            : { lastReadByTraveler: readAt }),
        }));
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload: MessageInsertPayload) => {
          if (!isActive) return;

          const incoming = payload.new;
          setMessages((prev) => mergeMessages(prev, [incoming]));

          if (incoming.sender_id !== currentUserId) {
            setOtherUserTyping(false);

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }

            if (isActive) {
              await markIncomingMessageAsRead(incoming.created_at);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload: MatchUpdatePayload) => {
          if (!isActive) return;

          const updated = payload.new;

          setReadStateOverrides({
            lastReadByOwner: updated.last_read_by_owner,
            lastReadByTraveler: updated.last_read_by_traveler,
          });
        }
      )
      .subscribe(async (status: string) => {
        if (!isActive) return;

        if (status === "SUBSCRIBED") {
          setChannelReady(true);
          await refreshMessages();
          await refreshReadState();
          await markAsReadNow();
        }
      });

    const interval = setInterval(async () => {
      if (!isActive) return;
      await refreshMessages();
      await refreshReadState();
    }, 2000);

    const handleWindowFocus = async () => {
      if (!isActive) return;
      if (!channelReadyRef.current) return;

      await markAsReadNow();
    };

    const handleVisibilityChange = async () => {
      if (!isActive) return;
      if (!channelReadyRef.current) return;
      if (document.visibilityState !== "visible") return;

      await markAsReadNow();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      clearInterval(interval);

      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }

      setChannelReady(false);
      channelReadyRef.current = false;
    };
  }, [
    currentUserId,
    markAsReadNow,
    markIncomingMessageAsRead,
    matchId,
    refreshMessages,
    refreshReadState,
    supabase,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void markAsReadNow();
    }, 180);

    return () => clearTimeout(timeout);
  }, [messages, markAsReadNow]);

  async function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: currentUserId,
        message: trimmed,
      })
      .select("id, match_id, sender_id, message, created_at")
      .single();

    if (error) {
      console.error("Error sending message:", error.message);
      alert("No se pudo enviar el mensaje.");
      setSending(false);
      return;
    }

    if (data) {
      setMessages((prev) => mergeMessages(prev, [data]));
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: otherUserId,
        type: "new_message",
        title: `${currentUserName} te envió un mensaje`,
        message: getMessagePreview(trimmed),
        related_match_id: matchId,
        is_read: false,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError.message);
    }

    setOtherUserTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setNewMessage("");
    setSending(false);
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-hidden bg-intra-bg-app sm:min-h-[calc(100dvh-7rem)] sm:rounded-[var(--intra-radius-sm)] sm:border sm:border-intra-border sm:bg-intra-card sm:shadow-[var(--intra-shadow-base)]">
      <div className="sticky top-0 z-10 border-b border-intra-border bg-intra-card/95 px-4 py-3 backdrop-blur sm:px-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/matches/${matchId}`}
            aria-label="Volver al detalle del match"
            className="intra-icon-button h-10 w-10 shrink-0"
          >
            <ArrowLeft className="intra-icon-body" aria-hidden="true" />
          </Link>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-intra-neutral-soft-alt intra-badge-text text-intra-blue">
            {otherUserInitials}
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="intra-h4 truncate">{otherUserName}</h1>
            <p className="intra-caption mt-0.5 truncate">
              {otherUserTyping
                ? "Está escribiendo..."
                : `${otherUserRoleLabel} · Match aceptado`}
            </p>
          </div>

          <details className="group relative shrink-0">
            <summary
              className="intra-icon-button h-10 w-10 cursor-pointer list-none [&::-webkit-details-marker]:hidden"
              aria-label="Opciones del chat"
            >
              <MoreVertical className="intra-icon-body" aria-hidden="true" />
            </summary>
            <div className="intra-popover-surface absolute right-0 top-12 z-20 w-60 space-y-2 p-2">
              <Link
                href={`/app/matches/${matchId}`}
                className="flex min-h-11 items-center justify-center rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-neutral-pill px-3 py-3 text-center intra-caption-strong text-intra-blue transition hover:bg-intra-bg-app"
              >
                Ver detalle del match
              </Link>
              <Link
                href={`/app/matches/${matchId}`}
                className="flex min-h-11 items-center justify-center rounded-[var(--intra-radius-xs)] border border-intra-warning-border bg-intra-warning-soft px-3 py-3 text-center intra-caption-strong text-intra-warning-text transition hover:bg-intra-warning-soft-alt"
              >
                Reportar Novedad
              </Link>
            </div>
          </details>
        </div>
      </div>

      <div
        ref={messagesViewportRef}
        onScroll={updateShouldStickToBottom}
        className="intra-chat-scrollbar flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:[&::-webkit-scrollbar-button]:h-0 lg:[&::-webkit-scrollbar-button]:w-0 lg:[&::-webkit-scrollbar-button]:hidden"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-60 items-center justify-center">
            <div className="intra-empty-state max-w-sm">
              <p className="intra-body-strong">Aún no hay mensajes.</p>
              <p className="intra-caption mt-1">Coordina por aquí la entrega.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              const read = isMessageRead(msg);

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%] sm:max-w-[75%]">
                    <div
                      className={`rounded-[var(--intra-radius-sm)] px-4 py-3 shadow-sm ${
                        isMine
                          ? "rounded-br-[var(--intra-radius-xs)] bg-intra-blue text-intra-card"
                          : "rounded-bl-[var(--intra-radius-xs)] border border-intra-border bg-intra-card text-intra-blue"
                      }`}
                    >
                      <p className={`intra-body whitespace-pre-wrap break-words ${isMine ? "text-intra-card" : "text-intra-blue"}`}>
                        {msg.message}
                      </p>

                      <div
                        suppressHydrationWarning
                        className={`intra-caption mt-2 flex items-center justify-end gap-2 ${
                          isMine ? "text-intra-card/70" : "text-intra-text-muted/70"
                        }`}
                      >
                        <span>{formatMessageTime(msg.created_at)}</span>
                        {isMine && read ? <span>Leído</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-intra-border bg-intra-card/95 px-3 py-3 backdrop-blur sm:px-5">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              sendTypingEvent();
            }}
            rows={1}
            className="intra-input max-h-36 min-h-11 flex-1 resize-none rounded-[var(--intra-radius-sm)]"
            placeholder="Escribe un mensaje..."
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="intra-btn intra-btn-primary min-h-11 shrink-0 rounded-[var(--intra-radius-sm)] px-4 sm:px-5"
          >
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
