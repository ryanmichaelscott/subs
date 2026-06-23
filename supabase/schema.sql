-- Members (one row per Clerk user who signs up)
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text not null,
  name text,
  zip text,
  tier text not null default 'Member' check (tier in ('Member', 'Member+', 'Elite')),
  status text not null default 'Active' check (status in ('Active', 'Trial', 'Churned')),
  joined_at timestamptz not null default now(),
  renewal_date date
);

-- Contractors (vetted network)
create table if not exists contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text not null,
  contact_name text,
  contact_email text,
  bio text,
  service_area text,
  discount_description text,
  rating numeric(3,1) default 0,
  jobs_count int default 0,
  years_experience int,
  licensed boolean default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  clerk_invitation_id text,
  submitted_at timestamptz not null default now()
);

-- Per-contractor member rate card
create table if not exists contractor_rates (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  service_name text not null,
  member_price text not null,
  market_price text
);

-- Job requests submitted by members
create table if not exists job_requests (
  id uuid primary key default gen_random_uuid(),
  display_id text unique,
  clerk_user_id text not null,
  contractor_id uuid references contractors(id),
  trade text not null,
  service text,
  description text,
  zip text not null,
  preferred_date date,
  rate text,
  status text not null default 'pending' check (status in ('pending', 'Scheduled', 'Complete', 'Cancelled')),
  submitted_at timestamptz not null default now()
);

-- Leads dispatched to contractors from job requests
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  display_id text unique,
  job_request_id uuid references job_requests(id),
  contractor_id uuid not null references contractors(id),
  member_name text,
  address text,
  zip text,
  service text,
  rate text,
  member_tier text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  expires_at timestamptz,
  dispatched_at timestamptz not null default now()
);

-- RLS: enable on all tables
alter table members enable row level security;
alter table contractors enable row level security;
alter table contractor_rates enable row level security;
alter table job_requests enable row level security;
alter table leads enable row level security;

-- Members can read/write their own row
create policy "members_own_row" on members
  for all using (clerk_user_id = requesting_user_id());

-- Anyone can submit a contractor application (inserted as pending)
create policy "anyone_can_apply" on contractors
  for insert with check (status = 'pending');

-- Anyone can read all contractors (approved for member browsing, pending for admin review)
create policy "read_all_contractors" on contractors
  for select using (true);

-- Admin can update contractor status (remove, reinstate, etc.)
create policy "admin_update_contractors" on contractors
  for update using (true) with check (true);

create policy "read_contractor_rates" on contractor_rates
  for select using (
    exists (select 1 from contractors where id = contractor_id and status = 'approved')
  );

-- Members can insert and read their own job requests
create policy "members_own_job_requests" on job_requests
  for all using (clerk_user_id = requesting_user_id());

-- Contractors can read leads dispatched to them
create policy "contractors_own_leads" on leads
  for select using (
    exists (
      select 1 from contractors
      where id = contractor_id
      and contact_email = current_user
    )
  );

-- Document upload columns for contractors
alter table contractors add column if not exists insurance_doc_url text;
alter table contractors add column if not exists license_doc_url text;

-- Phone numbers for SMS notifications
alter table contractors add column if not exists phone text;
alter table members add column if not exists phone text;

-- Stripe billing columns
alter table members add column if not exists stripe_customer_id text;
alter table members add column if not exists stripe_subscription_id text;

-- Storage bucket for contractor documents (run in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('contractor-docs', 'contractor-docs', true) on conflict (id) do nothing;
-- create policy "contractor_docs_insert" on storage.objects for insert with check (bucket_id = 'contractor-docs');
-- create policy "contractor_docs_select" on storage.objects for select using (bucket_id = 'contractor-docs');
-- create policy "contractor_docs_update" on storage.objects for update using (bucket_id = 'contractor-docs');

-- Multi-trade support for contractors
alter table contractors add column if not exists trades text[] default '{}';

-- Contractor payment and contact info
alter table contractors add column if not exists phone text;
alter table contractors add column if not exists stripe_customer_id text;
alter table contractors add column if not exists stripe_subscription_id text;
alter table contractors add column if not exists insurance_doc_url text;
alter table contractors add column if not exists license_doc_url text;

-- Add 'active' status for paid/live contractors
alter table contractors drop constraint if exists contractors_status_check;
alter table contractors add constraint contractors_status_check check (status in ('pending', 'approved', 'active', 'rejected'));

-- SMS delivery log (populated by Twilio status callbacks via /api/twilio/status)
create table if not exists sms_logs (
  id bigserial primary key,
  message_sid text not null,
  status text not null,
  to_phone text,
  from_phone text,
  error_code text,
  error_message text,
  account_sid text,
  created_at timestamptz not null default now()
);

create index if not exists sms_logs_message_sid_idx on sms_logs (message_sid);
create index if not exists sms_logs_created_at_idx on sms_logs (created_at desc);

-- Member waitlist for zip codes without sufficient contractor coverage (< 3 active contractors)
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/ypgpvrzgujjstkgqqsxq/sql
create table if not exists waitlist (
  id bigserial primary key,
  name text,
  email text not null,
  zip text not null,
  state text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email)
);
create index if not exists waitlist_state_idx on waitlist (state);
create index if not exists waitlist_created_at_idx on waitlist (created_at desc);

-- Allow admin dashboard to read waitlist directly (no RLS, or add permissive policy)
-- Option A: disable RLS on waitlist (simplest for internal admin use)
-- alter table waitlist disable row level security;
-- Option B: add a permissive read policy if you prefer RLS enabled
-- create policy "admin_read_waitlist" on waitlist for select using (true);

-- Reviews: member ratings of completed jobs
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/ypgpvrzgujjstkgqqsxq/sql
create table if not exists reviews (
  id bigserial primary key,
  job_request_id bigint not null references job_requests(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  clerk_user_id text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (job_request_id, clerk_user_id)
);
create index if not exists reviews_contractor_id_idx on reviews (contractor_id);

-- Dropbox Sign e-signature integration
alter table contractors add column if not exists dropbox_sign_request_id text;
create index if not exists contractors_dropbox_sign_request_id_idx on contractors (dropbox_sign_request_id);

-- Add docs_signed status for contractors who have signed their agreement
alter table contractors drop constraint if exists contractors_status_check;
alter table contractors add constraint contractors_status_check
  check (status in ('pending', 'approved', 'docs_signed', 'active', 'rejected'));
