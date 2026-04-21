"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "p. m." : "a. m.";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
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

export default function MatchChatClient({
  matchId,
  currentUserId,
  otherUserId,
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const channelReadyRef = useRef(false);
  const markingReadRef = useRef(false);
  const lastMarkedReadAtRef = useRef<string | null>(null);
  const readStateRef = useRef({
    lastReadByOwner,
    lastReadByTraveler,
  });

  const readColumn =
    viewerRole === "traveler"
      ? "last_read_by_traveler"
      : "last_read_by_owner";

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

      const { error } = await supabase
        .from("matches")
        .update({ [readColumn]: readAt })
        .eq("id", matchId);

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
      readColumn,
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

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
        console.log("MESSAGES CHANNEL:", status);

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
        title: "Nuevo mensaje",
        message: "Tienes un nuevo mensaje",
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
    <div className="flex flex-col gap-4">
      <div className="h-[500px] overflow-y-auto rounded-2xl border bg-white p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Aún no hay mensajes. Inicia la conversación.
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            const read = isMessageRead(msg);

            return (
              <div
                key={msg.id}
                className={`mb-3 flex ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-[75%]">
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      isMine
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {msg.message}
                    </p>

                    <p
                      suppressHydrationWarning
                      className={`mt-1 text-xs ${
                        isMine ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>

                  {isMine && read && (
                    <p className="mt-1 text-right text-xs text-green-600">
                      Leído
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {otherUserTyping && (
        <p className="text-sm text-slate-500">Escribiendo...</p>
      )}

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            sendTypingEvent();
          }}
          className="flex-1 rounded border p-2"
          placeholder="Escribe un mensaje..."
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
