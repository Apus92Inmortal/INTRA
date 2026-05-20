drop index if exists public.notifications_unique_match_type;

create unique index if not exists notifications_unique_match_type_global
on public.notifications (related_match_id, type)
where related_match_id is not null
  and type <> 'review_reminder';

create unique index if not exists notifications_unique_review_reminder
on public.notifications (user_id, related_match_id, type)
where related_match_id is not null
  and type = 'review_reminder';

create or replace function public.ensure_review_reminder(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_traveler_id uuid;
  v_match_status text;
  v_match_created_at timestamptz;
  v_completed_at timestamptz;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'No autenticado');
  end if;

  select
    s.owner_id,
    t.traveler_id,
    m.status,
    m.created_at,
    coalesce(p.delivered_at, p.updated_at)
  into
    v_owner_id,
    v_traveler_id,
    v_match_status,
    v_match_created_at,
    v_completed_at
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
  left join lateral (
    select delivered_at, updated_at, created_at
    from public.payments
    where match_id = m.id
       or shipment_id = m.shipment_id
    order by created_at desc
    limit 1
  ) p on true
  where m.id = p_match_id;

  if v_match_status is null then
    return jsonb_build_object('success', false, 'error', 'Match no encontrado');
  end if;

  if v_actor not in (v_owner_id, v_traveler_id) then
    return jsonb_build_object('success', false, 'error', 'No autorizado');
  end if;

  if v_match_status <> 'completed' then
    return jsonb_build_object('success', false, 'reminder_created', false);
  end if;

  v_completed_at := coalesce(v_completed_at, v_match_created_at);

  if now() < v_completed_at + interval '6 hours'
    or now() > v_completed_at + interval '12 hours'
  then
    return jsonb_build_object('success', true, 'reminder_created', false);
  end if;

  if exists (
    select 1
    from public.reviews r
    where r.match_id = p_match_id
      and r.reviewer_id = v_actor
  ) then
    return jsonb_build_object('success', true, 'reminder_created', false);
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  values (
    v_actor,
    'review_reminder',
    'Califica tu experiencia',
    'Tienes una calificación pendiente para este match. Tu review ayuda a mantener la confianza en INTRA.',
    p_match_id
  )
  on conflict do nothing;

  return jsonb_build_object('success', true, 'reminder_created', true);
end;
$function$;

create or replace function public.create_review(
  p_match_id uuid,
  p_rating smallint,
  p_comment text default null
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
  v_shipment_id uuid;
  v_match_status text;
  v_match_created_at timestamptz;
  v_completed_at timestamptz;
  v_reviewed_user_id uuid;
  v_review_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'No autenticado');
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('success', false, 'error', 'El rating debe estar entre 1 y 5');
  end if;

  if v_comment is not null and char_length(v_comment) > 300 then
    return jsonb_build_object('success', false, 'error', 'El comentario no puede superar 300 caracteres');
  end if;

  select
    s.owner_id,
    t.traveler_id,
    m.shipment_id,
    m.status,
    m.created_at,
    coalesce(p.delivered_at, p.updated_at)
  into
    v_owner_id,
    v_traveler_id,
    v_shipment_id,
    v_match_status,
    v_match_created_at,
    v_completed_at
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
  left join lateral (
    select delivered_at, updated_at, created_at
    from public.payments
    where match_id = m.id
       or shipment_id = m.shipment_id
    order by created_at desc
    limit 1
  ) p on true
  where m.id = p_match_id;

  if v_shipment_id is null then
    return jsonb_build_object('success', false, 'error', 'Match no encontrado');
  end if;

  if v_match_status <> 'completed' then
    return jsonb_build_object('success', false, 'error', 'Solo puedes dejar una review cuando el match esté completado');
  end if;

  v_completed_at := coalesce(v_completed_at, v_match_created_at);

  if now() > v_completed_at + interval '12 hours' then
    return jsonb_build_object('success', false, 'error', 'La ventana de calificación de 12 horas ya terminó');
  end if;

  if v_actor = v_owner_id then
    v_reviewed_user_id := v_traveler_id;
  elsif v_actor = v_traveler_id then
    v_reviewed_user_id := v_owner_id;
  else
    return jsonb_build_object('success', false, 'error', 'No autorizado');
  end if;

  if v_reviewed_user_id is null or v_reviewed_user_id = v_actor then
    return jsonb_build_object('success', false, 'error', 'No puedes dejarte una review a ti mismo');
  end if;

  if exists (
    select 1
    from public.reviews r
    where r.match_id = p_match_id
      and r.reviewer_id = v_actor
  ) then
    return jsonb_build_object('success', false, 'error', 'Ya dejaste una review para este match');
  end if;

  insert into public.reviews (
    match_id,
    reviewer_id,
    reviewed_user_id,
    shipment_id,
    rating,
    comment
  )
  values (
    p_match_id,
    v_actor,
    v_reviewed_user_id,
    v_shipment_id,
    p_rating,
    v_comment
  )
  returning id into v_review_id;

  return jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'reviewed_user_id', v_reviewed_user_id,
    'rating', p_rating
  );
end;
$function$;
