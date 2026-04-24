"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Menu, MessageSquareText, Package, User, X } from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";

export function AppNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/app", label: "Inicio", mobileLabel: "Inicio", icon: Home },
    { href: "/app/market", label: "Market", mobileLabel: "Market", icon: Package },
    { href: "/app/matches", label: "Matches", mobileLabel: "Matches y chat", icon: MessageSquareText },
    { href: "/app/profile", label: "Perfil", mobileLabel: "Perfil", icon: User },
  ];

  const isActiveLink = (href: string) =>
    pathname === href || (href !== "/app" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/app" className="flex min-w-0 items-center rounded-2xl p-1">
          <Image
            src="/logoshort.png"
            alt="INTRA logo"
            width={320}
            height={96}
            className="h-[6.25rem] w-auto object-contain sm:h-9"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const isActive = isActiveLink(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
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

        <div className="flex items-center gap-2">
          <NotificationsBell />

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#0B2C4A] transition hover:bg-gray-50 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <nav className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-4">
            {links.map((link) => {
              const isActive = isActiveLink(link.href);
              const Icon = link.icon;

              return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  isActive
                      ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.mobileLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
