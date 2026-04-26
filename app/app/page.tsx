import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";
import WelcomeModal from "@/components/WelcomeModal";
import { createClient } from "@/lib/supabase/server";
import { isSafeInternalPath } from "@/lib/safe-next";
import AuthGateway from "./AuthGateway";
import DashboardPendingMatchActions from "./_components/dashboard/DashboardPendingMatchActions";
import { getDashboardData } from "./_lib/dashboard-queries";
import type { DashboardActivityIcon, DashboardShipmentCard } from "./_lib/dashboard-types";

type AppHomePageProps = {
  searchParams?: Promise<{
    tab?: string;
    error?: string;
    next?: string;
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
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <span className="whitespace-nowrap rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
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
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}>
      {shipment.statusLabel}
    </span>
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
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500">
      <p className="font-semibold text-[#0B2C4A]">{title}</p>
      <p className="mt-1">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex rounded-xl bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#27ae60]"
        >
          {ctaLabel}
        </Link>
      ) : null}
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

  return (
    <>
      <AppNavbar />

      <WelcomeModal
        userId={dashboard.user.id}
        initialOpen={dashboard.user.showWelcomeModal}
      />

      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2C4A] sm:text-3xl">
              {greetingName ? `Hola, ${greetingName}` : "Hola"}
            </h1>
            <p className="mt-1 text-gray-500">Resumen de tu actividad</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/app/shipments/new"
              className="group flex min-h-28 items-center gap-4 rounded-2xl bg-[#2ECC71] p-4 text-left shadow-lg shadow-[#2ECC71]/20 transition hover:bg-[#27ae60] sm:p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">Crear envío</p>
                <p className="text-sm leading-snug text-white/75">
                  Publica un paquete para que un viajero lo lleve
                </p>
              </div>
              <svg className="ml-auto h-5 w-5 shrink-0 text-white/60 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/app/trips/new"
              className="group flex min-h-28 items-center gap-4 rounded-2xl bg-[#0B2C4A] p-4 text-left transition hover:bg-[#123a5f] sm:p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <svg className="h-5 w-5 text-[#2ECC71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">Publicar viaje</p>
                <p className="text-sm leading-snug text-white/70">
                  Gana dinero con tu próximo viaje llevando paquetes
                </p>
              </div>
              <svg className="ml-auto h-5 w-5 shrink-0 text-white/40 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFFBF4]">
                  <svg className="h-4 w-4 text-[#2ECC71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-xs text-gray-400">+{dashboard.summary.activityTodayCount} hoy</span>
              </div>
              <p className="text-2xl font-bold text-[#0B2C4A]">{dashboard.summary.activeShipmentsCount}</p>
              <p className="mt-0.5 text-xs text-gray-500">Envíos activos</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2F7]">
                  <svg className="h-4 w-4 text-[#0B2C4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-[#0B2C4A]">{dashboard.summary.publishedTripsCount}</p>
              <p className="mt-0.5 text-xs text-gray-500">Viajes publicados</p>
            </div>

            <div className="rounded-2xl border-2 border-[#A3E4BF] bg-white p-4 ring-2 ring-[#EFFBF4]">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2ECC71]">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="rounded bg-[#EFFBF4] px-1.5 py-0.5 text-[10px] font-semibold text-[#2ECC71]">
                  Requiere acción
                </span>
              </div>
              <p className="text-2xl font-bold text-[#2ECC71]">{dashboard.summary.pendingActionMatchesCount}</p>
              <p className="mt-0.5 text-xs text-gray-500">Matches pendientes</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFFBF4]">
                  <svg className="h-4 w-4 text-[#2ECC71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-[#0B2C4A]">{dashboard.summary.completedDeliveriesCount}</p>
              <p className="mt-0.5 text-xs text-gray-500">Entregas completadas</p>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0B2C4A]">Mis envíos activos</h2>
                <Link href="/app/market" className="text-sm font-medium text-[#2ECC71] hover:text-[#27ae60]">
                  Ver todos
                </Link>
              </div>

              {dashboard.activeShipments.length === 0 ? (
                <EmptyCard
                  title="Aún no tienes envíos activos"
                  description="Crea tu primer envío para empezar a recibir matches y ver actividad aquí."
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
                            <span className="text-xs text-gray-300">{shipment.code}</span>
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
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                              <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gray-200"
                                style={{ width: `${shipment.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{shipment.progressLabel}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#0B2C4A]">Mis viajes</h2>
                  <Link href="/app/market" className="text-sm font-medium text-[#2ECC71] hover:text-[#27ae60]">
                    Ver todos
                  </Link>
                </div>

                {dashboard.publishedTrips.length === 0 ? (
                  <EmptyCard
                    title="Aún no tienes viajes publicados"
                    description="Publica tu próximo viaje para empezar a recibir paquetes compatibles."
                    ctaHref="/app/trips/new"
                    ctaLabel="Publicar viaje"
                  />
                ) : (
                  <div className="space-y-3">
                    {dashboard.publishedTrips.map((trip) => (
                      <div key={trip.id} className="rounded-2xl border border-gray-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFFBF4]">
                            <svg className="h-4 w-4 text-[#2ECC71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0B2C4A]">{trip.routeShortLabel}</p>
                            <p className="text-xs text-gray-400">{trip.departureDateLabel}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 max-w-[120px] flex-1 rounded-full bg-gray-100 sm:w-[120px]">
                              <div className="h-full rounded-full bg-[#2ECC71]" style={{ width: `${trip.progressPercent}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">
                              {trip.usedCapacityKg}/{trip.totalCapacityKg} kg
                            </span>
                          </div>
                          <span className="rounded-full bg-[#EFFBF4] px-2 py-0.5 text-xs font-semibold text-[#2ECC71]">
                            {trip.availabilityLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-lg font-bold text-[#0B2C4A]">Actividad reciente</h2>
                {dashboard.recentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500">
                    <p className="font-semibold text-[#0B2C4A]">Sin novedades 🎉</p>
                    <p className="mt-1">
                      Cuando publiques envíos, viajes o recibas mensajes, aparecerán aquí.
                    </p>
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
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${icon.bgClassName} ${icon.textClassName}`}>
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

              <div className="rounded-2xl bg-[#0B2C4A] p-5 text-white">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/60">Ganancias este mes</p>
                  <svg className="h-5 w-5 text-[#2ECC71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>

                <p className="text-3xl font-bold">{dashboard.monthlyRevenue.releasedAmountLabel}</p>
                <p className="mt-1 text-sm text-white/70">
                  {dashboard.monthlyRevenue.deltaVsPreviousMonthLabel ?? dashboard.monthlyRevenue.monthLabel}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl bg-white/5 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-white/50">Entregas</p>
                    <p className="mt-1 font-semibold">{dashboard.monthlyRevenue.deliveriesCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50">Promedio</p>
                    <p className="mt-1 font-semibold">{dashboard.monthlyRevenue.averageTicketLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50">Mejor ruta</p>
                    <p className="mt-1 font-semibold">{dashboard.monthlyRevenue.bestRouteLabel}</p>
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
