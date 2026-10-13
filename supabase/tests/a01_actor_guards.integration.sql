-- ISOLATED DB ONLY: exercise private routines through a deliberately exposed
-- test-only SECURITY DEFINER wrapper, proving their own actor guards still hold.
-- Installed wrappers and fixtures are always rolled back.
\if :{?INTRA_TEST_ISOLATED}
\else
  \echo 'Refusing fixture test: INTRA_TEST_ISOLATED=true is required.'
  \quit 1
\endif
\if :INTRA_TEST_ISOLATED
\else
  \quit 1
\endif

begin;

create function public.a01_test_release_wrapper(p_id uuid) returns jsonb
language sql security definer set search_path=''
as $body$ select public.release_payment(p_id,'a01_isolated_test'); $body$;
create function public.a01_test_refund_wrapper(p_id uuid) returns jsonb
language sql security definer set search_path=''
as $body$ select public.refund_payment(p_id,'a01_isolated_test'); $body$;
grant execute on function public.a01_test_release_wrapper(uuid),
  public.a01_test_refund_wrapper(uuid) to anon,authenticated,service_role;

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $test$
begin
  if public.a01_test_release_wrapper('a0100000-0000-4000-8000-000000000099')->>'error' <> 'not_authenticated' then
    raise exception 'Release missing-actor guard bypassed through definer';
  end if;
  if public.a01_test_refund_wrapper('a0100000-0000-4000-8000-000000000099')->>'error' <> 'not_authenticated' then
    raise exception 'Refund missing-actor guard bypassed through definer';
  end if;
end;
$test$;

reset role;
set local role anon;
do $test$
begin
  if public.a01_test_release_wrapper('a0100000-0000-4000-8000-000000000099')->>'error' <> 'not_authenticated' then
    raise exception 'Anon inherited NULL guard bypassed';
  end if;
end;
$test$;

-- Cron runs as postgres with no API role and no uid; guard must permit it.
reset role;
do $test$
begin
  if public.release_payment('a0100000-0000-4000-8000-000000000099')->>'error' <> 'payment_not_found' then
    raise exception 'Trusted SQL cron context blocked';
  end if;
  if public.refund_payment('a0100000-0000-4000-8000-000000000099')->>'error' <> 'not_authenticated' then
    raise exception 'Legacy refund unexpectedly admits missing actor';
  end if;
end;
$test$;

-- A legitimate server wrapper retains a service_role original SQL role.
set local role service_role;
do $test$
begin
  if public.a01_test_release_wrapper('a0100000-0000-4000-8000-000000000099')->>'error' <> 'payment_not_found' then
    raise exception 'Trusted server wrapper context blocked';
  end if;
  begin
    perform public.release_payment('a0100000-0000-4000-8000-000000000099');
    raise exception 'Internal release direct service_role API became callable';
  exception when insufficient_privilege then null; end;
end;
$test$;

-- An authenticated actor with a payment that has no match must not pass NULL
-- owner/traveler comparisons. This proves IS DISTINCT FROM avoids NULL bypass.
reset role;
insert into auth.users(id,email)
values('a0100000-0000-4000-8000-000000000001','a01-owner@example.invalid');
insert into public.profiles(id,full_name)
values('a0100000-0000-4000-8000-000000000001','A01 fixture') on conflict(id) do nothing;
insert into public.payments(id,user_id,amount,status,gateway_status)
values('a0100000-0000-4000-8000-000000000010',
  'a0100000-0000-4000-8000-000000000001',20000,'pending','created');
select set_config('request.jwt.claim.sub','a0100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a0100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $test$
begin
  begin
    perform public.a01_test_release_wrapper('a0100000-0000-4000-8000-000000000010');
    raise exception 'Missing match owner authorized release';
  exception when raise_exception then
    if sqlerrm <> 'No autorizado' then raise; end if;
  end;
  begin
    perform public.a01_test_refund_wrapper('a0100000-0000-4000-8000-000000000010');
    raise exception 'Missing match participants authorized refund';
  exception when raise_exception then
    if sqlerrm <> 'No autorizado' then raise; end if;
  end;
end;
$test$;
reset role;
select 'A01 NULL/original-role guard tests PASS' as result;
rollback;
