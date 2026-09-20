-- ============================================================================
-- Notifications: keep diary content away from admins, and make the inbox tamper-proof.
--
-- The original SELECT policy let any admin read every notification. Diary reminders put a contact's name and date in the
-- title ("Priya's 31st birthday is in 7 days"), which would hand admins exactly the diary content the product promises they
-- never see. Diary reminders are now readable only by their owner (the rest — orders, shipments — stay admin-visible for support).
--
-- The original UPDATE policy also let a user rewrite any column of their own notification. Only `is_read` may change.
-- ============================================================================
drop policy notifications_select_own_or_admin on public.notifications;
create policy notifications_select_own_or_admin on public.notifications
  for select using (
    user_id = auth.uid()
    or (public.is_admin() and type <> 'diary_reminder')
  );

-- SECURITY INVOKER (Stage 2 rule): it reads is_service_role(), which inspects current_user.
create or replace function public.notifications_only_read_flag_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_service_role() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.type is distinct from old.type
     or new.link_url is distinct from old.link_url
     or new.metadata is distinct from old.metadata
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the read status of a notification can be changed.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger notifications_only_read_flag_changes
  before update on public.notifications
  for each row execute function public.notifications_only_read_flag_changes();
