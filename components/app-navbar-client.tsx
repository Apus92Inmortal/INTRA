"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CreditCard, Home, LogIn, Menu, MessageSquareText, PackagePlus, PlaneTakeoff, Shield, User, UserPlus, X } from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";

export type AppNavbarContext = {
  hasSession: boolean;
  isAdmin: boolean;
  fullName: string | null;
  activeShipmentsCount: number;
  publishedTripsCount: number;
  pendingMatchesCount: number;
};

type QuickAction = {
  href: string;
  label: string;
  icon: typeof Home;
  variant: "primary" | "secondary";
};

type NavLink = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: typeof Home;
};

function getDesktopActionClassName(variant: QuickAction["variant"]) {
  return variant === "primary"
    ? "bg-intra-green text-intra-card hover:bg-intra-green-hover-app"
    : "border border-intra-border-soft bg-intra-card text-intra-blue hover:bg-intra-bg-app";
}

function getMobileActionClassName(variant: QuickAction["variant"]) {
  return variant === "primary"
    ? "bg-intra-green text-intra-card hover:bg-intra-green-hover-app"
    : "border border-intra-border-soft bg-intra-card text-intra-blue hover:bg-intra-bg-app";
}

function getQuickActions(
  pathname: string,
  context: AppNavbarContext
): QuickAction[] {
  if (!context.hasSession) {
    return [
      { href: "/login", label: "Iniciar sesión", icon: LogIn, variant: "secondary" },
      { href: "/register", label: "Registrarse", icon: UserPlus, variant: "primary" },
    ];
  }

  const actions: QuickAction[] = [];
  const onMatches = pathname.startsWith("/app/matches");
  const onHome = pathname === "/app";
  const onShipmentCreate = pathname.startsWith("/app/shipments/new");
  const onTripCreate = pathname.startsWith("/app/trips/new");

  if (context.pendingMatchesCount > 0 && !onMatches) {
    actions.push({
      href: "/app/matches",
      label:
        context.pendingMatchesCount === 1
          ? "Revisar 1 match"
          : `Revisar ${context.pendingMatchesCount} matches`,
      icon: MessageSquareText,
      variant: "primary",
    });
  }

  if (context.activeShipmentsCount === 0 && !onShipmentCreate) {
    actions.push({
      href: "/app/shipments/new",
      label: "Crear envío",
      icon: PackagePlus,
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (context.publishedTripsCount === 0 && !onTripCreate) {
    actions.push({
      href: "/app/trips/new",
      label: "Publicar viaje",
      icon: PlaneTakeoff,
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (actions.length === 0 && context.activeShipmentsCount > 0 && !onHome) {
    actions.push({
      href: "/app",
      label: "Volver a inicio",
      icon: Home,
      variant: "secondary",
    });
  }

  if (actions.length < 2 && !onShipmentCreate) {
    actions.push({
      href: "/app/shipments/new",
      label: "Crear envío",
      icon: PackagePlus,
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (actions.length < 2 && !onTripCreate) {
    actions.push({
      href: "/app/trips/new",
      label: "Publicar viaje",
      icon: PlaneTakeoff,
      variant: actions.length === 0 ? "primary" : "secondary",
    });
  }

  return actions
    .filter((action, index, all) => all.findIndex((candidate) => candidate.href === action.href) === index)
    .slice(0, 2);
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
      {
        href: "/app/matches",
        label: "Matches",
        mobileLabel: "Matches",
        icon: MessageSquareText,
      },
      {
        href: "/app/wallet",
        label: "Wallet",
        mobileLabel: "Wallet",
        icon: CreditCard,
      },
      {
        href: "/app/admin",
        label: "Admin",
        mobileLabel: "Admin",
        icon: Shield,
      },
      { href: "/app/profile", label: "Perfil", mobileLabel: "Perfil", icon: User },
    ];
  }, [context.hasSession]);

  const visibleLinks = useMemo(
    () => links.filter((link) => (link.href === "/app/admin" ? context.isAdmin : true)),
    [context.isAdmin, links]
  );

  const quickActions = useMemo(
    () => getQuickActions(pathname, context),
    [context, pathname]
  );

  const isActiveLink = (href: string) =>
    pathname === href || (href !== "/app" && pathname.startsWith(href));

  const pendingBadge = context.pendingMatchesCount > 9 ? "9+" : String(context.pendingMatchesCount);

  return (
    <header className="sticky top-0 z-40 border-b border-intra-border-soft bg-intra-card/95 backdrop-blur supports-[backdrop-filter]:bg-intra-card/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={context.hasSession ? "/app" : "/"} className="flex min-w-0 items-center rounded-[var(--intra-radius-xs)]">
          <Image
            src="/logoshort.png"
            alt="INTRA logo"
            width={320}
            height={96}
            className="h-27 w-[4.5rem] object-cover object-center sm:h-27 sm:w-auto sm:object-contain"
            priority
          />
        </Link>

        {context.hasSession ? (
          <nav className="hidden items-center gap-2 md:flex">
            {visibleLinks.map((link) => {
              const isActive = isActiveLink(link.href);
              const showPending = link.href === "/app/matches" && context.pendingMatchesCount > 0;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--intra-radius-xs)] px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-intra-blue text-intra-card"
                      : "text-intra-text-subtle hover:bg-intra-bg-app hover:text-intra-blue"
                  }`}
                >
                  <span>{link.label}</span>
                  {showPending ? (
                    <span
                      className={`intra-badge min-w-[1.5rem] justify-center px-2 py-0.5 text-[11px] ${
                        isActive ? "bg-intra-card/20 text-intra-card" : "bg-intra-success-soft text-intra-text-success"
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
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`intra-btn px-4 py-2.5 text-sm ${getDesktopActionClassName(
                    action.variant
                  )}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {action.label}
                </Link>
              );
            })}
          </div>

          {context.hasSession ? <NotificationsBell /> : null}

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="intra-icon-button md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-intra-border-soft bg-intra-card shadow-[0_18px_44px_rgba(11,44,74,0.14)] md:hidden">
          <div className="mx-auto max-w-6xl px-4 py-4">
            {context.hasSession ? (
              <nav className="grid grid-cols-2 gap-3">
                {visibleLinks.map((link) => {
                  const isActive = isActiveLink(link.href);
                  const Icon = link.icon;
                  const showPending =
                    link.href === "/app/matches" && context.pendingMatchesCount > 0;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex min-h-11 items-center gap-3 rounded-[var(--intra-radius-xs)] border px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? "border-intra-blue bg-intra-blue text-intra-card"
                          : "border-intra-border-soft bg-intra-card text-intra-text-subtle hover:bg-intra-bg-app"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{link.mobileLabel}</span>
                      {showPending ? (
                        <span
                          className={`intra-badge min-w-[1.5rem] justify-center px-2 py-0.5 text-[11px] ${
                            isActive ? "bg-intra-card/20 text-intra-card" : "bg-intra-success-soft text-intra-text-success"
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
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => setMobileOpen(false)}
                      className={`intra-btn px-4 py-3 text-sm ${getMobileActionClassName(
                        action.variant
                      )}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}

          </div>
        </div>
      ) : null}
    </header>
  );
}
