create or replace function public.generate_payout_code()
returns text
language plpgsql
as $function$
declare
  candidate text;
begin
  loop
    candidate := 'INTRA-WDR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    exit when not exists (
      select 1
      from public.payouts p
      where p.payout_code = candidate
    );
  end loop;

  return candidate;
end;
$function$;

alter table public.payouts
  add column if not exists payout_code text;

alter table public.payouts
  alter column payout_code set default public.generate_payout_code();

update public.payouts
set payout_code = public.generate_payout_code()
where payout_code is null;

alter table public.payouts
  alter column payout_code set not null;

create unique index if not exists payouts_payout_code_key on public.payouts (payout_code);
