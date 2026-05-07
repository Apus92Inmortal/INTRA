create or replace function public.is_match_traveler(
  p_match_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.matches m
    join public.trips t on t.id = m.trip_id
    where m.id = p_match_id
      and t.traveler_id = p_user_id
  );
$function$;

drop policy if exists "Shipment participants can create report events" on public.shipment_report_events;
create policy "Travelers can create report events"
  on public.shipment_report_events
  for insert
  to authenticated
  with check (
    reported_by = auth.uid()
    and match_id is not null
    and public.is_shipment_participant(shipment_id, auth.uid())
    and public.is_match_traveler(match_id, auth.uid())
  );
