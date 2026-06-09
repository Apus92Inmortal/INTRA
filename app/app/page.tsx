import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Plane,
  Route,
  ShieldCheck,
  Star,
  UserCheck,
} from "lucide-react";
import { AppNavbar } from "@/components/app-navbar";
import { EvidenceImagePreview } from "@/components/evidence-image-preview";
import { RatingSummaryBadge } from "@/components/rating-summary-badge";
import { TrackingCodeBadge } from "@/components/tracking-code-badge";
import WelcomeModal from "@/components/WelcomeModal";
import { formatRatingValue } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";
import { isSafeInternalPath } from "@/lib/safe-next";
import AuthGateway from "./AuthGateway";
import DashboardTripCloseButton from "./_components/dashboard/DashboardTripCloseButton";
import DashboardPendingMatchActions from "./_components/dashboard/DashboardPendingMatchActions";
import DashboardPublishedTimeLabel from "./_components/dashboard/DashboardPublishedTimeLabel";
import { getDashboardData } from "./_lib/dashboard-queries";
import type {
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

function ShipmentBadge({ shipment }: { shipment: DashboardShipmentCard }) {
  const classes =
    shipment.status === "in_transit"
      ? "bg-intra-success-soft text-intra-text-success"
      : shipment.status === "accepted"
        ? "bg-intra-neutral-pill text-intra-blue"
        : shipment.status === "matched"
          ? "bg-intra-neutral-pill text-intra-blue"
        : shipment.status === "delivered"
          ? "bg-intra-success-soft text-intra-text-success"
          : "bg-intra-neutral-pill text-intra-text-muted";

  return (
    <span className={`intra-pill intra-badge-text whitespace-nowrap ${classes}`}>
      {shipment.statusLabel}
    </span>
  );
}

function TripAvailabilityBadge({ trip }: { trip: DashboardTripCard }) {
  const classes =
    trip.status === "full"
      ? "bg-intra-neutral-pill text-intra-blue"
      : trip.status === "closed"
        ? "bg-intra-neutral-pill text-intra-text-muted"
        : trip.status === "completed"
          ? "bg-intra-success-soft text-intra-text-success"
        : trip.status === "cancelled"
            ? "bg-intra-danger-soft text-intra-danger"
            : "bg-intra-success-soft text-intra-green";

  return (
    <span className={`intra-pill intra-badge-text px-2 py-0.5 ${classes}`}>
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

const shipmentProgressSteps = ["Aceptado", "En tránsito", "Entregado"] as const;

function getShipmentProgressStepIndex(status: DashboardShipmentCard["status"]) {
  switch (status) {
    case "delivered":
      return 2;
    case "in_transit":
      return 1;
    case "matched":
    case "accepted":
      return 0;
    default:
      return -1;
  }
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
      : "bg-intra-blue hover:bg-intra-blue-hover-card";

  const iconShellClassName =
    tone === "green" ? "bg-white/20 text-white" : "bg-white/10 text-intra-green";

  const descriptionClassName = tone === "green" ? "text-white/75" : "text-white/70";
  const arrowClassName = tone === "green" ? "text-white/60" : "text-white/40";

  return (
    <Link
      href={href}
      className={`group flex min-h-[88px] items-center gap-3 rounded-[var(--intra-radius-sm)] p-3 text-left transition sm:min-h-24 sm:gap-4 sm:p-4 ${cardClassName}`}
    >
      <div className={`intra-icon-shell-emphasis rounded-[var(--intra-radius-xs)] ${iconShellClassName}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="intra-h4 text-white">{title}</p>
        <p className={`mt-1 hidden intra-body sm:block ${descriptionClassName}`}>{description}</p>
      </div>
      <ArrowRight className={`ml-auto intra-icon-emphasis shrink-0 transition group-hover:translate-x-1 ${arrowClassName}`} />
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
      className={accent ? "intra-card-compact border-2 border-intra-success-border p-4 ring-2 ring-intra-success-soft" : "intra-card-compact p-4"}
    >
      <div className="flex items-center gap-3">
        <div
          className={accent ? "intra-icon-shell-body rounded-lg bg-intra-green text-white" : "intra-icon-shell-body rounded-lg bg-intra-neutral-pill text-intra-blue"}
        >
          {icon}
        </div>
        <p className={accent ? "intra-metric leading-none text-intra-green" : "intra-metric leading-none"}>{value}</p>
        {label === "Envíos activos" ? (
          <p className="min-w-0 intra-caption leading-4 sm:leading-[inherit]">
            <span className="sm:hidden">Envíos<br />activos</span>
            <span className="hidden sm:inline">Envíos activos</span>
          </p>
        ) : (
          <p className="min-w-0 intra-caption">{label}</p>
        )}
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
    <div className="intra-empty-state text-left">
      <p className="intra-h4">{title}</p>
      <p className="mt-1 intra-body">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="intra-btn intra-btn-secondary mt-4"
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
      ? "intra-link text-intra-warning-text hover:text-intra-warning-text-strong hover:no-underline"
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
      <span className="intra-pill gap-1 bg-intra-warning-soft text-intra-warning-text">
        <Star className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Sin calificaciones</span>
      </span>
    );
  }

  return <RatingSummaryBadge avgRating={avgRating} totalReviews={totalReviews} />;
}

function InitialPhotoThumbnail({
  shipment,
  size = "media",
}: {
  shipment: DashboardCompatibleShipmentCard;
  size?: "compact" | "media";
}) {
  const isCompact = size === "compact";
  const thumbnailShellClassName = isCompact
    ? "h-14 w-14 shrink-0"
    : "h-24 w-24 shrink-0 sm:h-28 sm:w-28";
  const thumbnailClassName = isCompact
    ? "h-14 w-14 rounded-[var(--intra-radius-xs)] border border-intra-border-soft object-cover"
    : "h-24 w-24 rounded-[var(--intra-radius-sm)] border border-intra-border-soft object-cover sm:h-28 sm:w-28";
  const iconClassName = isCompact ? "h-5 w-5" : "h-7 w-7";

  return (
    <div className={thumbnailShellClassName}>
      {shipment.initialPhotoUrl ? (
        <EvidenceImagePreview
          src={shipment.initialPhotoUrl}
          alt={shipment.initialPhotoAlt}
          modalTitle="Imagen del paquete"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed evidence URLs should not pass through the image optimizer cache. */}
          <img
            src={shipment.initialPhotoUrl}
            alt={shipment.initialPhotoAlt}
            className={`${thumbnailClassName} block`}
          />
        </EvidenceImagePreview>
      ) : (
        <div
          className={`flex items-center justify-center border-dashed bg-intra-neutral-soft-alt ${thumbnailClassName}`}
          aria-label="Imagen no disponible"
        >
          <PackageCheck className={`${iconClassName} text-intra-text-muted`} />
        </div>
      )}
    </div>
  );
}

function CompatibleShipmentWeightBadge({ shipment }: { shipment: DashboardCompatibleShipmentCard }) {
  return (
    <span className="intra-pill absolute right-4 top-4 shrink-0 bg-intra-neutral-pill text-intra-blue">
      Peso: {shipment.weightLabel}
    </span>
  );
}

function CompatibleShipmentInfo({ shipment }: { shipment: DashboardCompatibleShipmentCard }) {
  return (
    <>
      <p className="min-w-0 break-words pr-24 intra-h4 sm:pr-28">{shipment.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 intra-body">
        <span className="min-w-0 break-words">
          <span className="intra-body-strong">Cliente:</span> {shipment.customerName}
        </span>
        <div className="flex shrink-0 items-center">
          <CustomerRatingBadge
            avgRating={shipment.customerAvgRating}
            totalReviews={shipment.customerTotalReviews}
          />
        </div>
      </div>
      <p className="mt-1 intra-body">
        <span className="intra-body-strong">Ruta:</span> {shipment.routeLabel}
      </p>
      {shipment.description ? (
        <p className="mt-2 line-clamp-2 intra-body">
          <span className="intra-body-strong">Descripción:</span> {shipment.description}
        </p>
      ) : null}
    </>
  );
}

function CompatibleShipmentEarnings({
  shipment,
  className = "",
}: {
  shipment: DashboardCompatibleShipmentCard;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-[var(--intra-radius-xs)] border border-intra-success-border bg-intra-success-soft px-3 py-2 shadow-sm ${className}`.trim()}
    >
      <span className="intra-icon-shell-body shrink-0 rounded-full bg-intra-card text-intra-green">
        <CircleDollarSign className="intra-icon-body" />
      </span>
      <div className="flex min-w-0 items-center gap-2 text-left">
        <span className="hidden whitespace-nowrap intra-body-strong text-intra-text-success sm:inline">
          Ganancia
        </span>
        <p className="min-w-0 break-words intra-metric-sm text-intra-green">
          {shipment.travelerEarningsLabel ?? "Por confirmar"}
        </p>
      </div>
    </div>
  );
}

function CompactCompatibleShipmentCard({
  shipment,
}: {
  shipment: DashboardCompatibleShipmentCard;
}) {
  return (
    <div className="intra-card-compact relative p-4">
      <CompatibleShipmentWeightBadge shipment={shipment} />

      <div className="sm:hidden">
        <CompatibleShipmentInfo shipment={shipment} />

        <div className="mt-3 flex items-center gap-3">
          <InitialPhotoThumbnail shipment={shipment} size="compact" />
          <CompatibleShipmentEarnings shipment={shipment} />
        </div>

        {shipment.matchingTripId ? (
          <div className="mt-3 [&>div]:w-full [&_button]:w-full">
            <MatchButton shipmentId={shipment.id} tripId={shipment.matchingTripId} />
          </div>
        ) : null}
      </div>

      <div className="hidden items-start gap-3 sm:flex">
        <InitialPhotoThumbnail shipment={shipment} />

        <div className="min-w-0 flex-1">
          <CompatibleShipmentInfo shipment={shipment} />
        </div>
      </div>

      <div className="mt-4 hidden items-center gap-3 sm:flex sm:justify-end">
        <CompatibleShipmentEarnings shipment={shipment} className="sm:flex-none" />
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
            <p className="mt-1 intra-body">Gestiona tus envíos, viajes y matches desde aquí.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DashboardShortcutCard
              href="/app/shipments/new"
              title="Crear envío"
              description="Publica un paquete y encuentra un viajero."
              tone="green"
              icon={<PackageCheck className="intra-icon-emphasis" />}
            />

            <DashboardShortcutCard
              href="/app/trips/new"
              title="Publicar viaje"
              description="Gana llevando paquetes en tu ruta."
              tone="blue"
              icon={<Plane className="intra-icon-emphasis" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DashboardStatCard
              value={dashboard.summary.activeShipmentsCount}
              label="Envíos activos"
              icon={<PackageCheck className="intra-icon-body text-intra-green" />}
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
              icon={<CheckCircle2 className="intra-icon-body text-intra-green" />}
            />
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <section id="mis-envios" className="space-y-4">
                <div>
                  <h2 className="intra-h3">Mis envíos activos</h2>
                </div>

                {dashboard.pendingPaymentShipments.length > 0 ? (
                  <div id="pendientes-de-pago" className="rounded-[var(--intra-radius-sm)] border border-intra-warning-border bg-intra-warning-soft p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="intra-h4 text-intra-warning-text-strong">Pendientes de pago</h3>
                          <span className="intra-pill bg-intra-warning-soft-alt text-intra-warning-text">
                            Requiere acción
                          </span>
                        </div>
                        <p className="mt-1 intra-body text-intra-warning-text/80">
                          Completa el checkout para activar tus envíos.
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
                        <div key={shipment.id} className="intra-card-compact p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="intra-pill bg-intra-warning-soft-alt text-intra-warning-text">
                                  {shipment.paymentLabel}
                                </span>
                                <TrackingCodeBadge code={shipment.code} className="!bg-intra-warning-text-strong hover:!bg-intra-warning-text-strong" />
                              </div>
                              <p className="intra-h4">{shipment.title}</p>
                              <p className="mt-0.5 intra-body">{shipment.routeLabel}</p>
                            </div>

                            <div className="flex flex-col items-start gap-3 sm:items-end">
                              <span className="intra-metric-sm">{shipment.amountLabel}</span>
                              <Link
                                href={shipment.checkoutHref}
                                className="intra-btn min-h-11 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-warning px-4 py-2 text-intra-card transition hover:bg-intra-warning-text-strong"
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
                    description="Cuando crees tu primer envío, aparecerá aquí."
                    ctaHref="/app/shipments/new"
                    ctaLabel="Crear envío"
                  />
                ) : (
                  <div className="space-y-3">
                    {dashboard.activeShipments.map((shipment) => (
                      <div key={shipment.id} className="intra-card-compact p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <ShipmentBadge shipment={shipment} />
                            </div>
                            <p className="truncate intra-h4">{shipment.title}</p>
                            <p className="mt-0.5 intra-body">{shipment.routeLabel}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-center text-center">
                            <TrackingCodeBadge code={shipment.code} />
                            <span className="mt-1 intra-metric-sm">{shipment.amountLabel}</span>
                          </div>
                        </div>

                        {shipment.hasPendingAction && shipment.pendingMatchId ? (
                          <div className="rounded-[var(--intra-radius-sm)] border border-intra-trust-border bg-intra-trust-soft p-4">
                            <div className="flex items-start gap-3">
                              <div className="intra-icon-shell-body mt-0.5 rounded-full bg-intra-trust-icon-bg text-intra-trust-icon-text">
                                <UserCheck className="intra-icon-body" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[16px] font-bold leading-6 text-intra-blue">
                                  {shipment.travelerName ?? "Un viajero"}
                                </p>
                                <p className="mt-0.5 text-sm leading-5 text-intra-text-subtle">Quiere transportar tu envío</p>
                              </div>
                            </div>
                            {(shipment.travelerCompletedDeliveriesCount ?? 0) > 0 || shipment.travelerVerified ? (
                              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start sm:pl-12">
                                {(shipment.travelerCompletedDeliveriesCount ?? 0) > 0 ? (
                                  <span className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-intra-success-text-bright/20 bg-intra-success-soft px-2 py-1 text-[10px] font-semibold text-intra-success-text-bright sm:gap-1.5 sm:px-2.5 sm:text-xs">
                                    <PackageCheck className="h-3.5 w-3.5" />
                                    <span>
                                      {shipment.travelerCompletedDeliveriesCount === 1
                                        ? "1 entrega completada"
                                        : `${shipment.travelerCompletedDeliveriesCount} entregas completadas`}
                                    </span>
                                  </span>
                                ) : null}

                                {shipment.travelerVerified ? (
                                  <span className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-intra-border-soft bg-intra-card px-2 py-1 text-[10px] font-semibold text-intra-blue sm:gap-1.5 sm:px-2.5 sm:text-xs">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    <span>Viajero verificado</span>
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="mt-3 flex items-start gap-1.5 text-sm leading-5 text-intra-text-subtle sm:pl-12">
                              <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                              <p>{shipment.travelerDepartureLabel ?? "Salida pendiente de confirmar"}</p>
                            </div>
                            <div className="mt-4 border-t border-intra-trust-border pt-4">
                              <DashboardPendingMatchActions matchId={shipment.pendingMatchId} />
                            </div>
                          </div>
                        ) : shipment.travelerName ? (
                          <>
                            <div>
                              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {shipmentProgressSteps.map((step, index) => {
                                  const progressIndex = getShipmentProgressStepIndex(shipment.status);
                                  const isDone = index <= progressIndex;
                                  const isCurrent = index === progressIndex;

                                  return (
                                    <div key={step} className="min-w-0">
                                      <div
                                        className={`h-2 rounded-full transition ${
                                          isDone ? "bg-intra-green" : "bg-intra-border-strong"
                                        }`}
                                      />
                                      <p
                                        className={`intra-step-label mt-2 text-center ${
                                          isCurrent ? "text-intra-blue" : isDone ? "text-intra-text-subtle" : "text-intra-text-muted/70"
                                        }`}
                                      >
                                        {step}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-col gap-3 border-t border-intra-border-soft pt-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2 sm:self-auto">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-intra-success-soft text-intra-green">
                                  <span className="intra-caption-strong text-intra-green">{shipment.travelerName.slice(0, 2).toUpperCase()}</span>
                                </div>
                                <span className="intra-body">{shipment.travelerName}</span>
                              </div>
                              <div className="flex justify-center sm:block">
                                <Link href="/app/matches" className="intra-link inline-flex min-h-11 items-center text-intra-green hover:text-intra-green-hover-app hover:no-underline">
                                  Ver detalles
                                </Link>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1">
                              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {shipmentProgressSteps.map((step) => (
                                  <div key={step} className="min-w-0">
                                    <div className="h-2 rounded-full bg-intra-border-strong" />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <DashboardPublishedTimeLabel createdAt={shipment.createdAt} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div id="envios-compatibles" className="intra-surface-compact space-y-3 bg-intra-neutral-soft-alt p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="intra-h4">Envíos compatibles con mis viajes</h3>
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
                      description="Publica o mantén activo un viaje para ver oportunidades."
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
                  <h2 className="intra-h3">Mis viajes</h2>
                </div>

                {dashboard.publishedTrips.length === 0 ? (
                  <EmptyCard
                    title="Aún no tienes viajes publicados"
                    description="Publica un viaje para recibir paquetes compatibles con tu ruta."
                    ctaHref="/app/trips/new"
                    ctaLabel="Publicar viaje"
                  />
                ) : (
                  <div className="space-y-3">
                    {dashboard.publishedTrips.map((trip) => (
                      <div key={trip.id} className="intra-card-compact px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:px-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-success-soft-alt">
                              <Plane className="h-5 w-5 text-intra-green" />
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <p className="intra-h4">{trip.routeShortLabel}</p>
                                <TripAvailabilityBadge trip={trip} />
                              </div>
                              <div className="mt-0.5 flex flex-nowrap items-center gap-x-1 intra-caption leading-none sm:gap-x-1.5">
                                <span className="whitespace-nowrap">{trip.departureDateLabel}</span>
                                <span aria-hidden="true" className="shrink-0">·</span>
                                <div className="flex shrink-0 items-center gap-0.5">
                                  <Briefcase className="intra-icon-compact text-intra-text-muted/70" />
                                  <span className="whitespace-nowrap">{formatTripUsagePercent(trip.usedCapacityKg, trip.totalCapacityKg)}</span>
                                </div>
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
              <div className="intra-dashboard-revenue-card overflow-hidden p-5 text-white">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="intra-on-dark-label">{revenueTitle}</p>
                    <p className="mt-3 intra-on-dark-metric">{dashboard.monthlyRevenue.releasedAmountLabel}</p>
                    <p className="mt-2 intra-on-dark-body">
                      {hasMonthlyRevenue
                        ? (dashboard.monthlyRevenue.deltaVsPreviousMonthLabel ?? dashboard.monthlyRevenue.monthLabel)
                        : "Aún no tienes entregas finalizadas este mes"}
                    </p>
                  </div>

                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-intra-success-border/30 bg-intra-success-soft text-intra-green shadow-sm">
                    <CircleDollarSign className="h-5 w-5" />
                  </span>
                </div>

                <div className="grid grid-cols-[0.65fr_1.05fr_1.3fr] rounded-[var(--intra-radius-sm)] border border-white/10 bg-white/7 backdrop-blur-sm sm:grid-cols-3">
                  <div className="flex flex-col px-2 py-3 sm:px-4">
                    <p className="intra-on-dark-caption">Entregas</p>
                    <div className="mt-1 flex w-full justify-center">
                      <p className="intra-on-dark-body-strong">{dashboard.monthlyRevenue.deliveriesCount}</p>
                    </div>
                  </div>
                  <div className="flex flex-col border-l border-white/10 px-2 py-3 sm:px-4">
                    <p className="intra-on-dark-caption">Promedio</p>
                    <div className="mt-1 flex w-full justify-center">
                      <p className="intra-on-dark-body-strong">{dashboard.monthlyRevenue.averageTicketLabel}</p>
                    </div>
                  </div>
                  <div className="flex flex-col border-l border-white/10 px-2 py-3 sm:px-4">
                    <p className="intra-on-dark-caption">Mejor ruta</p>
                    <div className="mt-1 flex w-full justify-center">
                      <p className="intra-on-dark-body-strong whitespace-nowrap text-center">
                        {dashboard.monthlyRevenue.bestRouteLabel || "Sin datos"}
                      </p>
                    </div>
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
