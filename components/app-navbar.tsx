"use client";

import Link from "next/link";
import { NotificationsBell } from "@/components/notifications-bell";

export function AppNavbar() {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex gap-4">
        <Link className="underline" href="/app">
          Home
        </Link>

        <Link className="underline" href="/app/market">
          Market
        </Link>

        <Link className="underline" href="/app/profile">
          Perfil
        </Link>
      </div>

      <NotificationsBell />
    </div>
  );
}