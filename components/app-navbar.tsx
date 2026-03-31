"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NotificationsBell } from "@/components/notifications-bell";

export function AppNavbar() {
  const pathname = usePathname();

  const links = [
    { href: "/app", label: "Inicio" },
    { href: "/app/market", label: "Market" },
{ href: "/app/matches", label: "Matches" },
    { href: "/app/profile", label: "Perfil" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* LOGO */}
        <Link href="/app" className="flex items-center p-1">
          <Image
            src="/logoshort.png"
            alt="INTRA logo"
            width={180}
            height={180}
            className="object-contain transition hover:scale-105"
          />
        </Link>

        {/* LINKS */}
        <nav className="hidden md:flex items-center gap-2">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/app" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#0B2C4A] text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-[#0B2C4A]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* DERECHA */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-1 hover:bg-gray-100 transition">
            <NotificationsBell />
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="border-t border-gray-100 bg-white md:hidden">
        <nav className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/app" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#0B2C4A] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}