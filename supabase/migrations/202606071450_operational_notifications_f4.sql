begin;

-- F4 operational notifications:
-- - remove global match/type uniqueness that blocked valid notifications
-- - keep idempotency per user/event where it is operationally safe
-- - add DB-side notifications for payment, payout, verification and admin review events

alter table public.notifications
  add column if not exists dedupe_key text;

drop index if exists public.notifications_unique_match_type_global;
drop index if exists public.notifications_unique_match_type;
drop index if exists public.notifications_unique_match_events;
drop index if exists public.notifications_unique_review_reminder;

with ranked as (
  select
    ctid,
    row_number() over (
      partition by user_id, related_match_id, type
      order by created_at asc, id asc
    ) as rn
  from public.notifications
  where related_match_id is not null
    and type = any (array[
      'match_requested',
      'match_accepted',
      'match_rejected',
      'match_cancelled',
      'shipment_in_transit',
      'delivery_reported',
      'delivery_confirmed',
      'dispute_opened',
      'dispute_resolved_customer',
      'dispute_resolved_traveler',
      'dispute_closed',
      'payment_released',
      'auto_release_executed',
      'refund_manual_required',
      'refund_processed',
      'review_reminder'
    ])
)
delete from public.notifications n
using ranked r
where n.ctid = r.ctid
  and r.rn > 1;

create unique index if not exists notifications_unique_dedupe_key
on public.notifications (user_id, type, dedupe_key)
where dedupe_key is not null;

create unique index if not exists notifications_unique_idempotent_match_event
on public.notifications (user_id, related_match_id, type)
where related_match_id is not null
  and type = any (array[
    'match_requested',
    'match_accepted',
    'match_rejected',
    'match_cancelled',
    'shipment_in_transit',
    'delivery_reported',
    'delivery_confirmed',
    'dispute_opened',
    'dispute_resolved_customer',
    'dispute_resolved_traveler',
    'dispute_closed',
    'payment_released',
    'auto_release_executed',
    'refund_manual_required',
    'refund_processed',
    'review_reminder'
  ]);

create or replace function public.create_operational_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_match_id uuid default null,
  p_dedupe_key text default null,
  p_idempotent boolean default true
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_notification_id uuid;
  v_type text := nullif(btrim(coalesce(p_type, '')), '');
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_dedupe_key text := nullif(btrim(coalesce(p_dedupe_key, '')), '');
begin
  if p_user_id is null or v_type is null or v_title is null or v_message is null then
    return null;
  end if;

  if coalesce(p_idempotent, true) and v_dedupe_key is not null then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_match_id,
      dedupe_key
    )
    select
      p_user_id,
      v_type,
      v_title,
      v_message,
      p_related_match_id,
      v_dedupe_key
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = p_user_id
        and n.type = v_type
        and n.dedupe_key = v_dedupe_key
    )
    on conflict do nothing
    returning id into v_notification_id;

    return v_notification_id;
  end if;

  if coalesce(p_idempotent, true) and p_related_match_id is not null then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_match_id,
      dedupe_key
    )
    select
      p_user_id,
      v_type,
      v_title,
      v_message,
      p_related_match_id,
      v_dedupe_key
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = p_user_id
        and n.type = v_type
        and n.related_match_id = p_related_match_id
    )
    on conflict do nothing
    returning id into v_notification_id;

    return v_notification_id;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id,
    dedupe_key
  )
  values (
    p_user_id,
    v_type,
    v_title,
    v_message,
    p_related_match_id,
    v_dedupe_key
  )
  on conflict do nothing
  returning id into v_notification_id;

  return v_notification_id;
end;
$function$;

create or replace function public.notify_payment_operational_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner_id uuid;
  v_traveler_id uuid;
  v_match_id uuid;
  v_resolution text;
  v_old_resolution text;
  v_manual_refund_required boolean;
  v_old_manual_refund_required boolean;
  v_is_auto_release boolean;
  v_dedupe_prefix text;
begin
  select
    coalesce(s.owner_id, new.user_id),
    t.traveler_id,
    m.id
  into
    v_owner_id,
    v_traveler_id,
    v_match_id
  from public.payments p
  left join public.matches m on m.id = p.match_id
  left join public.shipments s on s.id = coalesce(p.shipment_id, m.shipment_id)
  left join public.trips t on t.id = m.trip_id
  where p.id = new.id;

  v_owner_id := coalesce(v_owner_id, new.user_id);
  v_resolution := coalesce(new.metadata ->> 'admin_dispute_resolution', '');
  v_old_resolution := coalesce(old.metadata ->> 'admin_dispute_resolution', '');
  v_manual_refund_required := lower(coalesce(new.metadata ->> 'manual_refund_required', 'false')) = 'true';
  v_old_manual_refund_required := lower(coalesce(old.metadata ->> 'manual_refund_required', 'false')) = 'true';
  v_is_auto_release := lower(coalesce(new.released_by, '')) = 'auto_release';
  v_dedupe_prefix := 'payment:' || new.id::text || ':';

  if v_owner_id is not null
    and coalesce(old.status, '') <> 'held'
    and new.status = 'held'
  then
    perform public.create_operational_notification(
      v_owner_id,
      'payment_confirmed',
      'Pago confirmado',
      'Tu envio quedo listo para recibir solicitudes.',
      v_match_id,
      v_dedupe_prefix || 'payment_confirmed',
      true
    );
  end if;

  if v_owner_id is not null
    and coalesce(old.status, '') <> 'failed'
    and new.status = 'failed'
  then
    perform public.create_operational_notification(
      v_owner_id,
      'payment_failed',
      'Pago fallido',
      'No pudimos confirmar el pago de tu envio.',
      v_match_id,
      v_dedupe_prefix || 'payment_failed',
      true
    );
  end if;

  if v_owner_id is not null
    and coalesce(old.status, '') <> 'cancelled'
    and new.status = 'cancelled'
  then
    perform public.create_operational_notification(
      v_owner_id,
      'payment_cancelled',
      'Pago cancelado',
      'El pago de tu envio quedo cancelado.',
      v_match_id,
      v_dedupe_prefix || 'payment_cancelled',
      true
    );
  end if;

  if v_traveler_id is not null
    and coalesce(old.status, '') <> 'released'
    and new.status = 'released'
  then
    perform public.create_operational_notification(
      v_traveler_id,
      case when v_is_auto_release then 'auto_release_executed' else 'payment_released' end,
      case when v_is_auto_release then 'Pago liberado automaticamente' else 'Pago liberado' end,
      'El saldo quedo disponible en tu wallet.',
      v_match_id,
      v_dedupe_prefix || case when v_is_auto_release then 'auto_release_executed' else 'payment_released' end,
      true
    );
  end if;

  if v_owner_id is not null
    and (
      (coalesce(old.refund_status, 'none') <> 'manual_required' and coalesce(new.refund_status, 'none') = 'manual_required')
      or (not v_old_manual_refund_required and v_manual_refund_required)
    )
  then
    perform public.create_operational_notification(
      v_owner_id,
      'refund_manual_required',
      'Reembolso en revision',
      'El equipo debe procesar un reembolso manual.',
      v_match_id,
      v_dedupe_prefix || 'refund_manual_required',
      true
    );
  end if;

  if v_owner_id is not null
    and (
      (coalesce(old.refund_status, 'none') <> 'refunded' and coalesce(new.refund_status, 'none') = 'refunded')
      or (coalesce(old.status, '') <> 'refunded' and new.status = 'refunded')
    )
  then
    perform public.create_operational_notification(
      v_owner_id,
      'refund_processed',
      'Reembolso realizado',
      'El reembolso fue marcado como realizado.',
      v_match_id,
      v_dedupe_prefix || 'refund_processed',
      true
    );
  end if;

  if coalesce(old.metadata ->> 'admin_dispute_status', '') <> 'reviewing'
    and coalesce(new.metadata ->> 'admin_dispute_status', '') = 'reviewing'
  then
    perform public.create_operational_notification(
      v_owner_id,
      'case_reviewing',
      'Caso en revision',
      'El equipo esta revisando este caso.',
      v_match_id,
      v_dedupe_prefix || 'case_reviewing:customer',
      true
    );

    perform public.create_operational_notification(
      v_traveler_id,
      'case_reviewing',
      'Caso en revision',
      'El equipo esta revisando este caso.',
      v_match_id,
      v_dedupe_prefix || 'case_reviewing:traveler',
      true
    );
  end if;

  if coalesce(old.dispute_status, 'none') <> 'open'
    and coalesce(new.dispute_status, 'none') = 'open'
  then
    perform public.create_operational_notification(
      v_traveler_id,
      'dispute_opened',
      'Disputa abierta',
      'Se abrio una disputa sobre este envio.',
      v_match_id,
      v_dedupe_prefix || 'dispute_opened:traveler',
      true
    );

  end if;

  if coalesce(new.metadata ->> 'admin_dispute_status', '') = 'resolved'
    and (v_resolution <> '' and v_resolution <> v_old_resolution)
  then
    if v_resolution = 'customer_refund' then
      perform public.create_operational_notification(
        v_owner_id,
        'dispute_resolved_customer',
        'Disputa resuelta',
        'La disputa fue resuelta a favor del cliente.',
        v_match_id,
        v_dedupe_prefix || 'dispute_resolved_customer:customer',
        true
      );

      perform public.create_operational_notification(
        v_traveler_id,
        'dispute_resolved_customer',
        'Disputa resuelta',
        'La disputa fue resuelta a favor del cliente.',
        v_match_id,
        v_dedupe_prefix || 'dispute_resolved_customer:traveler',
        true
      );
    elsif v_resolution = 'traveler_release' then
      perform public.create_operational_notification(
        v_owner_id,
        'dispute_resolved_traveler',
        'Disputa resuelta',
        'La disputa fue resuelta a favor del viajero.',
        v_match_id,
        v_dedupe_prefix || 'dispute_resolved_traveler:customer',
        true
      );

      perform public.create_operational_notification(
        v_traveler_id,
        'dispute_resolved_traveler',
        'Disputa resuelta',
        'La disputa fue resuelta a favor del viajero.',
        v_match_id,
        v_dedupe_prefix || 'dispute_resolved_traveler:traveler',
        true
      );
    else
      perform public.create_operational_notification(
        v_owner_id,
        'dispute_closed',
        'Disputa cerrada',
        'La disputa fue cerrada sin movimiento adicional.',
        v_match_id,
        v_dedupe_prefix || 'dispute_closed:customer',
        true
      );

      perform public.create_operational_notification(
        v_traveler_id,
        'dispute_closed',
        'Disputa cerrada',
        'La disputa fue cerrada sin movimiento adicional.',
        v_match_id,
        v_dedupe_prefix || 'dispute_closed:traveler',
        true
      );
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_notify_payment_operational_event on public.payments;
create trigger trg_notify_payment_operational_event
after update on public.payments
for each row
execute function public.notify_payment_operational_event();

create or replace function public.notify_payout_operational_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type text;
  v_title text;
  v_message text;
begin
  if tg_op = 'INSERT' then
    perform public.create_operational_notification(
      new.traveler_user_id,
      'payout_requested',
      'Retiro solicitado',
      'Tu solicitud de retiro quedo registrada.',
      null,
      'payout:' || new.id::text || ':requested',
      true
    );

    return new;
  end if;

  if coalesce(old.status, '') = coalesce(new.status, '') then
    return new;
  end if;

  v_type := case new.status
    when 'approved' then 'payout_approved'
    when 'rejected' then 'payout_rejected'
    when 'paid' then 'payout_paid'
    else null
  end;

  if v_type is null then
    return new;
  end if;

  v_title := case new.status
    when 'approved' then 'Retiro aprobado'
    when 'rejected' then 'Retiro rechazado'
    when 'paid' then 'Retiro pagado'
    else 'Retiro actualizado'
  end;

  v_message := case new.status
    when 'approved' then 'Tu retiro fue aprobado para pago manual.'
    when 'rejected' then 'Tu solicitud de retiro fue rechazada.'
    when 'paid' then 'Tu retiro fue marcado como pagado.'
    else 'Tu retiro fue actualizado.'
  end;

  perform public.create_operational_notification(
    new.traveler_user_id,
    v_type,
    v_title,
    v_message,
    null,
    'payout:' || new.id::text || ':' || new.status,
    true
  );

  return new;
end;
$function$;

drop trigger if exists trg_notify_payout_insert_operational_event on public.payouts;
create trigger trg_notify_payout_insert_operational_event
after insert on public.payouts
for each row
execute function public.notify_payout_operational_event();

drop trigger if exists trg_notify_payout_update_operational_event on public.payouts;
create trigger trg_notify_payout_update_operational_event
after update on public.payouts
for each row
execute function public.notify_payout_operational_event();

create or replace function public.notify_user_verification_operational_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type text;
begin
  if coalesce(old.verification_status, '') = coalesce(new.verification_status, '')
    or new.verification_status not in ('verified', 'rejected')
  then
    return new;
  end if;

  v_type := case
    when new.verification_status = 'verified' then 'verification_approved'
    else 'verification_rejected'
  end;

  perform public.create_operational_notification(
    new.user_id,
    v_type,
    case when new.verification_status = 'verified' then 'Verificacion aprobada' else 'Verificacion rechazada' end,
    case when new.verification_status = 'verified' then 'Tu verificacion fue aprobada.' else 'Tu verificacion fue rechazada.' end,
    null,
    'verification:' || new.id::text || ':' || new.verification_status,
    true
  );

  return new;
end;
$function$;

drop trigger if exists trg_notify_user_verification_operational_event on public.user_verifications;
create trigger trg_notify_user_verification_operational_event
after update on public.user_verifications
for each row
execute function public.notify_user_verification_operational_event();

create or replace function public.notify_payout_account_operational_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type text;
begin
  if coalesce(old.verification_status, '') = coalesce(new.verification_status, '')
    or new.verification_status not in ('verified', 'rejected')
  then
    return new;
  end if;

  v_type := case
    when new.verification_status = 'verified' then 'payout_account_approved'
    else 'payout_account_rejected'
  end;

  perform public.create_operational_notification(
    new.traveler_user_id,
    v_type,
    case when new.verification_status = 'verified' then 'Cuenta de retiro aprobada' else 'Cuenta de retiro rechazada' end,
    case when new.verification_status = 'verified' then 'Tu cuenta de retiro fue aprobada.' else 'Tu cuenta de retiro fue rechazada.' end,
    null,
    'payout_account:' || new.id::text || ':' || new.verification_status,
    true
  );

  return new;
end;
$function$;

drop trigger if exists trg_notify_payout_account_operational_event on public.traveler_payout_accounts;
create trigger trg_notify_payout_account_operational_event
after update on public.traveler_payout_accounts
for each row
execute function public.notify_payout_account_operational_event();

create or replace function public.notify_shipment_report_operational_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner_id uuid;
  v_traveler_id uuid;
  v_match_id uuid := new.match_id;
begin
  select
    s.owner_id,
    t.traveler_id
  into
    v_owner_id,
    v_traveler_id
  from public.shipments s
  left join public.matches m on m.id = new.match_id
  left join public.trips t on t.id = m.trip_id
  where s.id = new.shipment_id;

  if coalesce(old.status, '') <> 'reviewing'
    and new.status = 'reviewing'
  then
    perform public.create_operational_notification(
      v_owner_id,
      'case_reviewing',
      'Caso en revision',
      'El equipo esta revisando este caso.',
      v_match_id,
      'report:' || new.id::text || ':case_reviewing:customer',
      true
    );

    perform public.create_operational_notification(
      v_traveler_id,
      'case_reviewing',
      'Caso en revision',
      'El equipo esta revisando este caso.',
      v_match_id,
      'report:' || new.id::text || ':case_reviewing:traveler',
      true
    );
  end if;

  if lower(coalesce(new.metadata ->> 'escalated_to_dispute', 'false')) = 'true'
    and lower(coalesce(old.metadata ->> 'escalated_to_dispute', 'false')) <> 'true'
  then
    perform public.create_operational_notification(
      v_owner_id,
      'shipment_alert_escalated',
      'Alerta escalada',
      'La alerta fue escalada a disputa.',
      v_match_id,
      'report:' || new.id::text || ':shipment_alert_escalated:customer',
      true
    );

    perform public.create_operational_notification(
      v_traveler_id,
      'shipment_alert_escalated',
      'Alerta escalada',
      'La alerta fue escalada a disputa.',
      v_match_id,
      'report:' || new.id::text || ':shipment_alert_escalated:traveler',
      true
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_notify_shipment_report_operational_event on public.shipment_report_events;
create trigger trg_notify_shipment_report_operational_event
after update on public.shipment_report_events
for each row
execute function public.notify_shipment_report_operational_event();

create or replace function public.reject_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_trip_id uuid;
  v_shipment_id uuid;
  v_owner_id uuid;
  v_traveler_id uuid;
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

  select t.traveler_id
  into v_traveler_id
  from public.trips t
  where t.id = v_trip_id;

  perform public.create_operational_notification(
    v_traveler_id,
    'match_rejected',
    'Tu solicitud fue rechazada',
    'El cliente rechazo tu solicitud de transporte.',
    p_match_id,
    null,
    true
  );
end;
$function$;

notify pgrst, 'reload schema';

commit;
