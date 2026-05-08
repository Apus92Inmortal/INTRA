-- INTRA public schema snapshot
-- Generated from linked Supabase project on 2026-04-24T01:56:55.180Z
-- Scope: schema public only
-- Excludes Supabase-managed system schemas and global role/grant configuration.

-- Installed extensions in the linked project (reference only)
-- - pg_graphql (schema: graphql)
-- - pg_stat_statements (schema: extensions)
-- - pgcrypto (schema: extensions)
-- - plpgsql (schema: pg_catalog)
-- - supabase_vault (schema: vault)
-- - uuid-ossp (schema: extensions)

create table if not exists public."cities" (
    "id" uuid default gen_random_uuid() not null,
    "name" text not null,
    "department" text not null,
    "iata_code" text,
    "created_at" timestamp with time zone default now()
);

create table if not exists public."matches" (
    "id" uuid default gen_random_uuid() not null,
    "shipment_id" uuid not null,
    "trip_id" uuid not null,
    "requester_id" uuid not null,
    "status" text default 'pending'::text not null,
    "created_at" timestamp with time zone default now(),
    "last_read_by_traveler" timestamp with time zone,
    "last_read_by_owner" timestamp with time zone
);

create table if not exists public."messages" (
    "id" uuid default gen_random_uuid() not null,
    "match_id" uuid,
    "sender_id" uuid,
    "message" text not null,
    "created_at" timestamp with time zone default now()
);

create table if not exists public."notifications" (
    "id" uuid default gen_random_uuid() not null,
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "message" text not null,
    "related_match_id" uuid,
    "is_read" boolean default false not null,
    "created_at" timestamp with time zone default now() not null,
    "read_at" timestamp with time zone
);

create table if not exists public."payments" (
    "id" uuid default gen_random_uuid() not null,
    "match_id" uuid,
    "amount" numeric default 0 not null,
    "status" text default 'pending'::text not null,
    "created_at" timestamp with time zone default now() not null,
    "shipment_id" uuid,
    "user_id" uuid,
    "payment_method" text,
    "external_reference" text,
    "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."profiles" (
    "id" uuid not null,
    "full_name" text,
    "phone" text,
    "document_number" text,
    "city_id" uuid,
    "created_at" timestamp without time zone default now(),
    "show_welcome_modal" boolean default true not null
);

comment on table public."profiles" is 'Table de Perfiles';

create table if not exists public."route_prices" (
    "id" uuid default gen_random_uuid() not null,
    "origin_city_id" uuid not null,
    "destination_city_id" uuid not null,
    "route_category" text not null,
    "base_price" integer not null,
    "customer_price" integer not null,
    "is_active" boolean default true not null,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."shipments" (
    "id" uuid default gen_random_uuid() not null,
    "owner_id" uuid not null,
    "origin_city_id" uuid not null,
    "destination_city_id" uuid not null,
    "kind" text not null,
    "description" text not null,
    "weight_kg" numeric not null,
    "declared_value_cop" numeric,
    "is_fragile" boolean default false not null,
    "is_urgent" boolean default false not null,
    "is_high_value" boolean default false not null,
    "status" text default 'open'::text not null,
    "created_at" timestamp with time zone default now()
);

create table if not exists public."trips" (
    "id" uuid default gen_random_uuid() not null,
    "traveler_id" uuid not null,
    "origin_city_id" uuid not null,
    "destination_city_id" uuid not null,
    "departure_date" date not null,
    "departure_time" time without time zone,
    "capacity_kg" numeric,
    "status" text default 'open'::text not null,
    "created_at" timestamp with time zone default now()
);

alter table only public."cities" add constraint "cities_iata_code_key" UNIQUE (iata_code);
alter table only public."cities" add constraint "cities_pkey" PRIMARY KEY (id);

alter table only public."matches" add constraint "matches_pkey" PRIMARY KEY (id);
alter table only public."matches" add constraint "matches_requester_id_fkey" FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public."matches" add constraint "matches_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;
alter table only public."matches" add constraint "matches_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text, 'completed'::text]));
alter table only public."matches" add constraint "matches_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
alter table only public."matches" add constraint "matches_unique" UNIQUE (shipment_id, trip_id);

alter table only public."messages" add constraint "messages_match_id_fkey" FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table only public."messages" add constraint "messages_pkey" PRIMARY KEY (id);
alter table only public."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id);

alter table only public."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
alter table only public."notifications" add constraint "notifications_related_match_id_fkey" FOREIGN KEY (related_match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table only public."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only public."payments" add constraint "payments_amount_positive_check" CHECK (amount > 0::numeric);
alter table only public."payments" add constraint "payments_match_id_fkey" FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table only public."payments" add constraint "payments_pkey" PRIMARY KEY (id);
alter table only public."payments" add constraint "payments_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL;
alter table only public."payments" add constraint "payments_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'held'::text, 'released'::text, 'refunded'::text]));
alter table only public."payments" add constraint "payments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table only public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public."profiles" add constraint "profiles_city_id_fkey" FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL;
alter table only public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);

alter table only public."route_prices" add constraint "route_prices_base_price_check" CHECK (base_price > 0);
alter table only public."route_prices" add constraint "route_prices_customer_price_check" CHECK ((customer_price is null) or (customer_price > 0 and customer_price >= base_price));
alter table only public."route_prices" add constraint "route_prices_check" CHECK (origin_city_id <> destination_city_id);
alter table only public."route_prices" add constraint "route_prices_destination_city_id_fkey" FOREIGN KEY (destination_city_id) REFERENCES cities(id) ON DELETE CASCADE;
alter table only public."route_prices" add constraint "route_prices_origin_city_id_destination_city_id_key" UNIQUE (origin_city_id, destination_city_id);
alter table only public."route_prices" add constraint "route_prices_origin_city_id_fkey" FOREIGN KEY (origin_city_id) REFERENCES cities(id) ON DELETE CASCADE;
alter table only public."route_prices" add constraint "route_prices_pkey" PRIMARY KEY (id);
alter table only public."route_prices" add constraint "route_prices_route_category_check" CHECK (route_category = ANY (ARRAY['short'::text, 'medium'::text, 'long'::text]));

alter table only public."shipments" add constraint "shipments_declared_value_cop_check" CHECK (declared_value_cop IS NULL OR declared_value_cop >= 0::numeric);
alter table only public."shipments" add constraint "shipments_destination_city_id_fkey" FOREIGN KEY (destination_city_id) REFERENCES cities(id);
alter table only public."shipments" add constraint "shipments_kind_check" CHECK (kind = ANY (ARRAY['document'::text, 'package'::text, 'ecommerce'::text]));
alter table only public."shipments" add constraint "shipments_origin_city_id_fkey" FOREIGN KEY (origin_city_id) REFERENCES cities(id);
alter table only public."shipments" add constraint "shipments_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public."shipments" add constraint "shipments_pkey" PRIMARY KEY (id);
alter table only public."shipments" add constraint "shipments_status_check" CHECK (status = ANY (ARRAY['open'::text, 'matched'::text, 'accepted'::text, 'in_transit'::text, 'delivered'::text, 'cancelled'::text]));
alter table only public."shipments" add constraint "shipments_weight_check" CHECK (weight_kg > 0::numeric AND weight_kg <= 50::numeric);
alter table only public."shipments" add constraint "shipments_weight_kg_check" CHECK (weight_kg IS NULL OR weight_kg > 0::numeric AND weight_kg <= 25::numeric);

alter table only public."trips" add constraint "trips_capacity_kg_check" CHECK (capacity_kg IS NULL OR capacity_kg > 0::numeric AND capacity_kg <= 50::numeric);
alter table only public."trips" add constraint "trips_destination_city_id_fkey" FOREIGN KEY (destination_city_id) REFERENCES cities(id);
alter table only public."trips" add constraint "trips_origin_city_id_fkey" FOREIGN KEY (origin_city_id) REFERENCES cities(id);
alter table only public."trips" add constraint "trips_pkey" PRIMARY KEY (id);
alter table only public."trips" add constraint "trips_status_check" CHECK (status = ANY (ARRAY['open'::text, 'full'::text, 'completed'::text, 'cancelled'::text]));
alter table only public."trips" add constraint "trips_traveler_id_fkey" FOREIGN KEY (traveler_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS cities_name_idx ON public.cities USING btree (name);

CREATE INDEX IF NOT EXISTS matches_shipment_idx ON public.matches USING btree (shipment_id);
CREATE INDEX IF NOT EXISTS matches_status_idx ON public.matches USING btree (status);
CREATE INDEX IF NOT EXISTS matches_trip_idx ON public.matches USING btree (trip_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_match_events ON public.notifications USING btree (user_id, type, related_match_id) WHERE (type = ANY (ARRAY['match_accepted'::text, 'match_cancelled'::text, 'match_rejected'::text]));
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_match_type ON public.notifications USING btree (related_match_id, type);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications USING btree (user_id);

CREATE INDEX IF NOT EXISTS payments_external_reference_idx ON public.payments USING btree (external_reference);
CREATE INDEX IF NOT EXISTS payments_shipment_id_idx ON public.payments USING btree (shipment_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments USING btree (status);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments USING btree (user_id);

CREATE INDEX IF NOT EXISTS profiles_city_idx ON public.profiles USING btree (city_id);

CREATE INDEX IF NOT EXISTS shipments_owner_idx ON public.shipments USING btree (owner_id);
CREATE INDEX IF NOT EXISTS shipments_route_idx ON public.shipments USING btree (origin_city_id, destination_city_id);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments USING btree (status);

CREATE INDEX IF NOT EXISTS trips_date_idx ON public.trips USING btree (departure_date);
CREATE INDEX IF NOT EXISTS trips_route_idx ON public.trips USING btree (origin_city_id, destination_city_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON public.trips USING btree (status);
CREATE INDEX IF NOT EXISTS trips_traveler_idx ON public.trips USING btree (traveler_id);

CREATE OR REPLACE FUNCTION public.accept_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_trip_id uuid;
  v_shipment_id uuid;
  v_owner_id uuid;
  v_traveler_id uuid;
  v_capacity numeric;
  v_used_kg numeric;
  v_new_kg numeric;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.trip_id, m.shipment_id
  into v_trip_id, v_shipment_id
  from public.matches m
  where m.id = p_match_id
  for update;

  if v_trip_id is null then
    raise exception 'Match no existe';
  end if;

  select s.owner_id
  into v_owner_id
  from public.shipments s
  where s.id = v_shipment_id;

  if v_owner_id is null then
    raise exception 'Shipment no existe';
  end if;

  if v_actor <> v_owner_id then
    raise exception 'No autorizado (solo el cliente puede aceptar)';
  end if;

  select t.capacity_kg, t.traveler_id
  into v_capacity, v_traveler_id
  from public.trips t
  where t.id = v_trip_id
  for update;

  if v_traveler_id is null then
    raise exception 'Trip no existe o no tiene traveler';
  end if;

  select coalesce(s.weight_kg, 0)
  into v_new_kg
  from public.shipments s
  where s.id = v_shipment_id;

  select coalesce(sum(coalesce(s2.weight_kg, 0)), 0)
  into v_used_kg
  from public.matches m2
  join public.shipments s2 on s2.id = m2.shipment_id
  where m2.trip_id = v_trip_id
    and m2.status = 'accepted';

  if v_capacity is not null and (v_used_kg + v_new_kg) > v_capacity then
    raise exception 'Capacidad insuficiente: usado=%, nuevo=%, capacidad=%',
      v_used_kg, v_new_kg, v_capacity;
  end if;

  update public.matches
  set status = 'accepted'
  where id = p_match_id
    and status = 'pending';

  if not found then
    raise exception 'Match no estaba en pending (ya fue procesado)';
  end if;

  update public.shipments
  set status = 'matched'
  where id = v_shipment_id
    and status = 'open';

  if not found then
    raise exception 'El shipment no estaba en open';
  end if;

  if v_capacity is null then
    update public.trips
    set status = 'open'
    where id = v_trip_id
      and status <> 'cancelled';
  else
    if (v_used_kg + v_new_kg) >= v_capacity then
      update public.trips
      set status = 'full'
      where id = v_trip_id
        and status <> 'cancelled';
    else
      update public.trips
      set status = 'open'
      where id = v_trip_id
        and status <> 'cancelled';
    end if;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    v_traveler_id,
    'match_accepted',
    'Tu solicitud fue aceptada',
    'El cliente aceptó tu solicitud de transporte.',
    p_match_id
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = v_traveler_id
      and n.type = 'match_accepted'
      and n.related_match_id = p_match_id
  );
end;
$function$

CREATE OR REPLACE FUNCTION public.can_view_profile(p_profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      join public.shipments s on s.id = m.shipment_id
      join public.trips t on t.id = m.trip_id
      where
        (s.owner_id = auth.uid() and t.traveler_id = p_profile_id)
        or
        (t.traveler_id = auth.uid() and s.owner_id = p_profile_id)
    );
$function$

CREATE OR REPLACE FUNCTION public.can_view_shipment(p_shipment_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.shipments s
    where s.id = p_shipment_id
      and s.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.matches m
    join public.trips t on t.id = m.trip_id
    where m.shipment_id = p_shipment_id
      and t.traveler_id = auth.uid()
  )
  or exists (
    select 1
    from public.shipments s
    where s.id = p_shipment_id
      and s.status = 'open'
  );
$function$

CREATE OR REPLACE FUNCTION public.cancel_match(p_match_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_requester_id uuid;
  v_owner_id uuid;
  v_traveler_id uuid;
begin
  if v_actor is null then
    return json_build_object(
      'success', false,
      'error', 'No autenticado'
    );
  end if;

  select
    m.requester_id,
    s.owner_id,
    t.traveler_id
  into
    v_requester_id,
    v_owner_id,
    v_traveler_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
  where m.id = p_match_id;

  if v_requester_id is null then
    return json_build_object(
      'success', false,
      'error', 'Match no encontrado'
    );
  end if;

  if v_actor not in (v_requester_id, v_owner_id, v_traveler_id) then
    return json_build_object(
      'success', false,
      'error', 'No autorizado'
    );
  end if;

  update public.matches
  set status = 'cancelled'
  where id = p_match_id
    and status in ('pending', 'accepted');

  if not found then
    return json_build_object(
      'success', false,
      'error', 'No se pudo cancelar el match'
    );
  end if;

  return json_build_object(
    'success', true
  );
end;
$function$

CREATE OR REPLACE FUNCTION public.confirm_shipment_delivery(p_shipment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_match_id uuid;
  v_owner_id uuid;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.id, s.owner_id
  into v_match_id, v_owner_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  where m.shipment_id = p_shipment_id
    and m.status = 'accepted'
  limit 1;

  if v_match_id is null then
    raise exception 'No existe un match accepted para este shipment';
  end if;

  if v_owner_id is null then
    raise exception 'No se encontró el owner del shipment';
  end if;

  if v_actor <> v_owner_id then
    raise exception 'No autorizado: solo el cliente puede confirmar la entrega';
  end if;

  update public.shipments
  set status = 'delivered'
  where id = p_shipment_id
    and status = 'in_transit';

  if not found then
    raise exception 'El shipment no estaba en in_transit';
  end if;

  update public.matches
  set status = 'completed'
  where id = v_match_id
    and status = 'accepted';

  update public.payments
  set status = 'released',
      updated_at = now()
  where shipment_id = p_shipment_id
    and status = 'held';
end;
$function$

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      join public.shipments s on s.id = m.shipment_id
      join public.trips t on t.id = m.trip_id
      where m.id = p_match_id
        and (
          s.owner_id = auth.uid()
          or t.traveler_id = auth.uid()
        )
    );
$function$

CREATE OR REPLACE FUNCTION public.is_match_participant_for_shipment(p_shipment_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      join public.shipments s on s.id = m.shipment_id
      join public.trips t on t.id = m.trip_id
      where m.shipment_id = p_shipment_id
        and (
          s.owner_id = auth.uid()
          or t.traveler_id = auth.uid()
        )
    );
$function$

CREATE OR REPLACE FUNCTION public.is_match_participant_for_trip(p_trip_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      join public.shipments s on s.id = m.shipment_id
      join public.trips t on t.id = m.trip_id
      where m.trip_id = p_trip_id
        and (
          s.owner_id = auth.uid()
          or t.traveler_id = auth.uid()
        )
    );
$function$

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  update public.notifications
  set is_read = true,
      read_at = now()
  where user_id = v_actor
    and is_read = false;
end;
$function$

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  update public.notifications
  set is_read = true,
      read_at = now()
  where id = p_notification_id
    and user_id = v_actor
    and is_read = false;
end;
$function$

CREATE OR REPLACE FUNCTION public.mark_shipment_in_transit(p_shipment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_match_id uuid;
  v_trip_id uuid;
  v_traveler_id uuid;
begin
  if v_actor is null then
  raise exception 'No autenticado';
  end if;

  select m.id, m.trip_id
  into v_match_id, v_trip_id
  from public.matches m
  where m.shipment_id = p_shipment_id
    and m.status = 'accepted'
  limit 1;

  if v_match_id is null then
    raise exception 'No existe un match accepted para este shipment';
  end if;

  select t.traveler_id
  into v_traveler_id
  from public.trips t
  where t.id = v_trip_id;

  if v_traveler_id is null then
    raise exception 'No se encontró el viajero del trip';
  end if;

  if v_actor <> v_traveler_id then
    raise exception 'No autorizado: solo el viajero puede marcar en tránsito';
  end if;

  update public.shipments
  set status = 'in_transit'
  where id = p_shipment_id
    and status = 'matched';

  if not found then
    raise exception 'El shipment no estaba en matched';
  end if;
end;
$function$

CREATE OR REPLACE FUNCTION public.notify_match_requested()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if new.status = 'pending' then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_match_id
    )
    select
      s.owner_id,
      'match_requested',
      'Nuevo envío interesado',
      'Un viajero quiere transportar tu envío.',
      new.id
    from public.shipments s
    where s.id = new.shipment_id;
  end if;

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.reject_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_trip_id uuid;
  v_shipment_id uuid;
  v_owner_id uuid;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.trip_id, m.shipment_id
  into v_trip_id, v_shipment_id
  from public.matches m
  where m.id = p_match_id
  for update;

  if v_trip_id is null then
    raise exception 'Match no existe';
  end if;

  select s.owner_id
  into v_owner_id
  from public.shipments s
  where s.id = v_shipment_id;

  if v_owner_id is null then
    raise exception 'Shipment no existe';
  end if;

  if v_actor <> v_owner_id then
    raise exception 'No autorizado (solo el cliente puede rechazar)';
  end if;

  update public.matches
   set status = 'rejected'
  where id = p_match_id
    and status = 'pending';

  if not found then
    raise exception 'Match no estaba en pending (ya fue procesado)';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    t.traveler_id,
    'match_rejected',
    'Tu solicitud fue rechazada',
    'El cliente rechazó tu solicitud de transporte.',
    m.id
  from public.matches m
  join public.trips t on t.id = m.trip_id
  where m.id = p_match_id
  on conflict (related_match_id, type) do nothing;
end;
$function$

CREATE TRIGGER trigger_notify_match_requested AFTER INSERT ON matches FOR EACH ROW EXECUTE FUNCTION notify_match_requested();

alter table public."cities" enable row level security;

alter table public."matches" enable row level security;

alter table public."messages" enable row level security;

alter table public."notifications" enable row level security;

alter table public."payments" enable row level security;

alter table public."profiles" enable row level security;

alter table public."route_prices" enable row level security;

alter table public."shipments" enable row level security;

alter table public."trips" enable row level security;

create policy "Cities are viewable by all" on public."cities" as PERMISSIVE for select to public using (true);
create policy "cities_read_public" on public."cities" as PERMISSIVE for select to "anon", "authenticated" using (true);

create policy "Matches are insertable by requester" on public."matches" as PERMISSIVE for insert to public with check ((auth.uid() = requester_id));
create policy "Matches are updatable by involved" on public."matches" as PERMISSIVE for update to public using (((auth.uid() = requester_id) OR (auth.uid() = ( SELECT s.owner_id
   FROM shipments s
  WHERE (s.id = matches.shipment_id))) OR (auth.uid() = ( SELECT t.traveler_id
   FROM trips t
  WHERE (t.id = matches.trip_id))))) with check (((auth.uid() = requester_id) OR (auth.uid() = ( SELECT s.owner_id
   FROM shipments s
  WHERE (s.id = matches.shipment_id))) OR (auth.uid() = ( SELECT t.traveler_id
   FROM trips t
  WHERE (t.id = matches.trip_id)))));
create policy "Matches are viewable by involved" on public."matches" as PERMISSIVE for select to public using (((auth.uid() = requester_id) OR (auth.uid() = ( SELECT s.owner_id
   FROM shipments s
  WHERE (s.id = matches.shipment_id))) OR (auth.uid() = ( SELECT t.traveler_id
   FROM trips t
  WHERE (t.id = matches.trip_id)))));
create policy "matches_insert_requester" on public."matches" as PERMISSIVE for insert to "authenticated" with check (((requester_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = matches.trip_id) AND (t.traveler_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = matches.shipment_id) AND (s.owner_id <> auth.uid()))))));
create policy "matches_select_participants" on public."matches" as PERMISSIVE for select to "authenticated" using (is_match_participant(id));
create policy "matches_update_participants" on public."matches" as PERMISSIVE for update to "authenticated" using (((EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = matches.shipment_id) AND (s.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = matches.trip_id) AND (t.traveler_id = auth.uid())))))) with check (((EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = matches.shipment_id) AND (s.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = matches.trip_id) AND (t.traveler_id = auth.uid()))))));

create policy "Users can insert messages in their matches" on public."messages" as PERMISSIVE for insert to public with check ((EXISTS ( SELECT 1
   FROM ((matches m
     JOIN shipments s ON ((s.id = m.shipment_id)))
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.id = messages.match_id) AND ((s.owner_id = auth.uid()) OR (t.traveler_id = auth.uid()))))));
create policy "Users can read messages of their matches" on public."messages" as PERMISSIVE for select to public using ((EXISTS ( SELECT 1
   FROM ((matches m
     JOIN shipments s ON ((s.id = m.shipment_id)))
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.id = messages.match_id) AND ((s.owner_id = auth.uid()) OR (t.traveler_id = auth.uid()))))));
create policy "messages_insert_sender_participant" on public."messages" as PERMISSIVE for insert to "authenticated" with check (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM ((matches m
     JOIN shipments s ON ((s.id = m.shipment_id)))
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.id = messages.match_id) AND (m.status = 'accepted'::text) AND ((s.owner_id = auth.uid()) OR (t.traveler_id = auth.uid())))))));
create policy "messages_select_participants" on public."messages" as PERMISSIVE for select to "authenticated" using ((EXISTS ( SELECT 1
   FROM ((matches m
     JOIN shipments s ON ((s.id = m.shipment_id)))
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.id = messages.match_id) AND ((s.owner_id = auth.uid()) OR (t.traveler_id = auth.uid()))))));

create policy "Users can insert notifications for match counterpart" on public."notifications" as PERMISSIVE for insert to "authenticated" with check (((related_match_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((matches m
     JOIN trips t ON ((t.id = m.trip_id)))
     JOIN shipments s ON ((s.id = m.shipment_id)))
  WHERE ((m.id = notifications.related_match_id) AND (((auth.uid() = t.traveler_id) AND (notifications.user_id = s.owner_id)) OR ((auth.uid() = s.owner_id) AND (notifications.user_id = t.traveler_id))))))));
create policy "Users can read own notifications" on public."notifications" as PERMISSIVE for select to public using ((auth.uid() = user_id));
create policy "Users can update own notifications" on public."notifications" as PERMISSIVE for update to public using ((auth.uid() = user_id));
create policy "Users can update their own notifications" on public."notifications" as PERMISSIVE for update to "authenticated" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Users can view their own notifications" on public."notifications" as PERMISSIVE for select to "authenticated" using ((auth.uid() = user_id));
create policy "notifications_insert_match_participant" on public."notifications" as PERMISSIVE for insert to "authenticated" with check (((user_id <> auth.uid()) AND (related_match_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((matches m
     JOIN shipments s ON ((s.id = m.shipment_id)))
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.id = notifications.related_match_id) AND ((s.owner_id = auth.uid()) OR (t.traveler_id = auth.uid())) AND ((s.owner_id = notifications.user_id) OR (t.traveler_id = notifications.user_id)))))));
create policy "notifications_select_own" on public."notifications" as PERMISSIVE for select to "authenticated" using ((user_id = auth.uid()));
create policy "notifications_update_own" on public."notifications" as PERMISSIVE for update to "authenticated" using ((user_id = auth.uid())) with check ((user_id = auth.uid()));

create policy "payments_insert_own" on public."payments" as PERMISSIVE for insert to "authenticated" with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = payments.shipment_id) AND (s.owner_id = auth.uid()))))));
create policy "payments_select_related_users" on public."payments" as PERMISSIVE for select to "authenticated" using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = payments.shipment_id) AND (s.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (matches m
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.shipment_id = payments.shipment_id) AND (t.traveler_id = auth.uid()))))));
create policy "payments_update_related_users" on public."payments" as PERMISSIVE for update to "authenticated" using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = payments.shipment_id) AND (s.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (matches m
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.shipment_id = payments.shipment_id) AND (t.traveler_id = auth.uid())))))) with check (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = payments.shipment_id) AND (s.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (matches m
     JOIN trips t ON ((t.id = m.trip_id)))
  WHERE ((m.shipment_id = payments.shipment_id) AND (t.traveler_id = auth.uid()))))));

create policy "Authenticated users can read profiles" on public."profiles" as PERMISSIVE for select to "authenticated" using (true);
create policy "Profiles are updatable by owner" on public."profiles" as PERMISSIVE for update to public using ((auth.uid() = id)) with check ((auth.uid() = id));
create policy "Profiles are viewable by owner" on public."profiles" as PERMISSIVE for select to public using ((auth.uid() = id));
create policy "Users can insert their own profile" on public."profiles" as PERMISSIVE for insert to public with check ((auth.uid() = id));
create policy "Users can view their own profile" on public."profiles" as PERMISSIVE for select to public using ((auth.uid() = id));
create policy "profiles_insert_self" on public."profiles" as PERMISSIVE for insert to "authenticated" with check ((id = auth.uid()));
create policy "profiles_select_related_or_self" on public."profiles" as PERMISSIVE for select to "authenticated" using (((id = auth.uid()) OR can_view_profile(id)));
create policy "profiles_update_self" on public."profiles" as PERMISSIVE for update to "authenticated" using ((id = auth.uid())) with check ((id = auth.uid()));

create policy "Allow read access to route_prices" on public."route_prices" as PERMISSIVE for select to public using (true);
create policy "route_prices_read_public" on public."route_prices" as PERMISSIVE for select to "anon", "authenticated" using ((is_active = true));

create policy "Authenticated users can view open shipments" on public."shipments" as PERMISSIVE for select to "authenticated" using (true);
create policy "Shipments are insertable by owner" on public."shipments" as PERMISSIVE for insert to public with check ((auth.uid() = owner_id));
create policy "Shipments are updatable by owner" on public."shipments" as PERMISSIVE for update to public using ((auth.uid() = owner_id)) with check ((auth.uid() = owner_id));
create policy "Shipments are viewable safely" on public."shipments" as PERMISSIVE for select to "authenticated" using (can_view_shipment(id));
create policy "Users can insert own shipments" on public."shipments" as PERMISSIVE for insert to "authenticated" with check ((owner_id = auth.uid()));
create policy "Users can update own shipments" on public."shipments" as PERMISSIVE for update to "authenticated" using ((owner_id = auth.uid())) with check ((owner_id = auth.uid()));
create policy "Users can view own shipments" on public."shipments" as PERMISSIVE for select to "authenticated" using ((owner_id = auth.uid()));
create policy "shipments_delete_own" on public."shipments" as PERMISSIVE for delete to "authenticated" using ((owner_id = auth.uid()));
create policy "shipments_insert_own" on public."shipments" as PERMISSIVE for insert to "authenticated" with check ((owner_id = auth.uid()));
create policy "shipments_select_open_or_own" on public."shipments" as PERMISSIVE for select to "authenticated" using (((owner_id = auth.uid()) OR (status = 'open'::text) OR is_match_participant_for_shipment(id)));
create policy "shipments_update_own" on public."shipments" as PERMISSIVE for update to "authenticated" using ((owner_id = auth.uid())) with check ((owner_id = auth.uid()));

create policy "Trips are insertable by traveler" on public."trips" as PERMISSIVE for insert to public with check ((auth.uid() = traveler_id));
create policy "Trips are updatable by traveler" on public."trips" as PERMISSIVE for update to public using ((auth.uid() = traveler_id)) with check ((auth.uid() = traveler_id));
create policy "Trips are viewable by traveler" on public."trips" as PERMISSIVE for select to public using ((auth.uid() = traveler_id));
create policy "Trips open are viewable by authenticated" on public."trips" as PERMISSIVE for select to "authenticated" using ((status = 'open'::text));
create policy "trips_delete_own" on public."trips" as PERMISSIVE for delete to "authenticated" using ((traveler_id = auth.uid()));
create policy "trips_insert_own" on public."trips" as PERMISSIVE for insert to "authenticated" with check ((traveler_id = auth.uid()));
create policy "trips_select_open_or_own" on public."trips" as PERMISSIVE for select to "authenticated" using (((traveler_id = auth.uid()) OR (status = ANY (ARRAY['open'::text, 'full'::text])) OR is_match_participant_for_trip(id)));
create policy "trips_update_own" on public."trips" as PERMISSIVE for update to "authenticated" using ((traveler_id = auth.uid())) with check ((traveler_id = auth.uid()));
