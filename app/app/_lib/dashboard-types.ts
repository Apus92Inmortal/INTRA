export type DashboardUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  showWelcomeModal: boolean;
};

export type DashboardSummary = {
  activityTodayCount: number;
  activeShipmentsCount: number;
  publishedTripsCount: number;
  pendingActionMatchesCount: number;
  completedDeliveriesCount: number;
};

export type DashboardShipmentStatus =
  | "open"
  | "matched"
  | "accepted"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type DashboardShipmentCard = {
  id: string;
  code: string;
  title: string;
  routeLabel: string;
  weightKg: number | null;
  amountLabel: string;
  status: DashboardShipmentStatus;
  statusLabel: string;
  progressPercent: number;
  progressLabel: string;
  travelerName: string | null;
  travelerDepartureLabel: string | null;
  travelerRatingLabel: string | null;
  pendingMatchId: string | null;
  hasPendingAction: boolean;
};

export type DashboardPendingPaymentShipmentCard = {
  id: string;
  code: string;
  title: string;
  routeLabel: string;
  amountLabel: string;
  paymentLabel: string;
  checkoutHref: string;
};

export type DashboardCompatibleShipmentCard = {
  id: string;
  title: string;
  routeLabel: string;
  description: string | null;
  weightLabel: string;
  customerName: string;
  customerAvgRating: number | null;
  customerTotalReviews: number;
  matchingTripId: string | null;
};

export type DashboardTripCard = {
  id: string;
  routeShortLabel: string;
  departureDateLabel: string;
  usedCapacityKg: number;
  totalCapacityKg: number;
  availabilityLabel: string;
  statusLabel: string;
  progressPercent: number;
};

export type DashboardActivityIcon =
  | "match"
  | "shipment"
  | "message"
  | "trip"
  | "payment"
  | "alert"
  | "default";

export type DashboardActivityItem = {
  id: string;
  title: string;
  relativeTimeLabel: string;
  href: string | null;
  icon: DashboardActivityIcon;
};

export type DashboardRevenueSummary = {
  monthLabel: string;
  releasedAmount: number;
  releasedAmountLabel: string;
  deliveriesCount: number;
  averageTicketLabel: string;
  bestRouteLabel: string;
  deltaVsPreviousMonthLabel: string | null;
};

export type DashboardData = {
  user: DashboardUser;
  summary: DashboardSummary;
  activeShipments: DashboardShipmentCard[];
  pendingPaymentShipments: DashboardPendingPaymentShipmentCard[];
  compatibleShipments: DashboardCompatibleShipmentCard[];
  publishedTrips: DashboardTripCard[];
  recentActivity: DashboardActivityItem[];
  monthlyRevenue: DashboardRevenueSummary;
};
