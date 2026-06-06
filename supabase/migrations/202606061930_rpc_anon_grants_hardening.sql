begin;

-- F2 hardening: these RPCs require an authenticated user context and validate auth.uid().
-- Later migrations reintroduced anon grants after the phase0 hardening migration.
revoke execute on function public.mark_match_read(uuid, timestamptz) from anon;
revoke execute on function public.request_match(uuid, uuid) from anon;
revoke execute on function public.create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean) from anon;

grant execute on function public.mark_match_read(uuid, timestamptz) to authenticated;
grant execute on function public.request_match(uuid, uuid) to authenticated;
grant execute on function public.create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
