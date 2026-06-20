-- SEC-001: Harden user_verifications RLS and Grants to prevent unauthorized status escalations.
-- Implementation: Option A (Server Action) + Restrictive SQL.
-- This migration restricts direct client-side updates and ensures only the server-side action
-- (using service_role) can modify sensitive verification fields.

begin;

-- 1. Eliminar políticas de escritura que permitían acceso directo desde el cliente
drop policy if exists "Users can update own verifications" on public.user_verifications;
drop policy if exists "Users can update own unverified verifications" on public.user_verifications;
drop policy if exists "Users can insert own verifications" on public.user_verifications;
drop policy if exists "Users can insert own verifications as pending" on public.user_verifications;

-- 2. Revocar permisos de escritura directos (INSERT, UPDATE, DELETE) para usuarios autenticados y anónimos.
-- Esto protege todas las columnas (admin y de usuario) de manipulación directa vía API/SDK.
-- El flujo de verificación ahora es exclusivo a través de la Server Action 'submitUserVerificationAction'.
revoke insert, update, delete on public.user_verifications from authenticated, anon;

-- 3. Mantener y asegurar el acceso de lectura para el propietario
-- El usuario aún necesita ver su propio estado de verificación.
grant select on public.user_verifications to authenticated;

drop policy if exists "Users can view own verifications" on public.user_verifications;
create policy "Users can view own verifications"
  on public.user_verifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 4. Nota sobre Service Role:
-- Las operaciones administrativas (reviewUserVerificationAction) y el envío de usuario (submitUserVerificationAction)
-- utilizan el cliente administrativo (service_role), por lo que omiten RLS y mantienen permisos completos.

commit;
