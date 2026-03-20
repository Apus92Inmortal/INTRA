"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MatchesAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}