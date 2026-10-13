begin;

-- A13: enforce private upload limits at the Storage service, independently of
-- browser checks. Existing objects remain untouched. Production inspection:
-- existing formats JPEG/PNG/WebP, largest object under 2 MiB.
-- 5 MiB allows the current 2 MiB compression target with headroom.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id in ('identity-verification', 'shipment-evidence');

do $buckets$
begin
  if (
    select count(*) from storage.buckets
    where id in ('identity-verification', 'shipment-evidence')
  ) <> 2 then
    raise exception 'Required private upload buckets missing';
  end if;
end;
$buckets$;

commit;
