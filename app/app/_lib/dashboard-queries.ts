import { createClient } from "@/lib/supabase/server";
import { ROUTE_PRICING_BY_CATEGORY, isRouteCategory } from "@/lib/payments/quote";
import { getShipmentKindLabel, getStatusLabel } from "@/lib/labels";
import {
  getPendingPaymentLabel,
  isShipmentPaymentReady,
  isShipmentPaymentRetryable,
} from "@/lib/payments/shipment-payment-state";
import type {
  DashboardActivityIcon,
  DashboardActivityItem,
  DashboardData,
  DashboardPendingPaymentShipmentCard,
  DashboardRevenueSummary,
  DashboardShipmentCard,
  DashboardTripCard,
  DashboardUser,
} from "./dashboard-types";

type CityRow = {
  name: string | null;
  iata_code: string | null;
};

type CityRelation = CityRow | CityRow[] | null;

type ShipmentRow = {
  id: string;
  kind: string | null;
  description: string | null;
  weight_kg: number | null;
  declared_value_cop: number | null;
  status: string | null;
  created_at: string;
  origin_city_id: string | null;
  destination_city_id: string | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type TripRow = {
  id: string;
  traveler_id: string;
  departure_date: string;
  capacity_kg: number | null;
  status: string | null;
  created_at: string;
  origin_city_id: string | null;
  destination_city_id: string | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type MatchTripRelation = {
  id: string;
  traveler_id: string;
  departure_date: string | null;
  capacity_kg: number | null;
};

type MatchShipmentRelation = {
  id: string;
  weight_kg: number | null;
  status: string | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type ShipmentMatchRow = {
  id: string;
  shipment_id: string;
  trip_id: string;
  status: string;
  created_at: string;
  trip: MatchTripRelation | MatchTripRelation[] | null;
};

type TripMatchRow = {
  id: string;
  shipment_id: string;
  trip_id: string;
  status: string;
  shipment: MatchShipmentRelation | MatchShipmentRelation[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type NotificationRow = {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  related_match_id: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  shipment_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type RoutePriceRow = {
  id: string;
  origin_city_id: string;
  destination_city_id: string;
  route_category: string;
  is_active: boolean;
};

function normalizeCity(city: CityRelation): CityRow | null {
  if (!city) return null;
  return Array.isArray(city) ? (city[0] ?? null) : city;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateLabel(dateString: string | null | undefined) {
  if (!dateString) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function getRelativeTimeLabel(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
}

function getRouteLabel(origin: CityRelation, destination: CityRelation) {
  const originName = normalizeCity(origin)?.name ?? "Origen";
  const destinationName = normalizeCity(destination)?.name ?? "Destino";
  return `${originName} → ${destinationName}`;
}

function getCityCode(city: CityRelation) {
  const normalized = normalizeCity(city);
  if (!normalized) return null;

  if (normalized.iata_code) return normalized.iata_code.toUpperCase();
  if (normalized.name) return normalized.name.slice(0, 3).toUpperCase();
  return null;
}

function getRouteShortLabel(origin: CityRelation, destination: CityRelation) {
  const originCode = getCityCode(origin) ?? "ORG";
  const destinationCode = getCityCode(destination) ?? "DST";
  return `${originCode} → ${destinationCode}`;
}

function getShipmentCode(id: string) {
  return `#ENV-${id.replace(/-/g, "").slice(-4).toUpperCase()}`;
}

function getTripAvailabilityLabel(status: string | null) {
  switch (status) {
    case "full":
      return "Lleno";
    case "completed":
      return "Completado";
    case "cancelled":
      return "Cancelado";
    default:
      return "Disponible";
  }
}

function getTripProgressPercent(usedCapacityKg: number, totalCapacityKg: number) {
  if (!totalCapacityKg || totalCapacityKg <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((usedCapacityKg / totalCapacityKg) * 100)));
}

function getActivityIcon(type: string | null): DashboardActivityIcon {
  switch (type) {
    case "match_requested":
    case "match_accepted":
    case "match_rejected":
    case "match_cancelled":
      return "match";
    case "shipment_in_transit":
    case "delivery_reported":
    case "delivery_confirmed":
      return "shipment";
    case "new_message":
      return "message";
    case "payment_released":
    case "refund_processed":
      return "payment";
    case "dispute_opened":
      return "alert";
    default:
      return "default";
  }
}

function getShipmentVisualState(input: {
  shipmentStatus: string | null;
  hasPendingMatch: boolean;
}) {
  if (input.hasPendingMatch) {
    return {
      status: "matched" as const,
      statusLabel: "Match pendiente",
      progressPercent: 35,
      progressLabel: "Requiere acción",
    };
  }

  switch (input.shipmentStatus) {
    case "accepted":
      return {
        status: "accepted" as const,
        statusLabel: "Match aceptado",
        progressPercent: 50,
        progressLabel: "Coordinando recogida",
      };
    case "in_transit":
      return {
        status: "in_transit" as const,
        statusLabel: "En tránsito",
        progressPercent: 65,
        progressLabel: "En camino",
      };
    case "delivered":
      return {
        status: "delivered" as const,
        statusLabel: "Entregado",
        progressPercent: 100,
        progressLabel: "Completado",
      };
    case "cancelled":
      return {
        status: "cancelled" as const,
        statusLabel: "Cancelado",
        progressPercent: 100,
        progressLabel: "Cancelado",
      };
    case "matched":
      return {
        status: "matched" as const,
        statusLabel: "Emparejado",
        progressPercent: 40,
        progressLabel: "Match creado",
      };
    default:
      return {
        status: "open" as const,
        statusLabel: "Esperando viajero",
        progressPercent: 15,
        progressLabel: "Publicado hace poco",
      };
  }
}

function normalizeTripRelation(
  value: ShipmentMatchRow["trip"] | TripRow | TripRow[] | null
): MatchTripRelation | TripRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeShipmentRelation(
  value: TripMatchRow["shipment"] | ShipmentRow | ShipmentRow[] | null
): MatchShipmentRelation | ShipmentRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const currentMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const nextMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
  const previousMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);

  const [profileRes, shipmentsRes, tripsRes, notificationsRes, notificationsTodayRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, show_welcome_modal")
        .eq("id", user.id)
        .single(),
      supabase
        .from("shipments")
        .select(`
          id,
          kind,
          description,
          weight_kg,
          declared_value_cop,
          status,
          created_at,
          origin_city_id,
          destination_city_id,
          origin_city:cities!shipments_origin_city_id_fkey(name, iata_code),
          destination_city:cities!shipments_destination_city_id_fkey(name, iata_code)
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("trips")
        .select(`
          id,
          traveler_id,
          departure_date,
          capacity_kg,
          status,
          created_at,
          origin_city_id,
          destination_city_id,
          origin_city:cities!trips_origin_city_id_fkey(name, iata_code),
          destination_city:cities!trips_destination_city_id_fkey(name, iata_code)
        `)
        .eq("traveler_id", user.id)
        .order("departure_date", { ascending: true }),
      supabase
        .from("notifications")
        .select("id, type, title, message, related_match_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString()),
    ]);

  const profile = profileRes.data;
  const shipments = ((shipmentsRes.data ?? []) as ShipmentRow[]).filter(Boolean);
  const trips = ((tripsRes.data ?? []) as TripRow[]).filter(Boolean);
  const notifications = ((notificationsRes.data ?? []) as NotificationRow[]).filter(Boolean);

  const shipmentIds = shipments.map((shipment) => shipment.id);
  const tripIds = trips.map((trip) => trip.id);

  const [shipmentMatchesRes, tripMatchesRes, paymentsRes, routePricesRes] = await Promise.all([
    shipmentIds.length
      ? supabase
          .from("matches")
          .select(`
            id,
            shipment_id,
            trip_id,
            status,
            created_at,
            trip:trips!matches_trip_id_fkey(id, traveler_id, departure_date, capacity_kg)
          `)
          .in("shipment_id", shipmentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    tripIds.length
      ? supabase
          .from("matches")
          .select(`
            id,
            shipment_id,
            trip_id,
            status,
            shipment:shipments!matches_shipment_id_fkey(
              id,
              weight_kg,
              status,
              origin_city:cities!shipments_origin_city_id_fkey(name, iata_code),
              destination_city:cities!shipments_destination_city_id_fkey(name, iata_code)
            )
          `)
          .in("trip_id", tripIds)
      : Promise.resolve({ data: [], error: null }),
    shipmentIds.length
      ? supabase
          .from("payments")
          .select("id, shipment_id, amount, status, created_at, updated_at")
          .in("shipment_id", shipmentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    shipments.length
      ? supabase
          .from("route_prices")
          .select("id, origin_city_id, destination_city_id, route_category, is_active")
          .eq("is_active", true)
          .in(
            "origin_city_id",
            Array.from(new Set(shipments.map((shipment) => shipment.origin_city_id).filter(Boolean)))
          )
          .in(
            "destination_city_id",
            Array.from(
              new Set(shipments.map((shipment) => shipment.destination_city_id).filter(Boolean))
            )
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  const shipmentMatches = ((shipmentMatchesRes.data ?? []) as ShipmentMatchRow[]).filter(Boolean);
  const tripMatches = ((tripMatchesRes.data ?? []) as TripMatchRow[]).filter(Boolean);
  const payments = ((paymentsRes.data ?? []) as PaymentRow[]).filter(Boolean);
  const routePrices = ((routePricesRes.data ?? []) as RoutePriceRow[]).filter(Boolean);

  const travelerIds = Array.from(
    new Set(
      shipmentMatches
        .map((match) => normalizeTripRelation(match.trip)?.traveler_id)
        .filter(Boolean)
    )
  ) as string[];

  const travelerProfilesRes = travelerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", travelerIds)
    : { data: [], error: null };

  const travelerProfiles = new Map(
    (((travelerProfilesRes.data ?? []) as ProfileRow[]) ?? []).map((traveler) => [
      traveler.id,
      traveler.full_name,
    ])
  );

  const routePriceByKey = new Map(
    routePrices.map((routePrice) => [
      `${routePrice.origin_city_id}:${routePrice.destination_city_id}`,
      isRouteCategory(routePrice.route_category)
        ? ROUTE_PRICING_BY_CATEGORY[routePrice.route_category].customerAmount
        : 0,
    ])
  );

  const latestPaymentByShipment = new Map<string, PaymentRow>();
  for (const payment of payments) {
    if (!payment.shipment_id) continue;
    if (!latestPaymentByShipment.has(payment.shipment_id)) {
      latestPaymentByShipment.set(payment.shipment_id, payment);
    }
  }

  const matchesByShipment = new Map<string, ShipmentMatchRow[]>();
  for (const match of shipmentMatches) {
    const list = matchesByShipment.get(match.shipment_id) ?? [];
    list.push(match);
    matchesByShipment.set(match.shipment_id, list);
  }

  const activeShipmentStatuses = new Set(["open", "matched", "accepted", "in_transit"]);
  const actionableShipmentsRaw = shipments.filter((shipment) =>
    activeShipmentStatuses.has(shipment.status ?? "")
  );

  const pendingPaymentShipments = actionableShipmentsRaw
    .filter((shipment) => !isShipmentPaymentReady(latestPaymentByShipment.get(shipment.id)?.status))
    .map((shipment): DashboardPendingPaymentShipmentCard => {
      const latestPayment = latestPaymentByShipment.get(shipment.id) ?? null;
      const routePriceKey = shipment.origin_city_id && shipment.destination_city_id
        ? `${shipment.origin_city_id}:${shipment.destination_city_id}`
        : null;
      const routePrice = routePriceKey ? routePriceByKey.get(routePriceKey) ?? null : null;
      const checkoutHref = latestPayment?.id && isShipmentPaymentRetryable(latestPayment.status)
        ? `/app/payments/checkout?retryPaymentId=${latestPayment.id}`
        : `/app/payments/checkout?shipmentId=${shipment.id}`;

      return {
        id: shipment.id,
        code: getShipmentCode(shipment.id),
        title:
          shipment.description?.trim() ||
          `${getShipmentKindLabel(shipment.kind)}${shipment.weight_kg ? ` · ${shipment.weight_kg} kg` : ""}`,
        routeLabel: `${getRouteLabel(shipment.origin_city, shipment.destination_city)}${shipment.weight_kg ? ` · ${shipment.weight_kg} kg` : ""}`,
        amountLabel: formatCurrency(latestPayment?.amount ?? routePrice ?? shipment.declared_value_cop ?? 0),
        paymentLabel: getPendingPaymentLabel(latestPayment?.status),
        checkoutHref,
      };
    })
    .slice(0, 3);

  const activeShipmentsRaw = actionableShipmentsRaw.filter((shipment) =>
    isShipmentPaymentReady(latestPaymentByShipment.get(shipment.id)?.status)
  );

  const activeShipments = activeShipmentsRaw
    .map((shipment): DashboardShipmentCard => {
      const matchesForShipment = matchesByShipment.get(shipment.id) ?? [];
      const pendingMatch = matchesForShipment.find((match) => match.status === "pending") ?? null;
      const acceptedMatch =
        matchesForShipment.find((match) => match.status === "accepted") ??
        matchesForShipment.find((match) => match.status === "completed") ??
        null;
      const relevantMatch = pendingMatch ?? acceptedMatch;
      const relevantTrip = normalizeTripRelation(relevantMatch?.trip ?? null);
      const travelerName = relevantTrip?.traveler_id
        ? travelerProfiles.get(relevantTrip.traveler_id) ?? "Viajero"
        : null;

      const routePriceKey = shipment.origin_city_id && shipment.destination_city_id
        ? `${shipment.origin_city_id}:${shipment.destination_city_id}`
        : null;
      const routePrice = routePriceKey ? routePriceByKey.get(routePriceKey) ?? null : null;
      const latestPayment = latestPaymentByShipment.get(shipment.id);
      const visual = getShipmentVisualState({
        shipmentStatus: shipment.status,
        hasPendingMatch: Boolean(pendingMatch),
      });

      return {
        id: shipment.id,
        code: getShipmentCode(shipment.id),
        title:
          shipment.description?.trim() ||
          `${getShipmentKindLabel(shipment.kind)}${shipment.weight_kg ? ` · ${shipment.weight_kg} kg` : ""}`,
        routeLabel: `${getRouteLabel(shipment.origin_city, shipment.destination_city)}${shipment.weight_kg ? ` · ${shipment.weight_kg} kg` : ""}`,
        weightKg: shipment.weight_kg,
        amountLabel: formatCurrency(latestPayment?.amount ?? routePrice ?? shipment.declared_value_cop ?? 0),
        status: visual.status,
        statusLabel: visual.statusLabel,
        progressPercent: visual.progressPercent,
        progressLabel: visual.progressLabel,
        travelerName,
        travelerDepartureLabel: relevantTrip?.departure_date
          ? `Viaja el ${formatDateLabel(relevantTrip.departure_date)}`
          : null,
        travelerRatingLabel: null,
        pendingMatchId: pendingMatch?.id ?? null,
        hasPendingAction: Boolean(pendingMatch),
      };
    })
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, 3);

  const activeTripsRaw = trips.filter((trip) => ["open", "full"].includes(trip.status ?? ""));

  const matchesByTrip = new Map<string, TripMatchRow[]>();
  for (const match of tripMatches) {
    const list = matchesByTrip.get(match.trip_id) ?? [];
    list.push(match);
    matchesByTrip.set(match.trip_id, list);
  }

  const publishedTrips: DashboardTripCard[] = activeTripsRaw
    .map((trip) => {
      const matchesForTrip = matchesByTrip.get(trip.id) ?? [];
      const usedCapacityKg = matchesForTrip
        .filter((match) => ["accepted", "completed"].includes(match.status))
        .reduce((sum, match) => {
          const shipment = normalizeShipmentRelation(match.shipment);
          return sum + (shipment?.weight_kg ?? 0);
        }, 0);
      const totalCapacityKg = trip.capacity_kg ?? 0;

      return {
        id: trip.id,
        routeShortLabel: getRouteShortLabel(trip.origin_city, trip.destination_city),
        departureDateLabel: formatDateLabel(trip.departure_date),
        usedCapacityKg: Math.round(usedCapacityKg * 10) / 10,
        totalCapacityKg,
        availabilityLabel: getTripAvailabilityLabel(trip.status),
        statusLabel: getStatusLabel(trip.status),
        progressPercent: trip.status === "full" ? 100 : getTripProgressPercent(usedCapacityKg, totalCapacityKg),
      };
    })
    .slice(0, 2);

  const completedTravelerDeliveriesCount = new Set(
    tripMatches
      .filter((match) => ["accepted", "completed"].includes(match.status))
      .map((match) => {
        const shipment = normalizeShipmentRelation(match.shipment);

        if (!shipment || shipment.status !== "delivered") {
          return null;
        }

        return shipment.id;
      })
      .filter(Boolean) as string[]
  ).size;

  const recentActivity: DashboardActivityItem[] = notifications.map((notification) => ({
    id: notification.id,
    title:
      notification.title?.trim() || notification.message?.trim() || "Nueva actividad en tu cuenta",
    relativeTimeLabel: getRelativeTimeLabel(notification.created_at),
    href: notification.related_match_id
      ? notification.type === "new_message"
        ? `/app/matches/${notification.related_match_id}/chat`
        : `/app/matches/${notification.related_match_id}`
      : null,
    icon: getActivityIcon(notification.type),
  }));

  const travelerShipmentIds = Array.from(
    new Set(
      tripMatches
        .filter((match) => ["accepted", "completed"].includes(match.status))
        .map((match) => match.shipment_id)
        .filter(Boolean)
    )
  );

  const travelerPaymentsRes = travelerShipmentIds.length
    ? await supabase
        .from("payments")
        .select("id, shipment_id, amount, status, created_at, updated_at")
        .in("shipment_id", travelerShipmentIds)
        .eq("status", "released")
        .order("updated_at", { ascending: false })
    : { data: [], error: null };

  const travelerPayments = ((travelerPaymentsRes.data ?? []) as PaymentRow[]).filter(Boolean);

  const monthPayments = travelerPayments.filter((payment) => {
    const updatedAt = new Date(payment.updated_at);
    return updatedAt >= currentMonthStart && updatedAt < nextMonthStart;
  });

  const previousMonthPayments = travelerPayments.filter((payment) => {
    const updatedAt = new Date(payment.updated_at);
    return updatedAt >= previousMonthStart && updatedAt < currentMonthStart;
  });

  const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
  for (const match of tripMatches) {
    const shipment = normalizeShipmentRelation(match.shipment);
    if (shipment && !shipmentById.has(shipment.id)) {
      shipmentById.set(shipment.id, {
        id: shipment.id,
        kind: null,
        description: null,
        weight_kg: shipment.weight_kg,
        declared_value_cop: null,
        status: shipment.status,
        created_at: "",
        origin_city_id: null,
        destination_city_id: null,
        origin_city: shipment.origin_city,
        destination_city: shipment.destination_city,
      });
    }
  }

  const currentRevenueTotal = monthPayments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
  const previousRevenueTotal = previousMonthPayments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
  const revenueDeliveriesCount = monthPayments.length;

  const routeRevenue = new Map<string, number>();
  for (const payment of monthPayments) {
    if (!payment.shipment_id) continue;
    const shipment = shipmentById.get(payment.shipment_id);
    if (!shipment) continue;
    const routeLabel = getRouteShortLabel(shipment.origin_city, shipment.destination_city);
    routeRevenue.set(routeLabel, (routeRevenue.get(routeLabel) ?? 0) + (payment.amount ?? 0));
  }

  const bestRouteLabel =
    Array.from(routeRevenue.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sin datos";

  let deltaVsPreviousMonthLabel: string | null = null;
  if (previousRevenueTotal > 0) {
    const delta = ((currentRevenueTotal - previousRevenueTotal) / previousRevenueTotal) * 100;
    const arrow = delta >= 0 ? "↑" : "↓";
    deltaVsPreviousMonthLabel = `${arrow} ${Math.round(Math.abs(delta))}% vs mes anterior`;
  } else if (currentRevenueTotal > 0) {
    deltaVsPreviousMonthLabel = "Nuevo este mes";
  }

  const monthlyRevenue: DashboardRevenueSummary = {
    monthLabel: formatMonthLabel(currentMonthStart),
    releasedAmount: currentRevenueTotal,
    releasedAmountLabel: formatCurrency(currentRevenueTotal),
    deliveriesCount: revenueDeliveriesCount,
    averageTicketLabel: formatCurrency(
      revenueDeliveriesCount > 0 ? currentRevenueTotal / revenueDeliveriesCount : 0
    ),
    bestRouteLabel,
    deltaVsPreviousMonthLabel,
  };

  const dashboardUser: DashboardUser = {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    showWelcomeModal: profile?.show_welcome_modal ?? false,
  };

  return {
    user: dashboardUser,
    summary: {
      activityTodayCount: notificationsTodayRes.count ?? 0,
      activeShipmentsCount: activeShipmentsRaw.length,
      publishedTripsCount: activeTripsRaw.length,
      pendingActionMatchesCount: activeShipments.filter((shipment) => shipment.hasPendingAction).length,
      completedDeliveriesCount: completedTravelerDeliveriesCount,
    },
    activeShipments,
    pendingPaymentShipments,
    publishedTrips,
    recentActivity,
    monthlyRevenue,
  };
}
