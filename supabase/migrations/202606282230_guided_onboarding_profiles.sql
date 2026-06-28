alter table public.profiles
  add column if not exists onboarding_completed boolean default false not null,
  add column if not exists onboarding_intent text,
  add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_onboarding_intent_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_onboarding_intent_check
      check (
        onboarding_intent is null
        or onboarding_intent in ('send', 'travel', 'explore')
      );
  end if;
end $$;

update public.profiles
set
  onboarding_completed = true,
  onboarding_completed_at = coalesce(onboarding_completed_at, created_at::timestamptz, now())
where onboarding_completed = false
  and created_at < timestamp '2026-06-28 00:00:00';

comment on column public.profiles.onboarding_completed is 'Indica si el usuario ya completo el onboarding inicial guiado.';
comment on column public.profiles.onboarding_intent is 'Intencion inicial elegida en onboarding: send, travel o explore.';
comment on column public.profiles.onboarding_completed_at is 'Fecha en que el usuario completo el onboarding inicial guiado.';
