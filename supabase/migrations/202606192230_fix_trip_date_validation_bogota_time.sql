-- fix: validate trip departure using Bogota time
-- Prevents UTC rollover issues where trips for "today" in Colombia
-- are rejected because UTC is already "tomorrow".

begin;

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

  -- Validation using Bogota time to prevent UTC rollover issues.
  -- Allows publication for today in Colombia if the specific time is in the future.
  -- If no time is provided, we use 23:59:59 as a safe fallback to allow "any time today".
  if p_departure_date is null or 
     (p_departure_date + coalesce(p_departure_time, time '23:59:59')) < (current_timestamp at time zone 'America/Bogota') then
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

grant execute on function public.create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
