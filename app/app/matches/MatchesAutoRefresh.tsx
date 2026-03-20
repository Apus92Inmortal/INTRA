"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MatchesAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const handleFocus = () => {
      router.refresh();
    };

    const interval = setInterval(() => {
      router.refresh();
    }, 60000); // fallback cada 60s

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [router]);

  return null;
}