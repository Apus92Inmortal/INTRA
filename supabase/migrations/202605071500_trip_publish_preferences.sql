alter table public.trips
  add column if not exists flight_number text,
  add column if not exists accepts_fragile boolean not null default false,
  add column if not exists accepts_multiple_packages boolean not null default false,
  add column if not exists has_stopovers boolean not null default false;

comment on column public.trips.flight_number is 'Número de vuelo asociado al viaje publicado.';
comment on column public.trips.accepts_fragile is 'Indica si el viajero acepta paquetes frágiles.';
comment on column public.trips.accepts_multiple_packages is 'Indica si el viajero acepta múltiples paquetes en el mismo viaje.';
comment on column public.trips.has_stopovers is 'Indica si el viaje incluye paradas o escalas intermedias.';
