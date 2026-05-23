begin;

create table if not exists public.user_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_key text not null,
  policy_version text not null,
  acceptance_flow text not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_policy_acceptances
  drop constraint if exists user_policy_acceptances_policy_key_check;
alter table public.user_policy_acceptances
  add constraint user_policy_acceptances_policy_key_check
  check (
    policy_key = any (
      array[
        'terms-conditions'::text,
        'privacy-policy'::text,
        'shipping-policy'::text,
        'payments-policy'::text
      ]
    )
  );

alter table public.user_policy_acceptances enable row level security;

drop policy if exists user_policy_acceptances_select_own on public.user_policy_acceptances;
create policy user_policy_acceptances_select_own
  on public.user_policy_acceptances
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.user_policy_acceptances from anon, authenticated;
grant select on public.user_policy_acceptances to authenticated;
grant all on public.user_policy_acceptances to service_role;

create index if not exists user_policy_acceptances_user_policy_idx
  on public.user_policy_acceptances (user_id, policy_key, policy_version, accepted_at desc);

create index if not exists user_policy_acceptances_flow_idx
  on public.user_policy_acceptances (acceptance_flow, accepted_at desc);

create or replace function public.record_policy_acceptance(
  p_policy_key text,
  p_policy_version text,
  p_acceptance_flow text default 'manual',
  p_user_agent text default null,
  p_ip_address inet default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_policy_key is null or p_policy_key not in (
    'terms-conditions',
    'privacy-policy',
    'shipping-policy',
    'payments-policy'
  ) then
    return jsonb_build_object('success', false, 'error', 'invalid_policy_key');
  end if;

  if nullif(btrim(coalesce(p_policy_version, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'invalid_policy_version');
  end if;

  insert into public.user_policy_acceptances (
    user_id,
    policy_key,
    policy_version,
    acceptance_flow,
    user_agent,
    ip_address,
    metadata
  )
  values (
    v_actor,
    p_policy_key,
    btrim(p_policy_version),
    coalesce(nullif(btrim(p_acceptance_flow), ''), 'manual'),
    nullif(btrim(coalesce(p_user_agent, '')), ''),
    p_ip_address,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object('success', true);
end;
$function$;

revoke execute on function public.record_policy_acceptance(text, text, text, text, inet, jsonb)
  from public, anon;
grant execute on function public.record_policy_acceptance(text, text, text, text, inet, jsonb)
  to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_policy_acceptances jsonb := coalesce(new.raw_user_meta_data -> 'policy_acceptances', '{}'::jsonb);
  v_full_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, v_full_name, v_phone)
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone);

  if coalesce(v_policy_acceptances #>> '{terms-conditions,accepted}', 'false') = 'true' then
    insert into public.user_policy_acceptances (
      user_id,
      policy_key,
      policy_version,
      acceptance_flow,
      metadata
    )
    values (
      new.id,
      'terms-conditions',
      coalesce(nullif(v_policy_acceptances #>> '{terms-conditions,version}', ''), '1.0'),
      coalesce(nullif(v_policy_acceptances #>> '{terms-conditions,flow}', ''), 'registration'),
      jsonb_build_object('source', 'signup_metadata')
    );
  end if;

  if coalesce(v_policy_acceptances #>> '{privacy-policy,accepted}', 'false') = 'true' then
    insert into public.user_policy_acceptances (
      user_id,
      policy_key,
      policy_version,
      acceptance_flow,
      metadata
    )
    values (
      new.id,
      'privacy-policy',
      coalesce(nullif(v_policy_acceptances #>> '{privacy-policy,version}', ''), '1.0'),
      coalesce(nullif(v_policy_acceptances #>> '{privacy-policy,flow}', ''), 'registration'),
      jsonb_build_object('source', 'signup_metadata')
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
