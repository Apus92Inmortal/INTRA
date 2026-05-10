import Link from "next/link";
import type { ReactNode } from "react";
import { Briefcase, CircleDollarSign, Clock3, Route } from "lucide-react";
import { AppNavbar } from "@/components/app-navbar";
import { RatingSummaryBadge } from "@/components/rating-summary-badge";
import { TrackingCodeBadge } from "@/components/tracking-code-badge";
import WelcomeModal from "@/components/WelcomeModal";
import { formatRatingValue } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";
import { isSafeInternalPath } from "@/lib/safe-next";
import AuthGateway from "./AuthGateway";
import DashboardTripCloseButton from "./_components/dashboard/DashboardTripCloseButton";
import DashboardPendingMatchActions from "./_components/dashboard/DashboardPendingMatchActions";
import { getDashboardData } from "./_lib/dashboard-queries";
import type {
  DashboardActivityIcon,
  DashboardCompatibleShipmentCard,
  DashboardShipmentCard,
  DashboardTripCard,
} from "./_lib/dashboard-types";
import MatchButton from "./market/MatchButton";
import MarketRealtime from "./market/MarketRealtime";

type AppHomePageProps = {
  searchParams?: Promise<{
    tab?: string;
    error?: string;
    next?: string;
    view?: string;
  }>;
};

function getGreetingName(fullName: string | null, email: string | null) {
  const candidate = fullName?.trim() || email?.split("@")[0]?.trim() || "";
  const firstName = candidate.split(" ")[0]?.trim();
  return firstName || "";
}

function getActivityIcon(icon: DashboardActivityIcon) {
  switch (icon) {
    case "match":
      return {
        bgClassName: "bg-[#EFFBF4]",
        textClassName: "text-[#2ECC71]",
        svg: (
          <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ),
      };
    case "message":
      return {
        bgClassName: "bg-[#EEF2F7]",
        textClassName: "text-[#0B2C4A]",
        svg: (
          <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        ),
      };
    case "trip":
      return {
        bgClassName: "bg-[#EEF2F7]",
        textClassName: "text-[#0B2C4A]",
        svg: (
          <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    case "shipment":
      return {
        bgClassName: "bg-[#EEF2F7]",
        textClassName: "text-[#0B2C4A]",
        svg: (
          <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        ),
      };
    case "payment":
      return {
        bgClassName: "bg-[#EFFBF4]",
        textClassName: "text-[#2ECC71]",
        svg: (
          <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
        ),
      };
    case "alert":
      return {
        bgClassName: "bg-[#FFF4E5]",
        textClassName: "text-[#F39C12]",
        svg: (
          <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v4m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.65 18h16.7a1 1 0 00.86-1.5l-7.5-13a1 1 0 00-1.72 0z"
            />
          </svg>
        ),
      };
    default:
      return {
        bgClassName: "bg-[#EEF2F7]",
        textClassName: "text-[#0B2C4A]",
        svg: (
          <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6l4 2"
            />
          </svg>
        ),
      };
  }
}

function ShipmentBadge({ shipment }: { shipment: DashboardShipmentCard }) {
  if (shipment.hasPendingAction) {
    return (
      <span className="intra-pill whitespace-nowrap bg-yellow-100 text-yellow-700">
        Match pendiente
      </span>
    );
  }

  const classes =
    shipment.status === "in_transit"
      ? "bg-[#EFFBF4] text-[#1e8c4e]"
      : shipment.status === "accepted"
        ? "bg-[#EEF2F7] text-[#0B2C4A]"
        : shipment.status === "delivered"
          ? "bg-[#EFFBF4] text-[#1e8c4e]"
          : "bg-gray-100 text-gray-600";

  return (
    <span className={`intra-pill whitespace-nowrap ${classes}`}>
      {shipment.statusLabel}
    </span>
  );
}

function TripAvailabilityBadge({ trip }: { trip: DashboardTripCard }) {
  const classes =
    trip.status === "full"
      ? "bg-[#EEF2F7] text-[#0B2C4A]"
      : trip.status === "closed"
        ? "bg-slate-100 text-slate-600"
        : trip.status === "completed"
          ? "bg-[#EFFBF4] text-[#1e8c4e]"
          : trip.status === "cancelled"
            ? "bg-rose-100 text-rose-700"
            : "bg-[#EFFBF4] text-[#2ECC71]";

  return (
    <span className={`intra-pill px-2 py-0.5 text-[11px] sm:text-xs ${classes}`}>
      {trip.availabilityLabel}
    </span>
  );
}

function formatTripUsagePercent(usedCapacityKg: number, totalCapacityKg: number) {
  if (!totalCapacityKg || totalCapacityKg <= 0) {
    return "0% usado";
  }

  const rawPercent = (usedCapacityKg / totalCapacityKg) * 100;
  const roundedPercent = rawPercent < 1
    ? Math.round(rawPercent * 10) / 10
    : Math.round(rawPercent * 10) / 10;

  const label = Number.isInteger(roundedPercent)
    ? roundedPercent.toFixed(0)
    : roundedPercent.toFixed(1);

  return `${label}% usado`;
}

function DashboardShortcutCard({
  href,
  title,
  description,
  tone,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  tone: "green" | "blue";
  icon: ReactNode;
}) {
  const cardClassName =
    tone === "green"
      ? "bg-intra-green shadow-lg shadow-intra-green/20 hover:bg-intra-green-hover-app"
      : "bg-intra-blue hover:bg-[#123a5f]";

  const iconShellClassName =
    tone === "green" ? "bg-white/20 text-white" : "bg-white/10 text-intra-green";

  const descriptionClassName = tone === "green" ? "text-white/75" : "text-white/70";
  const arrowClassName = tone === "green" ? "text-white/60" : "text-white/40";

  return (
    <Link
      href={href}
      className={`group flex min-h-28 items-center gap-4 rounded-[var(--intra-radius-md)] p-4 text-left transition sm:p-5 ${cardClassName}`}
    >
      <div className={`intra-icon-shell-emphasis rounded-[var(--intra-radius-xs)] ${iconShellClassName}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="intra-h4 text-white">{title}</p>
        <p className={`mt-1 text-sm leading-snug ${descriptionClassName}`}>{description}</p>
      </div>
      <svg className={`ml-auto intra-icon-emphasis shrink-0 transition group-hover:translate-x-1 ${arrowClassName}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function DashboardStatCard({
  icon,
  value,
  label,
  accent = false,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={accent ? "intra-card-compact border-2 border-[#A3E4BF] p-4 ring-2 ring-[#EFFBF4]" : "intra-card-compact p-4"}
    >
      <div className="flex items-center gap-3">
        <div
          className={accent ? "intra-icon-shell-body rounded-lg bg-intra-green text-white" : "intra-icon-shell-body rounded-lg bg-intra-neutral-pill text-intra-blue"}
        >
          {icon}
        </div>
        <p className={accent ? "text-2xl font-extrabold leading-none text-intra-green" : "intra-metric text-[30px] leading-none"}>{value}</p>
        <p className="min-w-0 intra-caption">{label}</p>
      </div>
    </div>
  );
}

function EmptyCard({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="intra-card-compact border-dashed p-5">
      <p className="intra-h4">{title}</p>
      <p className="mt-1 intra-body">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="intra-btn intra-btn-primary mt-4"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

function getVisibleItems<T>(items: T[], expanded: boolean, limit = 3) {
  return expanded ? items : items.slice(0, limit);
}

function SectionToggleLink({
  href,
  label,
  tone = "green",
}: {
  href: string;
  label: string;
  tone?: "green" | "amber";
}) {
  const className =
    tone === "amber"
      ? "text-sm font-medium text-amber-900 hover:text-amber-950"
      : "intra-link text-intra-green hover:text-intra-green-hover-app hover:no-underline";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function CustomerRatingBadge({
  avgRating,
  totalReviews,
}: {
  avgRating: number | null;
  totalReviews: number;
}) {
  const formatted = formatRatingValue(avgRating);

  if (!formatted || totalReviews <= 0) {
    return (
      <span className="intra-pill gap-1 bg-[#FFF7E8] text-[#B7791F]">
        <span aria-hidden="true">⭐</span>
        <span>Sin calificaciones aún</span>
      </span>
    );
  }

  return <RatingSummaryBadge avgRating={avgRating} totalReviews={totalReviews} />;
}

function CompactCompatibleShipmentCard({
  shipment,
}: {
  shipment: DashboardCompatibleShipmentCard;
}) {
  return (
    <div className="intra-card-compact p-4">
      <div className="relative sm:flex sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 pr-24 sm:pr-0">
          <p className="intra-h4">{shipment.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 intra-body">
            <span>Cliente: {shipment.customerName}</span>
          </div>
          <p className="mt-1 intra-body">
            <span className="intra-body-strong">Ruta:</span> {shipment.routeLabel}
          </p>
          {shipment.description ? (
            <p className="mt-2 line-clamp-2 intra-body">
              <span className="intra-body-strong">Descripción:</span> {shipment.description}
            </p>
          ) : null}
          <div className="mt-3">
            <CustomerRatingBadge
              avgRating={shipment.customerAvgRating}
              totalReviews={shipment.customerTotalReviews}
            />
          </div>
        </div>

        <div className="absolute right-0 top-0 sm:static sm:flex sm:shrink-0 sm:justify-end">
          <span className="intra-pill bg-intra-neutral-pill text-intra-blue">
            Peso: {shipment.weightLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 sm:justify-end">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#D8F3E3] bg-[#EFFBF4] px-3 py-2 shadow-[0_10px_30px_-22px_rgba(46,204,113,0.9)] sm:flex-none">
          <span className="intra-icon-shell-body rounded-full bg-white text-[#2ECC71]">
            <CircleDollarSign className="intra-icon-body" />
          </span>
          <div className="flex min-w-0 items-center gap-2 text-left">
            <span className="hidden whitespace-nowrap text-sm font-semibold text-[#1E8C4E] sm:inline">
              Ganancia
            </span>
            <p className="text-base font-bold leading-none text-[#119C57] sm:text-lg">
              {shipment.travelerEarningsLabel ?? "Por confirmar"}
            </p>
          </div>
        </div>
        {shipment.matchingTripId ? <MatchButton shipmentId={shipment.id} tripId={shipment.matchingTripId} /> : null}
      </div>
    </div>
  );
}

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const tab = resolvedSearchParams?.tab === "register" ? "register" : "login";
    const nextPath = isSafeInternalPath(resolvedSearchParams?.next)
      ? resolvedSearchParams.next
      : null;

    return (
      <AuthGateway
        initialTab={tab}
        initialError={resolvedSearchParams?.error ?? null}
        nextPath={nextPath}
      />
    );
  }

  const dashboard = await getDashboardData();

  if (!dashboard) {
    throw new Error("No pudimos cargar tu dashboard en este momento.");
  }

  const greetingName = getGreetingName(dashboard.user.fullName, dashboard.user.email);
  const activeView = resolvedSearchParams?.view ?? "";
  const showAllPendingPayments = activeView === "pending-payments";
  const showAllCompatibleShipments = activeView === "compatible-shipments";
  const revenueMonthName = new Intl.DateTimeFormat("es-CO", { month: "long" }).format(new Date());
  const revenueTitle = `Ganancias de ${revenueMonthName}`;
  const hasMonthlyRevenue = dashboard.monthlyRevenue.releasedAmount > 0;

  const pendingPaymentItems = getVisibleItems(
    dashboard.pendingPaymentShipments,
    showAllPendingPayments
  );
  const compatibleShipmentItems = getVisibleItems(
    dashboard.compatibleShipments,
    showAllCompatibleShipments
  );

  return (
    <>
      <AppNavbar />
      <MarketRealtime currentUserId={dashboard.user.id} />

      <WelcomeModal
        userId={dashboard.user.id}
        initialOpen={dashboard.user.showWelcomeModal}
      />

      <main className="intra-page-shell">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
          <div>
            <h1 className="intra-h1">
              {greetingName ? `Hola, ${greetingName}` : "Hola"}
            </h1>
            <p className="mt-1 intra-body">Resumen de tu actividad</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DashboardShortcutCard
              href="/app/shipments/new"
              title="Crear envío"
              description="Publica un paquete para que un viajero lo lleve"
              tone="green"
              icon={(
                <svg className="intra-icon-emphasis" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
            />

            <DashboardShortcutCard
              href="/app/trips/new"
              title="Publicar viaje"
              description="Gana dinero con tu próximo viaje llevando paquetes"
              tone="blue"
              icon={(
                <svg className="intra-icon-emphasis" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DashboardStatCard
              value={dashboard.summary.activeShipmentsCount}
              label="Envíos activos"
              icon={(
                <svg className="intra-icon-body text-intra-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
              )}
            />

            <DashboardStatCard
              value={dashboard.summary.publishedTripsCount}
              label="Viajes publicados"
              icon={<Route className="intra-icon-body text-intra-blue" />}
            />

            <DashboardStatCard
              accent
              value={dashboard.summary.pendingActionMatchesCount}
              label="Matches pendientes"
              icon={<Clock3 className="intra-icon-body" />}
            />

            <DashboardStatCard
              value={dashboard.summary.completedDeliveriesCount}
              label="Entregas completadas"
              icon={(
                <svg className="intra-icon-body text-intra-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0" />
                  </svg>
              )}
            />
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <section id="mis-envios" className="space-y-4">
                <div>
                  <h2 className="intra-h3">Mis envíos activos</h2>
                </div>

                {dashboard.pendingPaymentShipments.length > 0 ? (
                  <div id="pendientes-de-pago" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-amber-900">Pendientes de pago</h3>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Requiere acción
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-amber-800/80">
                          Completa el checkout para activar estos envíos y empezar a recibir matches.
                        </p>
                      </div>
                      {dashboard.pendingPaymentShipments.length > 3 ? (
                        <SectionToggleLink
                          href={showAllPendingPayments ? "/app#pendientes-de-pago" : "/app?view=pending-payments#pendientes-de-pago"}
                          label={showAllPendingPayments ? "Ver menos" : "Ver todos"}
                          tone="amber"
                        />
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      {pendingPaymentItems.map((shipment) => (
                        <div key={shipment.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                  {shipment.paymentLabel}
                                </span>
                                <TrackingCodeBadge code={shipment.code} className="bg-amber-700" />
                              </div>
                              <p className="font-semibold text-[#0B2C4A]">{shipment.title}</p>
                              <p className="mt-0.5 text-sm text-slate-600">{shipment.routeLabel}</p>
                            </div>

                            <div className="flex flex-col items-start gap-3 sm:items-end">
                              <span className="text-lg font-bold text-[#0B2C4A]">{shipment.amountLabel}</span>
                              <Link
                                href={shipment.checkoutHref}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                              >
                                Ir al checkout
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {dashboard.activeShipments.length === 0 ? (
                  <EmptyCard
                    title="Aún no tienes envíos activos"
                    description="Crea tu envío para recibir matches y hacer seguimiento aquí."
                    ctaHref="/app/shipments/new"
                    ctaLabel="Crear envío"
                  />
                ) : (
                  <div className="space-y-3">
                    {dashboard.activeShipments.map((shipment) => (
                      <div key={shipment.id} className="rounded-2xl border border-gray-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <ShipmentBadge shipment={shipment} />
                              <TrackingCodeBadge code={shipment.code} />
                            </div>
                            <p className="truncate font-semibold text-[#0B2C4A]">{shipment.title}</p>
                            <p className="mt-0.5 text-sm text-gray-500">{shipment.routeLabel}</p>
                          </div>
                          <span className="ml-3 shrink-0 text-lg font-bold text-[#0B2C4A]">
                            {shipment.amountLabel}
                          </span>
                        </div>

                        {shipment.hasPendingAction && shipment.pendingMatchId ? (
                          <div className="rounded-xl bg-yellow-50 p-3 sm:p-4">
                            <div className="mb-3 flex items-start gap-3">
                              <div className="intra-icon-shell-body mt-0.5 rounded-full bg-yellow-100 text-yellow-600">
                                <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#0B2C4A]">
                                  {shipment.travelerName ?? "Un viajero"} quiere transportar tu envío
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {shipment.travelerDepartureLabel ?? "Salida pendiente de confirmar"}
                                  {shipment.travelerRatingLabel ? ` · ${shipment.travelerRatingLabel}` : ""}
                                </p>
                              </div>
                            </div>
                            <DashboardPendingMatchActions matchId={shipment.pendingMatchId} />
                          </div>
                        ) : shipment.travelerName ? (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-[#2ECC71]"
                                  style={{ width: `${shipment.progressPercent}%` }}
                                />
                              </div>
                              <span className="whitespace-nowrap text-xs text-gray-400">
                                {shipment.progressPercent}%
                              </span>
                            </div>
                            <div className="mt-3 flex flex-col gap-3 border-t border-gray-50 pt-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EFFBF4] text-[10px] font-bold text-[#2ECC71]">
                                  {shipment.travelerName.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-600">{shipment.travelerName}</span>
                              </div>
                              <Link href="/app/matches" className="inline-flex min-h-11 items-center text-sm font-medium text-[#2ECC71] hover:text-[#27ae60]">
                                Ver detalles
                              </Link>
                            </div>
                          </>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gray-200"
                                style={{ width: `${shipment.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{shipment.progressLabel}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div id="envios-compatibles" className="space-y-3 rounded-2xl border border-gray-100 bg-[#F8FAFC] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#0B2C4A]">Envíos compatibles con mis viajes</h3>
                    </div>
                    {dashboard.compatibleShipments.length > 3 ? (
                      <SectionToggleLink
                        href={showAllCompatibleShipments ? "/app#envios-compatibles" : "/app?view=compatible-shipments#envios-compatibles"}
                        label={showAllCompatibleShipments ? "Ver menos" : "Ver todos"}
                      />
                    ) : null}
                  </div>

                  {dashboard.compatibleShipments.length === 0 ? (
                    <EmptyCard
                      title="Sin envíos compatibles por ahora"
                      description="Mantén tu viaje activo o publica otra ruta para recibir nuevas oportunidades."
                      ctaHref="/app/trips/new"
                      ctaLabel="Publicar viaje"
                    />
                  ) : (
                    <div className="space-y-3">
                      {compatibleShipmentItems.map((shipment) => (
                        <CompactCompatibleShipmentCard key={shipment.id} shipment={shipment} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <section id="mis-viajes" className="space-y-4">
                <div className="mb-3">
                  <h2 className="text-lg font-bold text-[#0B2C4A]">Mis viajes</h2>
                </div>

                {dashboard.publishedTrips.length === 0 ? (
                  <EmptyCard
                    title="Aún no tienes viajes publicados"
                    description="Publica tu próximo viaje para recibir paquetes compatibles con tu Ruta."
                    ctaHref="/app/trips/new"
                    ctaLabel="Publicar viaje"
                  />
                ) : (
                  <div className="space-y-3">
                    {dashboard.publishedTrips.map((trip) => (
                      <div key={trip.id} className="rounded-[22px] border border-gray-100 bg-white px-3 py-2.5 shadow-[0_18px_45px_-35px_rgba(11,44,74,0.28)] transition hover:-translate-y-0.5 hover:shadow-lg sm:px-5">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F2FBF6]">
                              <svg className="h-[25px] w-[25px] text-[#2ECC71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <p className="text-[15px] font-bold tracking-[-0.02em] text-[#0B2C4A] sm:text-base">{trip.routeShortLabel}</p>
                                <TripAvailabilityBadge trip={trip} />
                              </div>
                              <div className="mt-0.5 flex flex-nowrap items-center gap-x-1 text-[11px] leading-none text-slate-400 sm:gap-x-1.5 sm:text-xs">
                                <span className="whitespace-nowrap">{trip.departureDateLabel}</span>
                                <span aria-hidden="true" className="shrink-0">·</span>
                                <div className="flex shrink-0 items-center gap-0.5">
                                  <Briefcase className="intra-icon-compact text-slate-400" />
                                  <span className="whitespace-nowrap">{formatTripUsagePercent(trip.usedCapacityKg, trip.totalCapacityKg)}</span>
                                </div>
                                <span
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 rounded-full border border-slate-200"
                                  style={{
                                    background: `conic-gradient(#2ECC71 ${trip.progressPercent}%, #E5E7EB ${trip.progressPercent}% 100%)`,
                                  }}
                                >
                                  <span className="m-[2px] block h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-full bg-white" />
                                </span>
                              </div>
                            </div>
                          </div>

                          {(trip.status === "open" || trip.status === "full") ? (
                            <DashboardTripCloseButton tripId={trip.id} />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </section>

              <div>
                <h2 className="mb-3 text-lg font-bold text-[#0B2C4A]">Actividad reciente</h2>
                {dashboard.recentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500">
                    <div className="flex items-center gap-2 font-semibold text-[#0B2C4A]">
                      <span className="intra-icon-shell-body rounded-full bg-[#EEF2F7] text-[#0B2C4A]">
                        <svg className="intra-icon-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </span>
                      <p>Sin novedades</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Link
                        href="/app/shipments/new"
                        className="inline-flex items-center justify-center rounded-xl bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#27ae60]"
                      >
                        Publicar envío
                      </Link>
                      <Link
                        href="/app/trips/new"
                        className="inline-flex items-center justify-center rounded-xl border border-[#0B2C4A]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0B2C4A] transition hover:bg-gray-50"
                      >
                        Publicar viaje
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white">
                    {dashboard.recentActivity.map((item) => {
                      const icon = getActivityIcon(item.icon);
                      const content = (
                        <div className="flex items-start gap-3 p-3.5">
                          <div className={`intra-icon-shell-body mt-0.5 rounded-full ${icon.bgClassName} ${icon.textClassName}`}>
                            {icon.svg}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-[#0B2C4A]">{item.title}</p>
                            <p className="mt-0.5 text-xs text-gray-400">{item.relativeTimeLabel}</p>
                          </div>
                        </div>
                      );

                      return item.href ? (
                        <Link key={item.id} href={item.href} className="block transition hover:bg-gray-50">
                          {content}
                        </Link>
                      ) : (
                        <div key={item.id}>{content}</div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-[var(--intra-radius-md)] border border-white/10 bg-[linear-gradient(145deg,#0B2C4A_0%,#103656_58%,#123d61_100%)] p-5 text-white shadow-[0_18px_48px_rgba(11,44,74,0.18)]">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white/68">{revenueTitle}</p>
                    <p className="mt-3 text-3xl font-bold tracking-[-0.03em]">{dashboard.monthlyRevenue.releasedAmountLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-white/74">
                      {hasMonthlyRevenue
                        ? (dashboard.monthlyRevenue.deltaVsPreviousMonthLabel ?? dashboard.monthlyRevenue.monthLabel)
                        : "Aún no tienes entregas finalizadas este mes"}
                    </p>
                  </div>

                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#BEE8CD]/28 bg-[#EFFBF4] text-lg font-bold text-[#2ECC71] shadow-[0_10px_24px_rgba(46,204,113,0.18)]">
                    $
                  </span>
                </div>

                <div className="grid grid-cols-3 rounded-[20px] border border-white/10 bg-white/7 backdrop-blur-sm">
                  <div className="px-3 py-3 sm:px-4">
                    <p className="text-[11px] font-medium text-white/55 sm:text-xs">Entregas</p>
                    <p className="mt-1 text-sm font-semibold text-white sm:text-base">{dashboard.monthlyRevenue.deliveriesCount}</p>
                  </div>
                  <div className="border-l border-white/10 px-3 py-3 sm:px-4">
                    <p className="text-[11px] font-medium text-white/55 sm:text-xs">Promedio</p>
                    <p className="mt-1 text-sm font-semibold text-white sm:text-base">{dashboard.monthlyRevenue.averageTicketLabel}</p>
                  </div>
                  <div className="border-l border-white/10 px-3 py-3 sm:px-4">
                    <p className="text-[11px] font-medium text-white/55 sm:text-xs">Mejor ruta</p>
                    <p className="mt-1 text-sm font-semibold text-white sm:text-base">{dashboard.monthlyRevenue.bestRouteLabel || "Sin datos"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
