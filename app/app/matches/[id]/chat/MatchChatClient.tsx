"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  for (const msg of prev) map.set(msg.id, msg);
  for (const msg of incoming) map.set(msg.id, msg);

  return sortMessages(Array.from(map.values()));
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
  const [mounted, setMounted] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [readState, setReadState] = useState({
    lastReadByOwner,
    lastReadByTraveler,
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const channelReadyRef = useRef(false);

  // 🔥 NUEVOS REFS
  const markingReadRef = useRef(false);
  const lastMarkedReadAtRef = useRef<string | null>(null);

  const readColumn =
    viewerRole === "traveler"
      ? "last_read_by_traveler"
      : "last_read_by_owner";

  useEffect(() => {
    setReadState({
      lastReadByOwner,
      lastReadByTraveler,
    });
  }, [lastReadByOwner, lastReadByTraveler]);

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

  function sendReadReceipt(readAt: string) {
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
  }

  async function markIncomingMessageAsRead(readAt: string) {
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

    if (!error) {
      setReadState((prev) => ({
        ...prev,
        ...(viewerRole === "owner"
          ? { lastReadByOwner: readAt }
          : { lastReadByTraveler: readAt }),
      }));

      lastMarkedReadAtRef.current = readAt;
      sendReadReceipt(readAt);
    }

    markingReadRef.current = false;
  }

  async function markAsReadNow() {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("matches")
      .update({ [readColumn]: now })
      .eq("id", matchId);

    if (!error) {
      setReadState((prev) => ({
        ...prev,
        ...(viewerRole === "owner"
          ? { lastReadByOwner: now }
          : { lastReadByTraveler: now }),
      }));

      sendReadReceipt(now);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let isActive = true;

    const channel = supabase.channel(`messages-${matchId}`);
    messagesChannelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const incoming = payload.new as Message;

          setMessages((prev) => mergeMessages(prev, [incoming]));

          if (incoming.sender_id !== currentUserId) {
            if (isActive) {
              await markIncomingMessageAsRead(incoming.created_at);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setChannelReady(true);
          markAsReadNow();
        }
      });

    return () => {
      isActive = false;
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
      }
    };
  }, [matchId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: currentUserId,
        message: newMessage,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) => mergeMessages(prev, [data]));
    }

    setNewMessage("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;

          return (
            <div
              key={msg.id}
              className={`max-w-xs ${
                isMine ? "ml-auto text-right" : "mr-auto text-left"
              }`}
            >
              <div className="bg-slate-100 rounded-xl p-2">
                <p>{msg.message}</p>
              </div>
              <p className="text-xs text-gray-400">
                {mounted ? formatMessageTime(msg.created_at) : ""}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2 p-4">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border rounded p-2"
        />
        <button className="bg-blue-500 text-white px-4 rounded">
          Enviar
        </button>
      </form>
    </div>
  );
}