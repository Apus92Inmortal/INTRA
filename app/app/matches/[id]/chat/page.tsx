import { notFound, redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import { createClient } from "@/lib/supabase/server";
import MatchChatClient from "./MatchChatClient";

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchChatPage({ params }: PageProps) {
  const { id: matchId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      id,
      status,
      last_read_by_owner,
      last_read_by_traveler,
      trip:trips!matches_trip_id_fkey (
        traveler_id
      ),
      shipment:shipments!matches_shipment_id_fkey (
        owner_id
      )
    `)
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    notFound();
  }

  const travelerId = match.trip?.traveler_id ?? null;
  const ownerId = match.shipment?.owner_id ?? null;

  const isTraveler = travelerId === user.id;
  const isOwner = ownerId === user.id;

  if (!isTraveler && !isOwner) {
    notFound();
  }

  if (match.status !== "accepted") {
    redirect(`/app/matches/${matchId}`);
  }

  const viewerRole = isTraveler ? "traveler" : "owner";
  const otherUserId = isTraveler ? ownerId : travelerId;

  if (!otherUserId) {
    throw new Error("No se pudo identificar al otro usuario del chat.");
  }

  const { data: messagesData, error: messagesError } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, message, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(`Error cargando mensajes: ${messagesError.message}`);
  }

  return (
    <>
      <AppNavbar />
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col px-0 sm:px-4 sm:py-6">
        <MatchChatClient
          matchId={matchId}
          currentUserId={user.id}
          otherUserId={otherUserId}
          initialMessages={(messagesData ?? []) as Message[]}
          viewerRole={viewerRole}
          lastReadByOwner={match.last_read_by_owner}
          lastReadByTraveler={match.last_read_by_traveler}
        />
      </main>
    </>
  );
}
