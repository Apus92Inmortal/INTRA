begin;

alter table public.shipment_evidence
  drop constraint if exists shipment_evidence_evidence_type_check;

alter table public.shipment_evidence
  add constraint shipment_evidence_evidence_type_check
  check (
    evidence_type = any (
      array[
        'pickup'::text,
        'delivery'::text,
        'package_state'::text,
        'customer_initial_photo'::text,
        'pickup_photo'::text,
        'delivery_photo'::text,
        'suspicious_photo'::text
      ]
    )
  );

comment on constraint shipment_evidence_evidence_type_check on public.shipment_evidence is
  'Allowed shipment evidence types. Keeps legacy pickup/delivery/package_state and adds semantic photo evidence types.';

commit;
