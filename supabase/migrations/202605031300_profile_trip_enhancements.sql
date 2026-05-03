alter table public.trips
  add column if not exists departure_time time without time zone;

comment on column public.trips.departure_time is 'Hora estimada de salida del viaje.';

alter table public.profiles
  add column if not exists document_number text,
  add column if not exists city_id uuid references public.cities(id) on delete set null;

create index if not exists profiles_city_idx on public.profiles (city_id);

