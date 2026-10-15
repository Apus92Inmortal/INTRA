-- READ ONLY. Supply the intended ADMIN_USER_IDS privately as a JSON array
-- in the local SQL editor/session setting intra.review_admin_ids.
-- Example values must never be copied into a PR, chat, query log or document.
-- A matching UUID proves account existence, not ownership or admin intent.
with configured as (
  select distinct value::uuid as id
  from jsonb_array_elements_text(
    coalesce(nullif(current_setting('intra.review_admin_ids', true), ''), '[]')::jsonb
  )
), checks as (
  select c.id, u.id is not null as exists_in_auth,
    u.email_confirmed_at is not null as email_confirmed,
    u.id is not null and (u.banned_until is null or u.banned_until < now()) as not_banned,
    exists (
      select 1 from auth.mfa_factors f
      where f.user_id = c.id and f.status = 'verified'
    ) as verified_mfa
  from configured c left join auth.users u on u.id = c.id
)
select count(*) as configured_admin_count,
  count(*) filter (where exists_in_auth) as existing_account_count,
  coalesce(bool_and(exists_in_auth), false) as all_exist,
  coalesce(bool_and(email_confirmed), false) as all_email_confirmed,
  coalesce(bool_and(not_banned), false) as all_not_banned,
  coalesce(bool_and(verified_mfa), false) as all_have_verified_mfa
from checks;
