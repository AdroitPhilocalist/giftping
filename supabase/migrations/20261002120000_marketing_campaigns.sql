-- Customer marketing email campaigns — consent, evidence, campaigns, and sending limits.
--
-- 1. CONSENT. users.marketing_opt_in has existed since the first migration with DEFAULT TRUE, and nothing in the app ever asked
--    anyone or offered a way to change it — so every account looked "opted in" without having been asked. That is not valid
--    consent under India's DPDP Act 2023 (consent must be free, specific, informed and a clear affirmative action; a pre-set
--    "yes" is none of those). So: the default becomes FALSE and every existing flag is reset. Marketing emails are opt-IN only.
--    The reset runs BEFORE the logging trigger exists on purpose — nobody "withdrew" anything, so no log rows are invented.
--
-- 2. EVIDENCE. Every change to users.marketing_opt_in is logged by a trigger (who, granted/withdrawn, from where, which wording
--    of the consent notice). A trigger, not app code, so the record is complete no matter which code path or direct API call
--    flipped the flag. The log is append-only for clients (no insert/update/delete rights at all).
--
-- 3. CAMPAIGNS. An admin writes a campaign (plain text, never raw HTML), picks a segment, and sends. Sending is a QUEUE
--    (marketing_campaign_recipients): the audience is frozen at "start", but consent is re-checked per person at the moment of
--    sending, so someone who unsubscribes between queueing and sending is never emailed.
--
-- 4. LIMITS. Sending is metered by two platform_settings numbers (daily and monthly) so the free Resend tier (roughly 100/day,
--    3,000/month, shared with order emails) is respected today and moving to a paid plan is a settings change, not a code change.
--    No campaign data is personal beyond a user_id + status; it never touches the Personal Gifting Diary.

-- ---------------------------------------------------------------------------
-- 1. Consent: stop defaulting to "yes"
-- ---------------------------------------------------------------------------
alter table public.users alter column marketing_opt_in set default false;
update public.users set marketing_opt_in = false where marketing_opt_in;

-- ---------------------------------------------------------------------------
-- 2. Consent evidence log
-- ---------------------------------------------------------------------------
create table public.marketing_consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('granted', 'withdrawn')),
  -- where the change came from: the sign-up form, the account settings page, the unsubscribe page, an email client's one-click
  -- unsubscribe button, or 'direct' (anything else, e.g. an erasure resetting the flag)
  source text not null check (source in ('signup', 'settings', 'unsubscribe_link', 'one_click', 'direct')),
  -- which wording of the consent text the person saw (lib/marketing/consent.ts) — proof of WHAT was agreed to
  notice_version text,
  created_at timestamptz not null default now()
);
create index marketing_consent_log_user_idx on public.marketing_consent_log (user_id, created_at desc);

alter table public.marketing_consent_log enable row level security;
create policy marketing_consent_log_select_own_or_admin on public.marketing_consent_log
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke all on table public.marketing_consent_log from anon;
revoke insert, update, delete on table public.marketing_consent_log from authenticated;

-- SECURITY DEFINER only so it can write the log; it never reads current_user/session_user (CLAUDE.md Stage 1, bug 2 doesn't apply).
create or replace function public.log_marketing_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  src text := coalesce(nullif(current_setting('giftping.consent_source', true), ''), 'direct');
  ver text := nullif(current_setting('giftping.consent_notice', true), '');
begin
  if tg_op = 'INSERT' then
    if new.marketing_opt_in then
      insert into public.marketing_consent_log (user_id, action, source, notice_version) values (new.id, 'granted', src, ver);
    end if;
  elsif new.marketing_opt_in is distinct from old.marketing_opt_in then
    insert into public.marketing_consent_log (user_id, action, source, notice_version)
    values (new.id, case when new.marketing_opt_in then 'granted' else 'withdrawn' end, src, case when new.marketing_opt_in then ver else null end);
  end if;
  return new;
end;
$$;
revoke all on function public.log_marketing_consent() from public, anon, authenticated;

create trigger users_log_marketing_consent
  after insert or update of marketing_opt_in on public.users
  for each row execute function public.log_marketing_consent();

-- The one way the app changes consent: tags the change with its source and the notice wording, then flips the flag (the trigger
-- writes the log). Returns whether anything actually changed. Server-only.
create or replace function public.set_marketing_consent(p_user_id uuid, p_opt_in boolean, p_source text, p_notice_version text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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
  return found;
end;
$$;
revoke all on function public.set_marketing_consent(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.set_marketing_consent(uuid, boolean, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Campaigns
-- ---------------------------------------------------------------------------
create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  subject text not null check (char_length(subject) between 1 and 150),
  preheader text check (preheader is null or char_length(preheader) <= 200),
  -- plain text; blank lines separate paragraphs. Escaped when rendered — never stored or sent as HTML.
  body text not null check (char_length(body) between 1 and 5000),
  cta_label text check (cta_label is null or char_length(cta_label) between 1 and 40),
  -- same rule as banners.cta_url: a site path or an https URL, no whitespace or backslashes (it becomes an href in an email)
  cta_url text check (cta_url is null or cta_url ~ '^(/|/[^/\\\s][^\s\\]*|https://[^\s\\]+)$'),
  segment text not null default 'all' check (segment in ('all', 'buyers', 'non_buyers', 'lapsed')),
  status text not null default 'draft' check (status in ('draft', 'sending', 'paused', 'sent', 'cancelled')),
  recipient_count integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint marketing_campaigns_cta_pair check ((cta_label is null) = (cta_url is null))
);

create trigger set_marketing_campaigns_updated_at
  before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();

alter table public.marketing_campaigns enable row level security;
create policy marketing_campaigns_admin_all on public.marketing_campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on table public.marketing_campaigns from anon;

create table public.marketing_campaign_recipients (
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  -- sending = claimed by a run (so overlapping runs can't double-send); skipped = no longer eligible at send time (unsubscribed, erased…)
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  error text,
  provider_id text,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create index marketing_recipients_open_idx on public.marketing_campaign_recipients (campaign_id) where status in ('queued', 'sending');
create index marketing_recipients_sent_idx on public.marketing_campaign_recipients (sent_at) where sent_at is not null;
create index marketing_recipients_user_idx on public.marketing_campaign_recipients (user_id);

alter table public.marketing_campaign_recipients enable row level security;
create policy marketing_recipients_admin_select on public.marketing_campaign_recipients
  for select to authenticated using (public.is_admin());
revoke all on table public.marketing_campaign_recipients from anon;
revoke insert, update, delete on table public.marketing_campaign_recipients from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Sending limits (editable by an admin; defaults sit well inside the free Resend tier)
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, description) values
  ('marketing_daily_cap', '50', 'Most marketing emails sent per day (UTC). Keep well under your email provider''s daily limit — order and diary emails share it. Raise when moving to a paid plan.'),
  ('marketing_monthly_cap', '1500', 'Most marketing emails sent per calendar month (UTC). Keep well under your provider''s monthly limit. Raise when moving to a paid plan.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Right of access: a person's data download includes their consent history and the campaigns they were sent.
--    Wraps the existing function rather than copying its (very long) body again.
-- ---------------------------------------------------------------------------
alter function public.export_user_data(uuid) rename to export_user_data_core;

create or replace function public.export_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  base jsonb := public.export_user_data_core(p_user_id);
begin
  -- 'not_found' / 'erased' answers have a `result` key and nothing more to add
  if base ? 'result' then
    return base;
  end if;
  return base || jsonb_build_object(
    'marketing_emails', jsonb_build_object(
      'currently_subscribed', (select u.marketing_opt_in from public.users u where u.id = p_user_id),
      'consent_history', coalesce((
        select jsonb_agg(jsonb_build_object('action', l.action, 'source', l.source, 'notice_version', l.notice_version, 'at', l.created_at) order by l.created_at)
        from public.marketing_consent_log l where l.user_id = p_user_id), '[]'::jsonb),
      'campaigns_received', coalesce((
        select jsonb_agg(jsonb_build_object('campaign', c.name, 'subject', c.subject, 'sent_at', r.sent_at) order by r.sent_at)
        from public.marketing_campaign_recipients r join public.marketing_campaigns c on c.id = r.campaign_id
        where r.user_id = p_user_id and r.status = 'sent'), '[]'::jsonb)
    )
  );
end;
$$;
revoke all on function public.export_user_data(uuid) from public, anon, authenticated;
grant execute on function public.export_user_data(uuid) to service_role;
