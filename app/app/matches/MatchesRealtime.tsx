"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MatchesRealtime() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("matches-realtime")

      // 👇 ESCUCHA MENSAJES NUEVOS
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          console.log("📩 Nuevo mensaje detectado");
          router.refresh();
        }
      )

      // 👇 ESCUCHA CAMBIOS EN MATCHES
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          console.log("🤝 Cambio en match detectado");
          router.refresh();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  return null;
}