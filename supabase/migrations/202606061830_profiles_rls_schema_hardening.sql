-- PR F1: close broad profile reads and expose only minimal contextual public data.

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists profiles_select_related_or_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select auth.uid() is not null
    and (
      p_profile_id = auth.uid()
      or exists (
        select 1
        from public.matches m
        join public.shipments s on s.id = m.shipment_id
        join public.trips t on t.id = m.trip_id
        where
          (s.owner_id = auth.uid() and t.traveler_id = p_profile_id)
          or
          (t.traveler_id = auth.uid() and s.owner_id = p_profile_id)
      )
    );
$function$;

create or replace function public.can_view_public_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select auth.uid() is not null
    and (
      p_profile_id = auth.uid()
      or public.can_view_profile(p_profile_id)
      or exists (
        select 1
        from public.trips t
        where t.traveler_id = p_profile_id
          and t.status in ('open', 'full')
      )
      or exists (
        select 1
        from public.shipments s
        where s.owner_id = p_profile_id
          and s.status = 'open'
          and exists (
            select 1
            from public.payments p
            where p.shipment_id = s.id
              and p.status = 'held'
              and lower(coalesce(p.gateway_status, '')) = 'approved'
              and coalesce(p.refund_status, 'none') = 'none'
              and coalesce(p.dispute_status, 'none') = 'none'
              and lower(coalesce(p.metadata ->> 'manual_refund_required', 'false')) <> 'true'
            limit 1
          )
      )
    );
$function$;

create or replace function public.get_public_profiles(p_profile_ids uuid[])
returns table (
  id uuid,
  full_name text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id, p.full_name
  from public.profiles p
  where p.id = any(coalesce(p_profile_ids, '{}'::uuid[]))
    and public.can_view_public_profile(p.id);
$function$;

create policy profiles_select_self
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

revoke execute on function public.can_view_profile(uuid) from public, anon;
revoke execute on function public.can_view_public_profile(uuid) from public, anon;
revoke execute on function public.get_public_profiles(uuid[]) from public, anon;

grant execute on function public.can_view_profile(uuid) to authenticated, service_role;
grant execute on function public.can_view_public_profile(uuid) to authenticated, service_role;
grant execute on function public.get_public_profiles(uuid[]) to authenticated, service_role;
