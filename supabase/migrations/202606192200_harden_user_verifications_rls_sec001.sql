-- SEC-001: Harden user_verifications RLS to prevent unauthorized status escalations.
-- Prevents authenticated users from directly modifying sensitive fields like 'verification_status'.

begin;

-- 1. Drop the broad and vulnerable update policy
drop policy if exists "Users can update own verifications" on public.user_verifications;

-- 2. Create a restrictive update policy for users
-- This allows updating ONLY if the status is NOT 'verified' or 'pending' (locked).
-- Note: verification_status is still protected by this being a non-updatable field via RLS
-- if we only allow specific columns or use a check that ensures the status remains unchanged.
-- However, Supabase RLS 'with check' is the standard way to enforce column-level-like constraints.

create policy "Users can update own unverified verifications"
  on public.user_verifications
  for update
  to authenticated
  using (
    auth.uid() = user_id 
    and verification_status in ('unverified', 'rejected')
  )
  with check (
    auth.uid() = user_id
    and verification_status = 'pending' -- Users can only transition to 'pending'
  );

-- 3. Ensure service_role (Admin) can still manage all aspects
-- (Usually service_role bypasses RLS, but explicit grants are safer for RPCs)

-- Verify existing policies for select/insert to ensure they remain functional but secure
-- Users can still view their own
-- create policy "Users can view own verifications" on public.user_verifications for select to authenticated using (auth.uid() = user_id);

-- Users can still insert their own (initial submission)
-- create policy "Users can insert own verifications" on public.user_verifications for insert to authenticated with check (auth.uid() = user_id);

commit;
