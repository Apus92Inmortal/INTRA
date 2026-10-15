-- Destructive fixture test for an ISOLATED disposable DB only.
-- psql -v ON_ERROR_STOP=1 -v INTRA_TEST_ISOLATED=true -f this-file.sql
-- Apply schema and A06/A01/A13 migrations before running. All fixtures rollback.
\if :{?INTRA_TEST_ISOLATED}
\else
  \echo 'Refusing fixture test: pass INTRA_TEST_ISOLATED=true on a disposable DB.'
  \quit 1
\endif
\if :INTRA_TEST_ISOLATED
\else
  \quit 1
\endif

begin;
set local search_path=public,pg_catalog;

insert into auth.users(id,email) values
  ('a0600000-0000-4000-8000-000000000001','a06-customer@example.invalid'),
  ('a0600000-0000-4000-8000-000000000002','a06-traveler@example.invalid'),
  ('a0600000-0000-4000-8000-000000000003','a06-third@example.invalid');
insert into public.profiles(id,full_name) values
  ('a0600000-0000-4000-8000-000000000001','A06 customer'),
  ('a0600000-0000-4000-8000-000000000002','A06 traveler'),
  ('a0600000-0000-4000-8000-000000000003','A06 third')
on conflict(id) do nothing;
insert into public.cities(id,name,department) values
  ('a0600000-0000-4000-8000-000000000004','A06 Origin','A06 Test'),
  ('a0600000-0000-4000-8000-000000000005','A06 Destination','A06 Test');
insert into public.shipments(id,owner_id,origin_city_id,destination_city_id,kind,description,weight_kg,status)
select id, 'a0600000-0000-4000-8000-000000000001'::uuid,
  'a0600000-0000-4000-8000-000000000004'::uuid,
  'a0600000-0000-4000-8000-000000000005'::uuid,
  'package','A06 isolated fixture',1,status
from (values
  ('a0600000-0000-4000-8000-000000000010'::uuid,'open'),
  ('a0600000-0000-4000-8000-000000000011'::uuid,'open'),
  ('a0600000-0000-4000-8000-000000000012'::uuid,'in_transit'),
  ('a0600000-0000-4000-8000-000000000013'::uuid,'cancelled')
) rows(id,status);
insert into public.trips(id,traveler_id,origin_city_id,destination_city_id,departure_date,status)
select id,traveler_id,
  'a0600000-0000-4000-8000-000000000004'::uuid,
  'a0600000-0000-4000-8000-000000000005'::uuid,current_date + 1,status
from (values
  ('a0600000-0000-4000-8000-000000000020'::uuid,'a0600000-0000-4000-8000-000000000002'::uuid,'open'),
  ('a0600000-0000-4000-8000-000000000021'::uuid,'a0600000-0000-4000-8000-000000000001'::uuid,'closed')
) rows(id,traveler_id,status);
insert into public.payments(id,shipment_id,user_id,amount,status,gateway_status,refund_status,dispute_status)
values('a0600000-0000-4000-8000-000000000030',
  'a0600000-0000-4000-8000-000000000011',
  'a0600000-0000-4000-8000-000000000001',20000,'held','approved','none','none');
insert into public.matches(id,shipment_id,trip_id,requester_id,status)
values('a0600000-0000-4000-8000-000000000040',
  'a0600000-0000-4000-8000-000000000012',
  'a0600000-0000-4000-8000-000000000020',
  'a0600000-0000-4000-8000-000000000002','accepted');
insert into public.shipment_evidence(shipment_id,match_id,uploaded_by,evidence_type,file_path,file_name,mime_type)
values('a0600000-0000-4000-8000-000000000012',
  'a0600000-0000-4000-8000-000000000040',
  'a0600000-0000-4000-8000-000000000001','customer_initial_photo',
  'a0600000-0000-4000-8000-000000000001/a0600000-0000-4000-8000-000000000012/test.jpg',
  'test.jpg','image/jpeg');

-- Customer sees own four fixtures, including closed/unpaid.
select set_config('request.jwt.claim.sub','a0600000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a0600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $test$
begin
  if (select count(*) from public.shipments where description='A06 isolated fixture') <> 4 then
    raise exception 'Customer cannot see own shipments';
  end if;
  begin
    update public.matches set status='completed' where id='a0600000-0000-4000-8000-000000000040';
    raise exception 'Direct match transition allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.shipments set status='delivered' where id='a0600000-0000-4000-8000-000000000012';
    raise exception 'Direct shipment transition allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.matches(shipment_id,trip_id,requester_id,status)
    values('a0600000-0000-4000-8000-000000000010',
      'a0600000-0000-4000-8000-000000000020',auth.uid(),'accepted');
    raise exception 'Direct match insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.shipments(owner_id,origin_city_id,destination_city_id,kind,description,weight_kg)
    values(auth.uid(),'a0600000-0000-4000-8000-000000000004',
      'a0600000-0000-4000-8000-000000000005','package','Bypass draft',1);
    raise exception 'Direct shipment insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.trips where id='a0600000-0000-4000-8000-000000000021';
    raise exception 'Direct trip delete allowed';
  exception when insufficient_privilege then null; end;
end;
$test$;

-- Traveler sees the paid opportunity and related in-transit shipment.
reset role;
select set_config('request.jwt.claim.sub','a0600000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a0600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $test$
declare v_result jsonb;
begin
  if (select count(*) from public.shipments where description='A06 isolated fixture') <> 2 then
    raise exception 'Traveler shipment visibility incorrect';
  end if;
  if not exists(select 1 from public.shipment_evidence where shipment_id='a0600000-0000-4000-8000-000000000012') then
    raise exception 'Participant evidence disappeared';
  end if;
  if exists(select 1 from public.profiles where id='a0600000-0000-4000-8000-000000000001') then
    raise exception 'Full customer profile exposed to traveler';
  end if;
  if exists(select 1 from public.trips where id='a0600000-0000-4000-8000-000000000021') then
    raise exception 'Unrelated closed trip exposed';
  end if;
  v_result := public.request_match('a0600000-0000-4000-8000-000000000010','a0600000-0000-4000-8000-000000000020');
  if coalesce((v_result->>'success')::boolean,false) then
    raise exception 'RPC matched unpaid shipment';
  end if;
  perform public.mark_match_read('a0600000-0000-4000-8000-000000000040',now());
  if not exists(select 1 from public.matches where id='a0600000-0000-4000-8000-000000000040' and last_read_by_traveler is not null) then
    raise exception 'Read receipt RPC no longer works';
  end if;
  insert into public.messages(match_id,sender_id,message)
  values('a0600000-0000-4000-8000-000000000040',auth.uid(),'A06 accepted chat');
  begin
    insert into public.messages(match_id,sender_id,message)
    values('a0600000-0000-4000-8000-000000000040','a0600000-0000-4000-8000-000000000001','Forged sender');
    raise exception 'Forged sender allowed';
  exception when insufficient_privilege then null; end;
end;
$test$;

-- Third party only sees a paid open market opportunity; no relation/PII/evidence.
reset role;
select set_config('request.jwt.claim.sub','a0600000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"a0600000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $test$
declare v_trip jsonb; v_match jsonb;
begin
  if (select count(*) from public.shipments where description='A06 isolated fixture') <> 1 then
    raise exception 'Third party sees unpaid/closed shipments';
  end if;
  if exists(select 1 from public.matches where id='a0600000-0000-4000-8000-000000000040') then
    raise exception 'Third party sees private match';
  end if;
  if exists(select 1 from public.messages where message='A06 accepted chat') then
    raise exception 'Third party sees chat';
  end if;
  if exists(select 1 from public.shipment_evidence where shipment_id='a0600000-0000-4000-8000-000000000012') then
    raise exception 'Third party sees evidence';
  end if;
  if exists(select 1 from public.profiles where id='a0600000-0000-4000-8000-000000000001') then
    raise exception 'Third party sees full customer profile';
  end if;
  begin
    insert into public.messages(match_id,sender_id,message)
    values('a0600000-0000-4000-8000-000000000040',auth.uid(),'A06 outsider chat');
    raise exception 'Third party can write private chat';
  exception when insufficient_privilege then null; end;
  v_trip := public.create_trip('a0600000-0000-4000-8000-000000000004',
    'a0600000-0000-4000-8000-000000000005',current_date + 1);
  if coalesce((v_trip->>'success')::boolean,false) is not true then
    raise exception 'Trip RPC failed: %',v_trip;
  end if;
  v_match := public.request_match('a0600000-0000-4000-8000-000000000011',
    (v_trip->>'trip_id')::uuid);
  if coalesce((v_match->>'success')::boolean,false) is not true then
    raise exception 'Paid opportunity match RPC failed: %',v_match;
  end if;
  begin
    insert into public.messages(match_id,sender_id,message)
    values((v_match->>'match_id')::uuid,auth.uid(),'A06 pending chat');
    raise exception 'Chat allowed before acceptance';
  exception when insufficient_privilege then null; end;
end;
$test$;

reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $test$
begin
  begin
    perform 1 from public.shipments;
    raise exception 'Anon reads shipments';
  exception when insufficient_privilege then null; end;
  begin
    perform public.request_match('a0600000-0000-4000-8000-000000000011','a0600000-0000-4000-8000-000000000020');
    raise exception 'Anon invokes request_match';
  exception when insufficient_privilege then null; end;
  begin
    perform public.can_view_shipment('a0600000-0000-4000-8000-000000000011');
    raise exception 'Anon invokes contextual helper';
  exception when insufficient_privilege then null; end;
  perform public.calculate_payment_amount(20000,1);
end;
$test$;

reset role;
set local role service_role;
do $test$
begin
  if (select count(*) from public.shipments where description='A06 isolated fixture') <> 4 then
    raise exception 'Admin server shipment access lost';
  end if;
  if not exists(select 1 from public.messages where message='A06 accepted chat') then
    raise exception 'Admin server chat access lost';
  end if;
end;
$test$;
reset role;
select 'A06 isolated role/PII/chat tests PASS' as result;
rollback;
