create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_comment_length_check check (comment is null or char_length(comment) <= 300),
  constraint reviews_not_self_check check (reviewer_id <> reviewed_user_id),
  constraint reviews_match_reviewer_unique unique (match_id, reviewer_id)
);

create index if not exists reviews_match_idx on public.reviews(match_id);
create index if not exists reviews_reviewer_idx on public.reviews(reviewer_id);
create index if not exists reviews_reviewed_user_idx on public.reviews(reviewed_user_id);
create index if not exists reviews_created_at_idx on public.reviews(created_at desc);

alter table public.reviews enable row level security;

drop policy if exists reviews_select_authenticated on public.reviews;
create policy reviews_select_authenticated
on public.reviews
for select
to authenticated
using (true);

drop policy if exists reviews_insert_match_participants on public.reviews;
create policy reviews_insert_match_participants
on public.reviews
for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and reviewer_id <> reviewed_user_id
  and exists (
    select 1
    from public.matches m
    join public.shipments s on s.id = m.shipment_id
    join public.trips t on t.id = m.trip_id
    where m.id = reviews.match_id
      and m.status = 'completed'
      and reviews.shipment_id = m.shipment_id
      and (
        (auth.uid() = s.owner_id and reviews.reviewed_user_id = t.traveler_id)
        or
        (auth.uid() = t.traveler_id and reviews.reviewed_user_id = s.owner_id)
      )
  )
  and not exists (
    select 1
    from public.reviews existing_review
    where existing_review.match_id = reviews.match_id
      and existing_review.reviewer_id = auth.uid()
  )
);

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
    m.status
  into
    v_owner_id,
    v_traveler_id,
    v_shipment_id,
    v_match_status
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
  where m.id = p_match_id;

  if v_shipment_id is null then
    return jsonb_build_object('success', false, 'error', 'Match no encontrado');
  end if;

  if v_match_status <> 'completed' then
    return jsonb_build_object('success', false, 'error', 'Solo puedes dejar una review cuando el match esté completado');
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

create or replace function public.get_user_rating_summary(p_user_id uuid)
returns table (
  avg_rating numeric,
  total_reviews bigint
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    case
      when count(*) = 0 then null::numeric
      else round(avg(r.rating)::numeric, 1)
    end as avg_rating,
    count(*)::bigint as total_reviews
  from public.reviews r
  where r.reviewed_user_id = p_user_id;
$function$;

create or replace function public.get_user_reviews(
  p_user_id uuid,
  p_limit integer default 3,
  p_offset integer default 0
)
returns table (
  id uuid,
  match_id uuid,
  reviewer_id uuid,
  reviewed_user_id uuid,
  shipment_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  reviewer_name text,
  avg_rating numeric,
  total_reviews bigint
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with summary as (
    select *
    from public.get_user_rating_summary(p_user_id)
  )
  select
    r.id,
    r.match_id,
    r.reviewer_id,
    r.reviewed_user_id,
    r.shipment_id,
    r.rating,
    r.comment,
    r.created_at,
    coalesce(nullif(btrim(p.full_name), ''), 'Usuario INTRA') as reviewer_name,
    summary.avg_rating,
    summary.total_reviews
  from public.reviews r
  left join public.profiles p on p.id = r.reviewer_id
  cross join summary
  where r.reviewed_user_id = p_user_id
  order by r.created_at desc
  limit greatest(coalesce(p_limit, 3), 0)
  offset greatest(coalesce(p_offset, 0), 0);
$function$;
