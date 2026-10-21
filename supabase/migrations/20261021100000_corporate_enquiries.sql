-- Corporate gifting quote requests.
--
-- The public /corporate-gifting page collects a structured brief (company, contact, quantity, budget,
-- gifting need, branding, delivery) rather than a loose "message us" form, so the team can quote from
-- the first reply. The row is written by the public form's Server Action through the service role,
-- which is also why there is no INSERT policy here: a client must never be able to forge an enquiry
-- straight into PostgREST. Admins read and update leads through the normal authenticated RLS path.
create table public.corporate_enquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(company_name) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  work_email text not null check (char_length(work_email) between 5 and 200 and position('@' in work_email) > 1),
  phone text not null check (char_length(phone) between 7 and 20),
  gifting_need text not null check (gifting_need in (
    'client_gifting', 'employee_gifting', 'onboarding_kits', 'festive_gifting',
    'recognition_awards', 'event_merchandise', 'other'
  )),
  quantity_range text not null check (quantity_range in (
    'under_25', '25_99', '100_249', '250_499', '500_plus', 'not_sure'
  )),
  budget_range text not null check (budget_range in (
    'under_1000', '1000_2500', '2500_5000', '5000_plus', 'not_sure'
  )),
  delivery_city text check (delivery_city is null or char_length(delivery_city) <= 120),
  delivery_date date,
  branding_requirements text check (branding_requirements is null or char_length(branding_requirements) <= 1000),
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),
  -- The Server Action only inserts after the consent checkbox is true; recording the time keeps the
  -- contact permission auditable without adding a second boolean that could drift from it.
  consent_at timestamptz not null default now(),
  source text not null default 'corporate-gifting' check (char_length(source) between 1 and 60),
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.corporate_enquiries is 'Structured quote requests from the public corporate-gifting page. Written by trusted server code; read/updated by admins.';
comment on column public.corporate_enquiries.quantity_range is 'Stable code, not display copy; labels live in lib/validation/corporate-enquiry.schema.ts.';
comment on column public.corporate_enquiries.budget_range is 'Stable code, not display copy; labels live in lib/validation/corporate-enquiry.schema.ts.';
comment on column public.corporate_enquiries.consent_at is 'When the enquirer agreed to be contacted about this brief.';

create index corporate_enquiries_created_at_idx on public.corporate_enquiries (created_at desc);
create index corporate_enquiries_status_created_at_idx on public.corporate_enquiries (status, created_at desc);

create trigger corporate_enquiries_set_updated_at
  before update on public.corporate_enquiries
  for each row execute function public.set_updated_at();

alter table public.corporate_enquiries enable row level security;

-- New tables inherit the project's broad baseline grants. Tighten this one deliberately: the public
-- form has no client-side write path at all, and deleting a lead is not something the admin UI does.
revoke all on table public.corporate_enquiries from anon;
revoke insert, delete on table public.corporate_enquiries from authenticated;
grant select, update on table public.corporate_enquiries to authenticated;
grant all on table public.corporate_enquiries to service_role;

create policy corporate_enquiries_admin_read on public.corporate_enquiries
  for select to authenticated using (public.is_admin());

create policy corporate_enquiries_admin_update on public.corporate_enquiries
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Ask PostgREST to pick up the new table immediately instead of waiting for its own reload.
notify pgrst, 'reload schema';
