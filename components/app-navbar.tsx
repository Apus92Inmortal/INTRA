import { createClient } from "@/lib/supabase/server";
import {
  AppNavbarClient,
  type AppNavbarContext,
} from "@/components/app-navbar-client";

type ShipmentRow = {
  id: string;
  status: string | null;
};

type TripRow = {
  status: string | null;
};

async function getAppNavbarContext(): Promise<AppNavbarContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hasSession: false,
      fullName: null,
      activeShipmentsCount: 0,
      publishedTripsCount: 0,
      pendingMatchesCount: 0,
    };
  }

  const [profileRes, shipmentsRes, tripsRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("shipments").select("id, status").eq("owner_id", user.id),
    supabase.from("trips").select("status").eq("traveler_id", user.id),
  ]);

  const shipments = ((shipmentsRes.data ?? []) as ShipmentRow[]).filter(Boolean);
  const trips = ((tripsRes.data ?? []) as TripRow[]).filter(Boolean);

  const activeShipmentsCount = shipments.filter((shipment) =>
    ["open", "matched", "accepted", "in_transit"].includes(shipment.status ?? "")
  ).length;

  const publishedTripsCount = trips.filter((trip) =>
    ["open", "full"].includes(trip.status ?? "")
  ).length;

  const shipmentIds = shipments.map((shipment) => shipment.id).filter(Boolean);

  const pendingMatchesRes = shipmentIds.length
    ? await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .in("shipment_id", shipmentIds)
        .eq("status", "pending")
    : { count: 0 };

  return {
    hasSession: true,
    fullName: profileRes.data?.full_name ?? null,
    activeShipmentsCount,
    publishedTripsCount,
    pendingMatchesCount: pendingMatchesRes.count ?? 0,
  };
}

export async function AppNavbar() {
  const context = await getAppNavbarContext();
  return <AppNavbarClient context={context} />;
}
