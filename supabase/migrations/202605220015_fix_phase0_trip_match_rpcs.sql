begin;

-- Hotfix: recreate the Phase 0 RPCs used by the deployed UI and force
-- PostgREST to reload its schema cache.

create or replace function public.is_shipment_payment_ready(p_shipment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.payments p
    where p.shipment_id = p_shipment_id
      and p.status = 'held'
      and lower(coalesce(p.gateway_status, '')) = 'approved'
      and coalesce(p.refund_status, 'none') = 'none'
      and coalesce(p.dispute_status, 'none') = 'none'
      and lower(coalesce(p.metadata ->> 'manual_refund_required', 'false')) <> 'true'
    order by p.created_at desc, p.updated_at desc, p.id desc
    limit 1
  );
$function$;

create or replace function public.mark_match_read(
  p_match_id uuid,
  p_read_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_traveler_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select s.owner_id, t.traveler_id
  into v_owner_id, v_traveler_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
  where m.id = p_match_id;

  if v_owner_id is null then
    return jsonb_build_object('success', false, 'error', 'match_not_found');
  end if;

  if v_actor = v_owner_id then
    update public.matches
    set last_read_by_owner = p_read_at
    where id = p_match_id;
  elsif v_actor = v_traveler_id then
    update public.matches
    set last_read_by_traveler = p_read_at
    where id = p_match_id;
  else
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  return jsonb_build_object('success', true, 'read_at', p_read_at);
end;
$function$;

create or replace function public.request_match(
  p_shipment_id uuid,
  p_trip_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_match_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_shipment_id is null or p_trip_id is null then
    return jsonb_build_object('success', false, 'error', 'match_route_required');
  end if;

  if not exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and t.traveler_id = v_actor
      and t.status in ('open', 'full')
  ) then
    return jsonb_build_object('success', false, 'error', 'trip_not_available');
  end if;

  if not exists (
    select 1
    from public.shipments s
    where s.id = p_shipment_id
      and s.owner_id <> v_actor
      and s.status = 'open'
      and public.is_shipment_payment_ready(s.id)
  ) then
    return jsonb_build_object('success', false, 'error', 'shipment_not_available');
  end if;

  insert into public.matches (
    shipment_id,
    trip_id,
    requester_id,
    status
  ) values (
    p_shipment_id,
    p_trip_id,
    v_actor,
    'pending'
  )
  returning id into v_match_id;

  return jsonb_build_object('success', true, 'match_id', v_match_id);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'match_already_requested');
end;
$function$;

create or replace function public.create_trip(
  p_origin_city_id uuid,
  p_destination_city_id uuid,
  p_departure_date date,
  p_departure_time time default null,
  p_capacity_kg numeric default null,
  p_flight_number text default null,
  p_accepts_fragile boolean default false,
  p_accepts_multiple_packages boolean default false,
  p_has_stopovers boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_trip_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_origin_city_id is null or p_destination_city_id is null then
    return jsonb_build_object('success', false, 'error', 'route_required');
  end if;

  if p_origin_city_id = p_destination_city_id then
    return jsonb_build_object('success', false, 'error', 'same_route');
  end if;

  if p_departure_date is null or p_departure_date < current_date then
    return jsonb_build_object('success', false, 'error', 'invalid_departure_date');
  end if;

  if p_capacity_kg is not null and p_capacity_kg <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_capacity');
  end if;

  insert into public.trips (
    traveler_id,
    origin_city_id,
    destination_city_id,
    departure_date,
    departure_time,
    capacity_kg,
    flight_number,
    accepts_fragile,
    accepts_multiple_packages,
    has_stopovers,
    status
  ) values (
    v_actor,
    p_origin_city_id,
    p_destination_city_id,
    p_departure_date,
    p_departure_time,
    p_capacity_kg,
    nullif(btrim(coalesce(p_flight_number, '')), ''),
    coalesce(p_accepts_fragile, false),
    coalesce(p_accepts_multiple_packages, false),
    coalesce(p_has_stopovers, false),
    'open'
  )
  returning id into v_trip_id;

  return jsonb_build_object('success', true, 'trip_id', v_trip_id);
end;
$function$;

grant execute on function public.mark_match_read(uuid, timestamptz) to anon, authenticated;
grant execute on function public.request_match(uuid, uuid) to anon, authenticated;
grant execute on function public.create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
