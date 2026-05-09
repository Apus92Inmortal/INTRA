alter table public.trips drop constraint if exists trips_status_check;

alter table public.trips
  add constraint trips_status_check
  check (status = any (array['open'::text, 'full'::text, 'closed'::text, 'completed'::text, 'cancelled'::text]));

create or replace function public.close_trip(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_trip public.trips;
  v_cancelled_match record;
  v_cancelled_match_ids uuid[] := '{}'::uuid[];
  v_cancelled_count integer := 0;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'No autenticado');
  end if;

  select *
  into v_trip
  from public.trips
  where id = p_trip_id
  for update;

  if v_trip.id is null then
    return jsonb_build_object('success', false, 'error', 'Viaje no encontrado');
  end if;

  if v_trip.traveler_id <> v_actor then
    return jsonb_build_object('success', false, 'error', 'No autorizado');
  end if;

  if v_trip.status not in ('open', 'full') then
    return jsonb_build_object('success', false, 'error', 'Este viaje ya no puede cerrarse');
  end if;

  update public.trips
  set status = 'closed'
  where id = p_trip_id;

  for v_cancelled_match in
    update public.matches m
    set status = 'cancelled'
    where m.trip_id = p_trip_id
      and m.status = 'pending'
    returning m.id, m.shipment_id
  loop
    v_cancelled_count := v_cancelled_count + 1;
    v_cancelled_match_ids := array_append(v_cancelled_match_ids, v_cancelled_match.id);

    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_match_id
    )
    select
      s.owner_id,
      'match_cancelled',
      'El viaje ya no recibe solicitudes',
      'El viajero cerró su viaje y esta solicitud pendiente fue cancelada.',
      v_cancelled_match.id
    from public.shipments s
    where s.id = v_cancelled_match.shipment_id;
  end loop;

  return jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'cancelled_count', v_cancelled_count,
    'cancelled_match_ids', to_jsonb(v_cancelled_match_ids)
  );
end;
$function$;

grant execute on function public.close_trip(uuid) to authenticated;
