-- Gap found while building Stage 3: reviews are publicly readable, but showing "reviewed by
-- <name>" would require joining to public.users, which RLS correctly blocks for anyone other
-- than the row's own owner or an admin (users_select_own_or_admin) — a stranger browsing
-- products can't read another customer's full_name via a nested select. Rather than loosen
-- that RLS policy (a real privacy regression) or expose full names publicly (not something
-- customers consented to), denormalize a privacy-safe display name ("Priya S.", first name +
-- last initial) onto the review itself at insert time. No SECURITY DEFINER needed here — the
-- inserting user always has SELECT rights on their own users row already.

alter table public.reviews add column reviewer_display_name text;

create or replace function public.set_review_reviewer_display_name()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_full_name text;
  v_first text;
  v_last_initial text;
begin
  select full_name into v_full_name from public.users where id = new.user_id;

  if v_full_name is null then
    new.reviewer_display_name := 'GiftPing Customer';
    return new;
  end if;

  v_first := split_part(trim(v_full_name), ' ', 1);
  v_last_initial := left(split_part(trim(v_full_name), ' ', 2), 1);

  new.reviewer_display_name := case
    when v_last_initial <> '' then v_first || ' ' || v_last_initial || '.'
    else v_first
  end;

  return new;
end;
$$;

create trigger reviews_set_reviewer_display_name
  before insert on public.reviews
  for each row execute function public.set_review_reviewer_display_name();

-- Backfill for any rows inserted before this trigger existed.
update public.reviews r
set reviewer_display_name = case
  when split_part(trim(u.full_name), ' ', 2) <> ''
    then split_part(trim(u.full_name), ' ', 1) || ' ' || left(split_part(trim(u.full_name), ' ', 2), 1) || '.'
  else split_part(trim(u.full_name), ' ', 1)
end
from public.users u
where r.user_id = u.id and r.reviewer_display_name is null;
