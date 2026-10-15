begin;

-- A06 reconciles the inspected Production policy/function drift; do not replay
-- the historical migrations or rewrite their migration-history records.
-- Clients create/transition shipments, trips and matches through existing
-- authenticated RPCs. Server actions use service_role after their own guards.
create or replace function public.can_view_shipment(p_shipment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.shipments s
        where s.id = p_shipment_id and s.owner_id = auth.uid()
      )
      or public.is_match_participant_for_shipment(p_shipment_id)
      or exists (
        select 1 from public.shipments s
        where s.id = p_shipment_id
          and s.status = 'open'
          and s.owner_id <> auth.uid()
          and public.is_shipment_payment_ready(s.id)
      )
    );
$function$;

-- Remove every inspected permissive legacy policy for these workflow tables.
-- Their grants are separately restricted, so another legacy write policy
-- cannot bypass request/accept/reject/cancel or edit a financial state.
do $policies$
declare
  v_policy record;
begin
  for v_policy in
    select tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('shipments', 'trips', 'matches', 'messages')
  loop
    execute format('drop policy %I on public.%I', v_policy.policyname, v_policy.tablename);
  end loop;
end;
$policies$;

alter table public.shipments enable row level security;
alter table public.trips enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

create policy shipments_select_contextual on public.shipments
for select to authenticated using (public.can_view_shipment(id));

create policy trips_select_contextual on public.trips
for select to authenticated using (
  traveler_id = (select auth.uid())
  or status in ('open', 'full')
  or public.is_match_participant_for_trip(id)
);

create policy matches_select_participants on public.matches
for select to authenticated using (public.is_match_participant(id));

create policy messages_select_participants on public.messages
for select to authenticated using (public.is_match_participant(match_id));

create policy messages_insert_accepted on public.messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id and m.status = 'accepted'
      and public.is_match_participant(m.id)
  )
);

revoke all privileges on table public.shipments, public.trips, public.matches,
  public.messages from public, anon, authenticated;
grant select on table public.shipments, public.trips, public.matches,
  public.messages to authenticated;
grant insert on table public.messages to authenticated;

-- Anon has no use for contextual/authenticated RPCs or private-data helpers.
CREATE OR REPLACE FUNCTION public.request_match(p_shipment_id uuid, p_trip_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_match_id uuid;
  v_active_matches integer := 0;
  v_is_verified_v1 boolean := false;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_shipment_id is null or p_trip_id is null then
    return jsonb_build_object('success', false, 'error', 'match_route_required');
  end if;

  -- Serialize requests with cancellation/refund (shipment is their first
  -- lock). A foreign-key wait during INSERT is too late: an earlier state
  -- check could otherwise allow a pending match on an already-cancelled row.
  perform 1 from public.shipments s
  where s.id = p_shipment_id
  for update;

  v_is_verified_v1 := public.is_user_verified_v1(v_actor);

  if not v_is_verified_v1 then
    select count(*)
    into v_active_matches
    from public.matches m
    join public.shipments s on s.id = m.shipment_id
    where m.requester_id = v_actor
      and m.status in ('pending', 'accepted')
      and coalesce(s.status, 'open') not in ('delivered', 'cancelled');

    if v_active_matches >= 1 then
      return jsonb_build_object(
        'success', false,
        'error', 'active_match_limit_exceeded',
        'active_match_limit', 1
      );
    end if;
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

-- The one intentionally public SECURITY DEFINER routine is the read-only
-- price calculator. Preserve authenticated and server grants on the rest.
do $rpc_acl$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname <> 'calculate_payment_amount'
  loop
    execute format('revoke execute on function %s from public, anon', v_function.signature);
  end loop;
end;
$rpc_acl$;

-- Trigger execution is internal, with the existing postgres owner. Removing
-- direct API EXECUTE does not prevent an installed trigger from firing.
revoke execute on function public.handle_new_user(),
  public.notify_match_requested(),
  public.notify_payment_operational_event(),
  public.notify_payout_account_operational_event(),
  public.notify_payout_operational_event(),
  public.notify_shipment_report_operational_event(),
  public.notify_user_verification_operational_event()
from public, anon, authenticated, service_role;

revoke execute on function public.generate_payout_code() from public, anon, authenticated;
alter function public.generate_payout_code() set search_path = '';
alter function public.notify_match_requested() set search_path = '';

-- New postgres functions must opt into anon access explicitly. Keep the
-- authenticated/server defaults unchanged for compatibility with this repo.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

notify pgrst, 'reload schema';
commit;
