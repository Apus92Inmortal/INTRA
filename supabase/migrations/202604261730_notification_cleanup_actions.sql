create or replace function public.delete_notification(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'No autenticado');
  end if;

  delete from public.notifications
  where id = p_notification_id
    and user_id = v_actor;

  if not found then
    return jsonb_build_object('success', false, 'error', 'notification_not_found');
  end if;

  return jsonb_build_object('success', true, 'notification_id', p_notification_id);
end;
$function$;

create or replace function public.clear_user_notifications(p_only_read boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_deleted_count integer := 0;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'No autenticado');
  end if;

  delete from public.notifications
  where user_id = v_actor
    and (not coalesce(p_only_read, false) or is_read = true);

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'only_read', coalesce(p_only_read, false)
  );
end;
$function$;
