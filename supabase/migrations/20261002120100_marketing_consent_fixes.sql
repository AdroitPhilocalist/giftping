-- Two fixes to 20261002120000_marketing_campaigns.sql, found by testing it against the real database:
--
-- 1. export_user_data_core() returns {"result": "ok", "data": {...}} — the personal data is nested under `data`. The wrapper
--    treated ANY answer with a `result` key as "nothing to add", so a successful export never got the marketing section and a
--    person's data download would have silently left out their consent history. It now adds the section inside `data`, and only
--    skips when the answer isn't "ok" (not_found / erased).
-- 2. set_marketing_consent() tags the change through transaction-local settings. Reset them before returning so they can never
--    leak into a later statement in the same transaction.

create or replace function public.export_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  base jsonb := public.export_user_data_core(p_user_id);
begin
  if base->>'result' is distinct from 'ok' then
    return base;
  end if;
  return jsonb_set(base, '{data}', (base->'data') || jsonb_build_object(
    'marketing_emails', jsonb_build_object(
      'currently_subscribed', (select u.marketing_opt_in from public.users u where u.id = p_user_id),
      'consent_history', coalesce((
        select jsonb_agg(jsonb_build_object('action', l.action, 'source', l.source, 'notice_version', l.notice_version, 'at', l.created_at) order by l.created_at, l.id)
        from public.marketing_consent_log l where l.user_id = p_user_id), '[]'::jsonb),
      'campaigns_received', coalesce((
        select jsonb_agg(jsonb_build_object('campaign', c.name, 'subject', c.subject, 'sent_at', r.sent_at) order by r.sent_at)
        from public.marketing_campaign_recipients r join public.marketing_campaigns c on c.id = r.campaign_id
        where r.user_id = p_user_id and r.status = 'sent'), '[]'::jsonb)
    )
  ));
end;
$$;
revoke all on function public.export_user_data(uuid) from public, anon, authenticated;
grant execute on function public.export_user_data(uuid) to service_role;

create or replace function public.set_marketing_consent(p_user_id uuid, p_opt_in boolean, p_source text, p_notice_version text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed boolean;
begin
  if p_source not in ('signup', 'settings', 'unsubscribe_link', 'one_click', 'direct') then
    raise exception 'unknown consent source %', p_source;
  end if;
  perform set_config('giftping.consent_source', p_source, true);
  perform set_config('giftping.consent_notice', coalesce(p_notice_version, ''), true);
  update public.users
     set marketing_opt_in = p_opt_in
   where id = p_user_id
     and marketing_opt_in is distinct from p_opt_in
     and anonymized_at is null
     and deleted_at is null;
  changed := found;
  perform set_config('giftping.consent_source', '', true);
  perform set_config('giftping.consent_notice', '', true);
  return changed;
end;
$$;
revoke all on function public.set_marketing_consent(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.set_marketing_consent(uuid, boolean, text, text) to service_role;
