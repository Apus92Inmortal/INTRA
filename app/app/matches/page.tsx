export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import { createClient } from "@/lib/supabase/server";
import MatchesListClient from "./MatchesListClient";

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type MatchRow = {
  id: string;
  status: string;
  created_at: string;
  trip_id: string;
  shipment_id: string;
  last_read_by_traveler: string | null;
  last_read_by_owner: string | null;
  trip: {
    id: string;
    traveler_id: string;
    departure_date: string | null;
    capacity_kg: number | null;
    origin_city?: { name: string } | null;
    destination_city?: { name: string } | null;
  } | null;
  shipment: {
    id: string;
    owner_id: string;
    kind: string | null;
    description: string | null;
    weight_kg: number | null;
    declared_value_cop: number | null;
    origin_city?: { name: string } | null;
    destination_city?: { name: string } | null;
  } | null;
};

type HydratedMatchRow = MatchRow & {
  latestMessage: MessageRow | null;
  unreadCount: number;
};

export default async function MatchesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(`
      id,
      status,
      created_at,
      trip_id,
      shipment_id,
      last_read_by_traveler,
      last_read_by_owner,
      trip:trips (
        id,
        traveler_id,
        departure_date,
        capacity_kg,
        origin_city:cities!trips_origin_city_id_fkey (
          name
        ),
        destination_city:cities!trips_destination_city_id_fkey (
          name
        )
      ),
      shipment:shipments (
        id,
        owner_id,
        kind,
        description,
        weight_kg,
        declared_value_cop,
        origin_city:cities!shipments_origin_city_id_fkey (
          name
        ),
        destination_city:cities!shipments_destination_city_id_fkey (
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (matchesError) {
    return (
      <>
        <AppNavbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            Error cargando matches: {matchesError.message}
          </div>
        </main>
      </>
    );
  }

  const allMatches = (matchesData ?? []) as unknown as MatchRow[];

  const userMatches = allMatches.filter((match) => {
    const isTraveler = match.trip?.traveler_id === user.id;
    const isOwner = match.shipment?.owner_id === user.id;
    return isTraveler || isOwner;
  });

  const matchIds = userMatches.map((match) => match.id);

  const latestMessagesMap = new Map<string, MessageRow>();
  const unreadCountMap = new Map<string, number>();

  if (matchIds.length > 0) {
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("id, match_id, sender_id, message, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });

    if (messagesError) {
      return (
        <>
          <AppNavbar />
          <main className="mx-auto max-w-5xl px-4 py-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              Error cargando mensajes: {messagesError.message}
            </div>
          </main>
        </>
      );
    }

    const messages = (messagesData ?? []) as MessageRow[];

    for (const msg of messages) {
      if (!latestMessagesMap.has(msg.match_id)) {
        latestMessagesMap.set(msg.match_id, msg);
      }
    }

    for (const match of userMatches) {
      const isTraveler = match.trip?.traveler_id === user.id;
      const lastReadAt = isTraveler
        ? match.last_read_by_traveler
        : match.last_read_by_owner;

      const unreadCount = messages.filter((msg) => {
        if (msg.match_id !== match.id) return false;
        if (msg.sender_id === user.id) return false;

        if (!lastReadAt) {
          return true;
        }

        return (
          new Date(msg.created_at).getTime() > new Date(lastReadAt).getTime()
        );
      }).length;

      unreadCountMap.set(match.id, unreadCount);
    }
  }

  const hydratedMatches: HydratedMatchRow[] = userMatches.map((match) => ({
    ...match,
    latestMessage: latestMessagesMap.get(match.id) ?? null,
    unreadCount: unreadCountMap.get(match.id) ?? 0,
  }));

  return (
    <>
      <AppNavbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis matches</h1>
            <p className="mt-1 text-sm text-slate-600">
              Revisa tus coincidencias, estado y último mensaje.
            </p>
          </div>
        </div>

        <MatchesListClient
          currentUserId={user.id}
          initialMatches={hydratedMatches}
        />
      </main>
    </>
  );
}