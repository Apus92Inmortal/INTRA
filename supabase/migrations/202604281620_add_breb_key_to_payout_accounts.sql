alter table public.traveler_payout_accounts
  add column if not exists breb_key text;
