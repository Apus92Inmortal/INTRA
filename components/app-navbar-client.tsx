"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Menu, MessageSquareText, Package, User, X } from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";

export type AppNavbarContext = {
  hasSession: boolean;
  fullName: string | null;
  activeShipmentsCount: number;
  publishedTripsCount: number;
  pendingMatchesCount: number;
};

type QuickAction = {
  href: string;
  label: string;
  variant: "primary" | "secondary";
};

type NavLink = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: typeof Home;
};

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getFirstName(fullName: string | null) {
  const candidate = fullName?.trim() ?? "";
  return candidate.split(" ")[0]?.trim() ?? "";
}

function getDesktopActionClassName(variant: QuickAction["variant"]) {
  return variant === "primary"
    ? "bg-[#2ECC71] text-white hover:bg-[#27ae60]"
    : "border border-gray-200 bg-white text-[#0B2C4A] hover:bg-gray-50";
}

function getMobileActionClassName(variant: QuickAction["variant"]) {
  return variant === "primary"
    ? "bg-[#2ECC71] text-white hover:bg-[#27ae60]"
    : "border border-gray-200 bg-white text-[#0B2C4A] hover:bg-gray-50";
}

function getQuickActions(
  pathname: string,
  context: AppNavbarContext
): QuickAction[] {
  if (!context.hasSession) {
    return [
      { href: "/login", label: "Iniciar sesión", variant: "secondary" },
      { href: "/register", label: "Registrarse", variant: "primary" },
    ];
  }

  const actions: QuickAction[] = [];
  const onMatches = pathname.startsWith("/app/matches");
  const onMarket = pathname.startsWith("/app/market");
  const onShipmentCreate = pathname.startsWith("/app/shipments/new");
  const onTripCreate = pathname.startsWith("/app/trips/new");

  if (context.pendingMatchesCount > 0 && !onMatches) {
    actions.push({
      href: "/app/matches",
      label:
        context.pendingMatchesCount === 1
          ? "Revisar 1 match"
          : `Revisar ${context.pendingMatchesCount} matches`,
      variant: "primary",
    });
  }

  if (context.activeShipmentsCount === 0 && !onShipmentCreate) {
    actions.push({
      href: "/app/shipments/new",
      label: "Crear envío",
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (context.publishedTripsCount === 0 && !onTripCreate) {
    actions.push({
      href: "/app/trips/new",
      label: "Publicar viaje",
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (actions.length === 0 && context.activeShipmentsCount > 0 && !onMarket) {
    actions.push({
      href: "/app/market",
      label: "Ver market",
      variant: "secondary",
    });
  }

  if (actions.length < 2 && !onShipmentCreate) {
    actions.push({
      href: "/app/shipments/new",
      label: "Crear envío",
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (actions.length < 2 && !onTripCreate) {
    actions.push({
      href: "/app/trips/new",
      label: "Publicar viaje",
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  return actions
    .filter((action, index, all) => all.findIndex((candidate) => candidate.href === action.href) === index)
    .slice(0, 2);
}

function getSessionSummary(context: AppNavbarContext) {
  if (!context.hasSession) {
    return "Entra para publicar envíos, ofrecer viajes y chatear con tus matches.";
  }

  const parts: string[] = [];

  if (context.activeShipmentsCount > 0) {
    parts.push(pluralize(context.activeShipmentsCount, "envío activo", "envíos activos"));
  }

  if (context.publishedTripsCount > 0) {
    parts.push(pluralize(context.publishedTripsCount, "viaje publicado", "viajes publicados"));
  }

  if (context.pendingMatchesCount > 0) {
    parts.push(pluralize(context.pendingMatchesCount, "match por revisar", "matches por revisar"));
  }

  if (parts.length === 0) {
    return "Todavía no tienes actividad. Puedes empezar creando un envío o publicando un viaje.";
  }

  const firstName = getFirstName(context.fullName);
  const prefix = firstName ? `Hola, ${firstName}. ` : "";
  return `${prefix}${parts.join(" · ")}`;
}

export function AppNavbarClient({ context }: { context: AppNavbarContext }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo<NavLink[]>(() => {
    if (!context.hasSession) {
      return [];
    }

    return [
      { href: "/app", label: "Inicio", mobileLabel: "Inicio", icon: Home },
      { href: "/app/market", label: "Market", mobileLabel: "Market", icon: Package },
      {
        href: "/app/matches",
        label: "Matches",
        mobileLabel: "Matches y chat",
        icon: MessageSquareText,
      },
      { href: "/app/profile", label: "Perfil", mobileLabel: "Perfil", icon: User },
    ];
  }, [context.hasSession]);

  const quickActions = useMemo(
    () => getQuickActions(pathname, context),
    [context, pathname]
  );
  const summary = useMemo(() => getSessionSummary(context), [context]);

  const isActiveLink = (href: string) =>
    pathname === href || (href !== "/app" && pathname.startsWith(href));

  const pendingBadge = context.pendingMatchesCount > 9 ? "9+" : String(context.pendingMatchesCount);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={context.hasSession ? "/app" : "/"} className="flex min-w-0 items-center rounded-2xl">
          <Image
            src="/logoshort.png"
            alt="INTRA logo"
            width={320}
            height={96}
            className="h-27 w-[4.5rem] object-cover object-center sm:h-9 sm:w-auto sm:object-contain"
            priority
          />
        </Link>

        {context.hasSession ? (
          <nav className="hidden items-center gap-2 md:flex">
            {links.map((link) => {
              const isActive = isActiveLink(link.href);
              const showPending = link.href === "/app/matches" && context.pendingMatchesCount > 0;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#0B2C4A] text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-[#0B2C4A]"
                  }`}
                >
                  <span>{link.label}</span>
                  {showPending ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isActive ? "bg-white/20 text-white" : "bg-[#EFFBF4] text-[#1e8c4e]"
                      }`}
                    >
                      {pendingBadge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${getDesktopActionClassName(
                  action.variant
                )}`}
              >
                {action.label}
              </Link>
            ))}
          </div>

          {context.hasSession ? <NotificationsBell /> : null}

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
          <div className="mx-auto max-w-6xl px-4 py-4">
            {context.hasSession ? (
              <nav className="grid grid-cols-2 gap-3">
                {links.map((link) => {
                  const isActive = isActiveLink(link.href);
                  const Icon = link.icon;
                  const showPending =
                    link.href === "/app/matches" && context.pendingMatchesCount > 0;

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
                      <span className="flex-1">{link.mobileLabel}</span>
                      {showPending ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isActive ? "bg-white/20 text-white" : "bg-[#EFFBF4] text-[#1e8c4e]"
                          }`}
                        >
                          {pendingBadge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            {quickActions.length > 0 ? (
              <div className={`grid gap-3 ${context.hasSession ? "mt-4" : "grid-cols-2"}`}>
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => setMobileOpen(false)}
                    className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${getMobileActionClassName(
                      action.variant
                    )}`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}

            <p className="mt-4 rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm leading-6 text-slate-600">
              {summary}
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
