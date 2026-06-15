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
