import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchDetailActions from "./MatchDetailActions";
import { acceptMatchAction, cancelMatchAction } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      id,
      status,
      created_at,
      trip_id,
      shipment_id,
      trips (
        id,
        traveler_id,
        capacity_kg,
        departure_date,
        origin_city_id,
        destination_city_id
      ),
      shipments (
        id,
        owner_id,
        kind,
        description,
        weight_kg,
        declared_value_cop,
        origin_city_id,
        destination_city_id
      )
    `)
    .eq("id", id)
    .single();

  if (error || !match) {
    notFound();
  }

  const trip = Array.isArray(match.trips) ? match.trips[0] : match.trips;
  const shipment = Array.isArray(match.shipments) ? match.shipments[0] : match.shipments;

  const isOwner = user.id === shipment?.owner_id;
  const isTraveler = user.id === trip?.traveler_id;

  const canAccept = isOwner && match.status === "pending";
  const canCancel =
    (isOwner || isTraveler) &&
    (match.status === "pending" || match.status === "accepted");

  const canOpenChat = match.status === "accepted";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Detalle del match</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Envío</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="font-medium">Tipo:</span> {shipment?.kind}</p>
              <p><span className="font-medium">Descripción:</span> {shipment?.description}</p>
              <p><span className="font-medium">Peso:</span> {shipment?.weight_kg} kg</p>
              <p><span className="font-medium">Valor:</span> ${shipment?.declared_value_cop}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Viaje</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="font-medium">Capacidad:</span> {trip?.capacity_kg} kg</p>
              <p><span className="font-medium">Salida:</span> {trip?.departure_date}</p>
              <p><span className="font-medium">Estado:</span> {match.status}</p>
            </div>
          </div>
        </div>

        <MatchDetailActions
          matchId={match.id}
          status={match.status}
          canAccept={canAccept}
          canCancel={canCancel}
          onAccept={acceptMatchAction}
          onCancel={cancelMatchAction}
        />

        <div className="mt-6 flex flex-wrap gap-3">
          {canOpenChat ? (
            <Link
              href={`/app/matches/${match.id}/chat`}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Abrir chat
            </Link>
          ) : (
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
              El chat se habilita cuando el match sea aceptado
            </div>
          )}

          <Link
            href="/app/matches"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Volver a matches
          </Link>
        </div>
      </div>
    </main>
  );
}