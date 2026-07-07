-- Marketing/lead-gen leads (e.g. the standalone /calculator landing page).
-- Named "marketing_leads" — distinct from the existing "leads" table, which is
-- used for contractor job dispatch and has an unrelated schema.

create table if not exists marketing_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'calculator_lead',
  first_name text not null,
  phone text not null,
  owns_home boolean,
  trade text,
  service text,
  state text,
  retail_price numeric(10,2),
  member_price numeric(10,2),
  estimated_savings numeric(10,2),
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'disqualified')),
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_leads_source on marketing_leads(source);
create index if not exists idx_marketing_leads_created_at on marketing_leads(created_at desc);

-- Disable RLS — this table is only accessed via the service role key from edge functions
alter table marketing_leads disable row level security;
