create or replace function public.is_shipment_participant(
  p_shipment_id uuid,
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
    from public.shipments s
    where s.id = p_shipment_id
      and s.owner_id = p_user_id
  )
  or exists (
    select 1
    from public.matches m
    join public.trips t on t.id = m.trip_id
    where m.shipment_id = p_shipment_id
      and t.traveler_id = p_user_id
  );
$function$;

create table if not exists public.shipment_evidence (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  evidence_type text not null
    check (evidence_type = any (array['pickup'::text, 'delivery'::text, 'package_state'::text])),
  file_path text not null,
  file_name text,
  mime_type text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists shipment_evidence_shipment_idx on public.shipment_evidence (shipment_id, created_at desc);
create index if not exists shipment_evidence_match_idx on public.shipment_evidence (match_id, created_at desc);

alter table public.shipment_evidence enable row level security;

drop policy if exists "Shipment participants can view evidence" on public.shipment_evidence;
create policy "Shipment participants can view evidence"
  on public.shipment_evidence
  for select
  to authenticated
  using (public.is_shipment_participant(shipment_id, auth.uid()));

drop policy if exists "Shipment participants can upload own evidence" on public.shipment_evidence;
create policy "Shipment participants can upload own evidence"
  on public.shipment_evidence
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_shipment_participant(shipment_id, auth.uid())
  );

create table if not exists public.shipment_report_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  report_type text not null
    check (report_type = any (array['suspicious_package'::text, 'incident'::text, 'other'::text])),
  reason text not null,
  status text not null default 'open'
    check (status = any (array['open'::text, 'reviewing'::text, 'resolved'::text])),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists shipment_report_events_shipment_idx on public.shipment_report_events (shipment_id, created_at desc);
create index if not exists shipment_report_events_match_idx on public.shipment_report_events (match_id, created_at desc);

alter table public.shipment_report_events enable row level security;

drop policy if exists "Shipment participants can view report events" on public.shipment_report_events;
create policy "Shipment participants can view report events"
  on public.shipment_report_events
  for select
  to authenticated
  using (public.is_shipment_participant(shipment_id, auth.uid()));

drop policy if exists "Shipment participants can create report events" on public.shipment_report_events;
create policy "Shipment participants can create report events"
  on public.shipment_report_events
  for insert
  to authenticated
  with check (
    reported_by = auth.uid()
    and public.is_shipment_participant(shipment_id, auth.uid())
  );

insert into storage.buckets (id, name, public)
values ('identity-verification', 'identity-verification', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('shipment-evidence', 'shipment-evidence', false)
on conflict (id) do nothing;

drop policy if exists "Users manage own identity verification files" on storage.objects;
create policy "Users manage own identity verification files"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'identity-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'identity-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Shipment participants can view shipment evidence files" on storage.objects;
create policy "Shipment participants can view shipment evidence files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'shipment-evidence'
    and public.is_shipment_participant(((storage.foldername(name))[2])::uuid, auth.uid())
  );

drop policy if exists "Shipment participants can upload own shipment evidence files" on storage.objects;
create policy "Shipment participants can upload own shipment evidence files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shipment-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_shipment_participant(((storage.foldername(name))[2])::uuid, auth.uid())
  );

drop policy if exists "Shipment participants can update own shipment evidence files" on storage.objects;
create policy "Shipment participants can update own shipment evidence files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'shipment-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'shipment-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_shipment_participant(((storage.foldername(name))[2])::uuid, auth.uid())
  );

drop policy if exists "Shipment participants can delete own shipment evidence files" on storage.objects;
create policy "Shipment participants can delete own shipment evidence files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'shipment-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
