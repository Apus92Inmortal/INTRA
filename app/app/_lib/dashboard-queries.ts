import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTE_PRICING_BY_CATEGORY, isRouteCategory } from "@/lib/payments/quote";
import { getShipmentKindLabel, getStatusLabel } from "@/lib/labels";
import {
  getPendingPaymentLabel,
  isShipmentPaymentReady,
  isShipmentPaymentRetryable,
} from "@/lib/payments/shipment-payment-state";
import { fetchRatingSummaryMap } from "@/lib/reviews";
import type {
  DashboardActivityIcon,
  DashboardActivityItem,
  DashboardCompatibleShipmentCard,
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
  tracking_code?: string | null;
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
  departure_time: string | null;
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
  departure_time: string | null;
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

type UserVerificationRow = {
  user_id: string;
  verification_status: string | null;
};

type TravelerHistoryTripRow = {
  id: string;
  traveler_id: string;
};

type TravelerHistoryMatchRow = {
  trip_id: string;
  status: string;
  shipment: MatchShipmentRelation | MatchShipmentRelation[] | null;
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
  traveler_amount: number | null;
  status: string | null;
  gateway_status: string | null;
  refund_status: string | null;
  dispute_status: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ShipmentReportEventRow = {
  shipment_id: string | null;
  status: string | null;
};

type CompatibleShipmentRow = {
  id: string;
  kind: string | null;
  description: string | null;
  weight_kg: number | null;
  owner_id: string;
  origin_city_id: string | null;
  destination_city_id: string | null;
  origin_city: CityRelation;
  destination_city: CityRelation;
};

type ShipmentInitialEvidenceRow = {
  shipment_id: string;
  file_path: string | null;
};

type RoutePriceRow = {
  id: string;
  origin_city_id: string;
  destination_city_id: string;
  route_category: string;
  is_active: boolean;
};

const INITIAL_EVIDENCE_BUCKET = "shipment-evidence";
const CUSTOMER_INITIAL_EVIDENCE_TYPE = "customer_initial_photo";
const INITIAL_EVIDENCE_SIGNED_URL_TTL_SECONDS = 600;

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

function formatTimeLabel(timeString: string | null | undefined) {
  if (!timeString) return null;

  const [hour = "0", minute = "0"] = timeString.split(":");
  const value = new Date(2000, 0, 1, Number(hour), Number(minute));

  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatDepartureLabel(
  dateString: string | null | undefined,
  timeString: string | null | undefined
) {
  const dateLabel = formatDateLabel(dateString);
  const timeLabel = formatTimeLabel(timeString);
  return timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;
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
    case "closed":
      return "Cerrado";
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
    case "payment_confirmed":
    case "payment_failed":
    case "payment_cancelled":
    case "payment_released":
    case "auto_release_executed":
    case "refund_manual_required":
    case "refund_processed":
    case "payout_requested":
    case "payout_approved":
    case "payout_rejected":
    case "payout_paid":
      return "payment";
    case "dispute_opened":
    case "shipment_alert":
    case "shipment_alert_escalated":
    case "case_reviewing":
    case "dispute_resolved_customer":
    case "dispute_resolved_traveler":
    case "dispute_closed":
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
      status: "open" as const,
      statusLabel: "Esperando viajero",
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

const CANCELLABLE_PENDING_PAYMENT_SHIPMENT_STATUSES = new Set(["open", "matched"]);
const PROTECTED_PAYMENT_STATUSES = new Set([
  "approved",
  "held",
  "paid",
  "processing",
  "protected",
  "released",
  "succeeded",
  "success",
]);
const PROTECTED_GATEWAY_STATUSES = new Set([
  "approved",
  "paid",
  "protected",
  "succeeded",
  "success",
]);
const ACTIVE_MATCH_STATUSES = new Set(["pending", "accepted", "completed"]);
const ACTIVE_REPORT_STATUSES = new Set(["open", "reviewing"]);

function normalizePaymentStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() ?? "";
}

function hasManualRefundFlag(metadata: Record<string, unknown> | null | undefined) {
  return String(metadata?.manual_refund_required ?? "false").toLowerCase() === "true";
}

function canCancelPendingPaymentShipment(input: {
  shipmentStatus: string | null;
  latestPayment: PaymentRow | null;
  matchesForShipment: ShipmentMatchRow[];
}) {
  if (!CANCELLABLE_PENDING_PAYMENT_SHIPMENT_STATUSES.has(normalizePaymentStatus(input.shipmentStatus))) {
    return false;
  }

  if (
    PROTECTED_PAYMENT_STATUSES.has(normalizePaymentStatus(input.latestPayment?.status)) ||
    PROTECTED_GATEWAY_STATUSES.has(normalizePaymentStatus(input.latestPayment?.gateway_status)) ||
    (input.latestPayment
      ? normalizePaymentStatus(input.latestPayment.refund_status || "none") !== "none"
      : false)
  ) {
    return false;
  }

  return !input.matchesForShipment.some((match) =>
    ["accepted", "completed"].includes(normalizePaymentStatus(match.status))
  );
}

function canCancelWaitingTravelerShipment(input: {
  shipmentStatus: string | null;
  latestPayment: PaymentRow | null;
  matchesForShipment: ShipmentMatchRow[];
  reportsForShipment: ShipmentReportEventRow[];
}) {
  if (normalizePaymentStatus(input.shipmentStatus) !== "open") {
    return false;
  }

  if (!input.latestPayment || !isShipmentPaymentReady(input.latestPayment.status)) {
    return false;
  }

  if (normalizePaymentStatus(input.latestPayment.status) === "released") {
    return false;
  }

  if (
    normalizePaymentStatus(input.latestPayment.gateway_status) !== "approved" ||
    normalizePaymentStatus(input.latestPayment.refund_status || "none") !== "none" ||
    normalizePaymentStatus(input.latestPayment.dispute_status || "none") !== "none" ||
    hasManualRefundFlag(input.latestPayment.metadata)
  ) {
    return false;
  }

  if (input.matchesForShipment.some((match) => ACTIVE_MATCH_STATUSES.has(normalizePaymentStatus(match.status)))) {
    return false;
  }

  return !input.reportsForShipment.some((report) => ACTIVE_REPORT_STATUSES.has(normalizePaymentStatus(report.status)));
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

async function getInitialEvidenceSignedUrlByShipmentId(shipmentIds: string[]) {
  const signedUrlByShipmentId = new Map<string, string>();

  if (shipmentIds.length === 0) {
    return signedUrlByShipmentId;
  }

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("shipment_evidence")
      .select("shipment_id, file_path")
      .in("shipment_id", shipmentIds)
      .eq("evidence_type", CUSTOMER_INITIAL_EVIDENCE_TYPE)
      .order("created_at", { ascending: false });

    if (error) {
      return signedUrlByShipmentId;
    }

    const evidenceByShipmentId = new Map<string, string>();
    for (const evidence of ((data ?? []) as ShipmentInitialEvidenceRow[]).filter(Boolean)) {
      if (!evidence.shipment_id || !evidence.file_path || evidenceByShipmentId.has(evidence.shipment_id)) {
        continue;
      }

      evidenceByShipmentId.set(evidence.shipment_id, evidence.file_path);
    }

    await Promise.all(
      Array.from(evidenceByShipmentId.entries()).map(async ([shipmentId, filePath]) => {
        const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
          .from(INITIAL_EVIDENCE_BUCKET)
          .createSignedUrl(filePath, INITIAL_EVIDENCE_SIGNED_URL_TTL_SECONDS);

        if (!signedUrlError && signedUrlData?.signedUrl) {
          signedUrlByShipmentId.set(shipmentId, signedUrlData.signedUrl);
        }
      })
    );
  } catch {
    return signedUrlByShipmentId;
  }

  return signedUrlByShipmentId;
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
        .select("full_name, phone, show_welcome_modal, onboarding_completed, onboarding_intent")
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
          tracking_code,
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
          departure_time,
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
  const openMatchingTrips = trips.filter((trip) => trip.status === "open");

  const [shipmentMatchesRes, tripMatchesRes, paymentsRes, routePricesRes, reportEventsRes] = await Promise.all([
    shipmentIds.length
      ? supabase
          .from("matches")
          .select(`
            id,
            shipment_id,
            trip_id,
            status,
            created_at,
            trip:trips!matches_trip_id_fkey(id, traveler_id, departure_date, departure_time, capacity_kg)
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
          .select("id, shipment_id, amount, traveler_amount, status, gateway_status, refund_status, dispute_status, metadata, created_at, updated_at")
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
    shipmentIds.length
      ? supabase
          .from("shipment_report_events")
          .select("shipment_id, status")
          .in("shipment_id", shipmentIds)
          .in("status", Array.from(ACTIVE_REPORT_STATUSES))
      : Promise.resolve({ data: [], error: null }),
  ]);

  const shipmentMatches = ((shipmentMatchesRes.data ?? []) as ShipmentMatchRow[]).filter(Boolean);
  const tripMatches = ((tripMatchesRes.data ?? []) as TripMatchRow[]).filter(Boolean);
  const payments = ((paymentsRes.data ?? []) as PaymentRow[]).filter(Boolean);
  const routePrices = ((routePricesRes.data ?? []) as RoutePriceRow[]).filter(Boolean);
  const reportEvents = ((reportEventsRes.data ?? []) as ShipmentReportEventRow[]).filter(Boolean);

  const travelerIds = Array.from(
    new Set(
      shipmentMatches
        .map((match) => normalizeTripRelation(match.trip)?.traveler_id)
        .filter(Boolean)
    )
  ) as string[];

  const [travelerProfilesRes, travelerHistoryTripsRes] = await Promise.all([
    travelerIds.length
      ? supabase.rpc("get_public_profiles", { p_profile_ids: travelerIds })
      : Promise.resolve({ data: [], error: null }),
    travelerIds.length
      ? supabase.from("trips").select("id, traveler_id").in("traveler_id", travelerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  let travelerVerificationsRes: { data: UserVerificationRow[] | null; error: unknown | null } = {
    data: [],
    error: null,
  };

  if (travelerIds.length) {
    try {
      const adminSupabase = createAdminClient();
      travelerVerificationsRes = await adminSupabase
        .from("user_verifications")
        .select("user_id, verification_status")
        .in("user_id", travelerIds);
    } catch {
      travelerVerificationsRes = { data: [], error: null };
    }
  }

  const travelerProfiles = new Map(
    (((travelerProfilesRes.data ?? []) as ProfileRow[]) ?? []).map((traveler) => [
      traveler.id,
      traveler.full_name,
    ])
  );

  const travelerVerifiedSet = new Set(
    (((travelerVerificationsRes.data ?? []) as UserVerificationRow[]) ?? [])
      .filter((verification) => verification.verification_status === "verified")
      .map((verification) => verification.user_id)
  );

  const travelerHistoryTripOwnerById = new Map(
    (((travelerHistoryTripsRes.data ?? []) as TravelerHistoryTripRow[]) ?? []).map((trip) => [
      trip.id,
      trip.traveler_id,
    ])
  );

  const travelerHistoryTripIds = Array.from(travelerHistoryTripOwnerById.keys());

  const travelerHistoryMatchesRes = travelerHistoryTripIds.length
    ? await supabase
        .from("matches")
        .select(`
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
        .in("trip_id", travelerHistoryTripIds)
        .in("status", ["accepted", "completed"])
    : { data: [], error: null };

  const travelerCompletedShipmentIdsByTraveler = new Map<string, Set<string>>();
  for (const match of (((travelerHistoryMatchesRes.data ?? []) as TravelerHistoryMatchRow[]) ?? []).filter(Boolean)) {
    const travelerId = travelerHistoryTripOwnerById.get(match.trip_id);
    const shipment = normalizeShipmentRelation(match.shipment);

    if (!travelerId || !shipment || shipment.status !== "delivered") {
      continue;
    }

    const shipmentIds = travelerCompletedShipmentIdsByTraveler.get(travelerId) ?? new Set<string>();
    shipmentIds.add(shipment.id);
    travelerCompletedShipmentIdsByTraveler.set(travelerId, shipmentIds);
  }

  const travelerCompletedDeliveriesCountById = new Map(
    Array.from(travelerCompletedShipmentIdsByTraveler.entries()).map(([travelerId, shipmentIds]) => [
      travelerId,
      shipmentIds.size,
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

  const reportEventsByShipment = new Map<string, ShipmentReportEventRow[]>();
  for (const report of reportEvents) {
    if (!report.shipment_id) continue;
    const list = reportEventsByShipment.get(report.shipment_id) ?? [];
    list.push(report);
    reportEventsByShipment.set(report.shipment_id, list);
  }

  const activeShipmentStatuses = new Set(["open", "matched", "accepted", "in_transit"]);
  const actionableShipmentsRaw = shipments.filter((shipment) =>
    activeShipmentStatuses.has(shipment.status ?? "")
  );

  const pendingPaymentShipments = actionableShipmentsRaw
    .filter((shipment) => !isShipmentPaymentReady(latestPaymentByShipment.get(shipment.id)?.status))
    .map((shipment): DashboardPendingPaymentShipmentCard => {
      const latestPayment = latestPaymentByShipment.get(shipment.id) ?? null;
      const matchesForShipment = matchesByShipment.get(shipment.id) ?? [];
      const routePriceKey = shipment.origin_city_id && shipment.destination_city_id
        ? `${shipment.origin_city_id}:${shipment.destination_city_id}`
        : null;
      const routePrice = routePriceKey ? routePriceByKey.get(routePriceKey) ?? null : null;
      const checkoutHref = latestPayment?.id && isShipmentPaymentRetryable(latestPayment.status)
        ? `/app/payments/checkout?retryPaymentId=${latestPayment.id}`
        : `/app/payments/checkout?shipmentId=${shipment.id}`;

      return {
        id: shipment.id,
        code: shipment.tracking_code?.trim() || getShipmentCode(shipment.id),
        title:
          shipment.description?.trim() ||
          `${getShipmentKindLabel(shipment.kind)}${shipment.weight_kg ? ` · ${shipment.weight_kg} kg` : ""}`,
        routeLabel: `${getRouteLabel(shipment.origin_city, shipment.destination_city)}${shipment.weight_kg ? ` · ${shipment.weight_kg} kg` : ""}`,
        amountLabel: formatCurrency(latestPayment?.amount ?? routePrice ?? shipment.declared_value_cop ?? 0),
        paymentLabel: getPendingPaymentLabel(latestPayment?.status),
        checkoutHref,
        canCancel: canCancelPendingPaymentShipment({
          shipmentStatus: shipment.status,
          latestPayment,
          matchesForShipment,
        }),
      };
    });

  const activeShipmentsRaw = actionableShipmentsRaw.filter((shipment) =>
    isShipmentPaymentReady(latestPaymentByShipment.get(shipment.id)?.status)
  );

  let compatibleShipmentRows: CompatibleShipmentRow[] = [];
  if (openMatchingTrips.length > 0) {
    const validTripRoutes = Array.from(
      new Set(
        openMatchingTrips
          .map((trip) =>
            trip.origin_city_id && trip.destination_city_id
              ? `${trip.origin_city_id}:${trip.destination_city_id}`
              : null
          )
          .filter(Boolean)
      )
    ) as string[];

    if (validTripRoutes.length > 0) {
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          id,
          kind,
          description,
          weight_kg,
          owner_id,
          origin_city_id,
          destination_city_id,
          origin_city:cities!shipments_origin_city_id_fkey(name, iata_code),
          destination_city:cities!shipments_destination_city_id_fkey(name, iata_code)
        `)
        .eq("status", "open")
        .neq("owner_id", user.id);

      if (error) {
        throw new Error(`Error cargando envíos compatibles: ${error.message}`);
      }

      const compatibleShipmentCandidates = ((data ?? []) as CompatibleShipmentRow[]).filter(Boolean);
      const compatibleShipmentIds = compatibleShipmentCandidates.map((shipment) => shipment.id);
      const { data: readyShipmentRows } = compatibleShipmentIds.length
        ? await supabase.rpc("get_payment_ready_shipments", {
            p_shipment_ids: compatibleShipmentIds,
          })
        : { data: [] as { shipment_id: string }[] };

      const readyShipmentIds = new Set(
        ((readyShipmentRows ?? []) as { shipment_id: string }[])
          .map((row) => row.shipment_id)
          .filter(Boolean)
      );

      compatibleShipmentRows = compatibleShipmentCandidates.filter((shipment) => {
        const routeKey = shipment.origin_city_id && shipment.destination_city_id
          ? `${shipment.origin_city_id}:${shipment.destination_city_id}`
          : null;

        if (!routeKey) {
          return false;
        }

        return readyShipmentIds.has(shipment.id) && validTripRoutes.includes(routeKey);
      });
    }
  }

  const counterpartIds = Array.from(
    new Set([
      ...compatibleShipmentRows.map((shipment) => shipment.owner_id),
    ])
  );

  const { data: counterpartProfiles } = counterpartIds.length
    ? await supabase.rpc("get_public_profiles", { p_profile_ids: counterpartIds })
    : { data: [] as ProfileRow[] };

  const counterpartNameById = new Map<string, string>(
    (((counterpartProfiles ?? []) as ProfileRow[]) ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Usuario INTRA",
    ])
  );

  const counterpartRatingSummaryMap = await fetchRatingSummaryMap(supabase, counterpartIds);

  const compatibleRouteOriginIds = Array.from(
    new Set(compatibleShipmentRows.map((shipment) => shipment.origin_city_id).filter(Boolean))
  ) as string[];
  const compatibleRouteDestinationIds = Array.from(
    new Set(compatibleShipmentRows.map((shipment) => shipment.destination_city_id).filter(Boolean))
  ) as string[];

  const compatibleRoutePricesRes =
    compatibleRouteOriginIds.length && compatibleRouteDestinationIds.length
      ? await supabase
          .from("route_prices")
          .select("id, origin_city_id, destination_city_id, route_category, is_active")
          .eq("is_active", true)
          .in("origin_city_id", compatibleRouteOriginIds)
          .in("destination_city_id", compatibleRouteDestinationIds)
      : { data: [] as RoutePriceRow[] | null, error: null };

  const compatibleTravelerAmountByKey = new Map<string, number>(
    (((compatibleRoutePricesRes.data ?? []) as RoutePriceRow[]) ?? [])
      .flatMap((routePrice) => {
        if (!isRouteCategory(routePrice.route_category)) return [];

        return [[
          `${routePrice.origin_city_id}:${routePrice.destination_city_id}`,
          ROUTE_PRICING_BY_CATEGORY[routePrice.route_category].travelerAmount,
        ] as const];
      })
  );

  const initialEvidenceEligibleShipmentIds = compatibleShipmentRows
    .filter((shipment) =>
      openMatchingTrips.some(
        (trip) =>
          trip.origin_city_id === shipment.origin_city_id &&
          trip.destination_city_id === shipment.destination_city_id
      )
    )
    .map((shipment) => shipment.id);

  const initialEvidenceSignedUrlByShipmentId =
    await getInitialEvidenceSignedUrlByShipmentId(initialEvidenceEligibleShipmentIds);

  const compatibleShipments: DashboardCompatibleShipmentCard[] = compatibleShipmentRows
    .map((shipment) => {
      const matchingTrip = openMatchingTrips.find(
        (trip) =>
          trip.origin_city_id === shipment.origin_city_id &&
          trip.destination_city_id === shipment.destination_city_id
      );

      const routePriceKey = shipment.origin_city_id && shipment.destination_city_id
        ? `${shipment.origin_city_id}:${shipment.destination_city_id}`
        : null;
      const travelerAmount = routePriceKey ? compatibleTravelerAmountByKey.get(routePriceKey) ?? null : null;
      const initialPhotoUrl = matchingTrip
        ? initialEvidenceSignedUrlByShipmentId.get(shipment.id) ?? null
        : null;

      return {
        id: shipment.id,
        title: getShipmentKindLabel(shipment.kind),
        routeLabel: getRouteLabel(shipment.origin_city, shipment.destination_city),
        description: shipment.description?.trim() || null,
        weightLabel: shipment.weight_kg ? `${shipment.weight_kg} kg` : "Peso por confirmar",
        travelerEarningsLabel: travelerAmount ? formatCurrency(travelerAmount) : null,
        initialPhotoUrl,
        initialPhotoAlt: `Foto inicial del paquete ${getShipmentKindLabel(shipment.kind)}`,
        hasInitialPhoto: Boolean(initialPhotoUrl),
        customerName: counterpartNameById.get(shipment.owner_id) ?? "Usuario INTRA",
        customerAvgRating: counterpartRatingSummaryMap[shipment.owner_id]?.avgRating ?? null,
        customerTotalReviews: counterpartRatingSummaryMap[shipment.owner_id]?.totalReviews ?? 0,
        matchingTripId: matchingTrip?.id ?? null,
      };
    });

  const activeShipments = activeShipmentsRaw
    .map((shipment): DashboardShipmentCard => {
      const matchesForShipment = matchesByShipment.get(shipment.id) ?? [];
      const reportsForShipment = reportEventsByShipment.get(shipment.id) ?? [];
      const pendingMatch = matchesForShipment.find((match) => match.status === "pending") ?? null;
      const acceptedMatch =
        matchesForShipment.find((match) => match.status === "accepted") ??
        matchesForShipment.find((match) => match.status === "completed") ??
        null;
      const relevantMatch = pendingMatch ?? acceptedMatch;
      const relevantTrip = normalizeTripRelation(relevantMatch?.trip ?? null);
      const relevantTravelerId = relevantTrip?.traveler_id ?? null;
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
        code: shipment.tracking_code?.trim() || getShipmentCode(shipment.id),
        createdAt: shipment.created_at,
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
          ? `Viaja el ${formatDepartureLabel(relevantTrip.departure_date, relevantTrip.departure_time)}`
          : null,
        travelerCompletedDeliveriesCount: relevantTravelerId
          ? travelerCompletedDeliveriesCountById.get(relevantTravelerId) ?? 0
          : null,
        travelerVerified: relevantTravelerId ? travelerVerifiedSet.has(relevantTravelerId) : false,
        pendingMatchId: pendingMatch?.id ?? null,
        hasPendingAction: Boolean(pendingMatch),
        canCancelWaitingTraveler: canCancelWaitingTravelerShipment({
          shipmentStatus: shipment.status,
          latestPayment: latestPayment ?? null,
          matchesForShipment,
          reportsForShipment,
        }),
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
        status: (trip.status === "full" || trip.status === "closed" || trip.status === "completed" || trip.status === "cancelled"
          ? trip.status
          : "open") as DashboardTripCard["status"],
        routeShortLabel: getRouteShortLabel(trip.origin_city, trip.destination_city),
        departureDateLabel: formatDepartureLabel(trip.departure_date, trip.departure_time),
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
        .select("id, shipment_id, amount, traveler_amount, status, created_at, updated_at")
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

  const getTravelerRevenue = (payment: PaymentRow) => payment.traveler_amount ?? payment.amount ?? 0;

  const currentRevenueTotal = monthPayments.reduce((sum, payment) => sum + getTravelerRevenue(payment), 0);
  const previousRevenueTotal = previousMonthPayments.reduce((sum, payment) => sum + getTravelerRevenue(payment), 0);
  const revenueDeliveriesCount = monthPayments.length;

  const routeRevenue = new Map<string, number>();
  for (const payment of monthPayments) {
    if (!payment.shipment_id) continue;
    const shipment = shipmentById.get(payment.shipment_id);
    if (!shipment) continue;
    const routeLabel = getRouteShortLabel(shipment.origin_city, shipment.destination_city);
    routeRevenue.set(routeLabel, (routeRevenue.get(routeLabel) ?? 0) + getTravelerRevenue(payment));
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
    onboardingCompleted: profile?.onboarding_completed ?? false,
    onboardingIntent: profile?.onboarding_intent ?? null,
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
    compatibleShipments,
    publishedTrips,
    recentActivity,
    monthlyRevenue,
  };
}
