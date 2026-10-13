begin;

-- Deploy only after the checkout uses create_payment_retry in production.
-- Keep the existing contextual SELECT policies for customer and traveler views.
drop policy if exists payments_insert_own on public.payments;
drop policy if exists payments_update_related_users on public.payments;
drop policy if exists payouts_insert_own on public.payouts;

revoke all privileges on table public.payments, public.payouts
  from public, anon, authenticated;
grant select on table public.payments, public.payouts to authenticated;

notify pgrst, 'reload schema';

commit;
