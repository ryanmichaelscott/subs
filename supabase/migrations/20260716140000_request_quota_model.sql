-- Request-based pricing model (July 2026): free/member/full tiers with
-- calendar-year request quotas. free_service_redemptions is DEPRECATED
-- (data retained, no longer read or written by the app).

-- Quota counters on members. request_year lets the app lazily treat a stale
-- count as 0 if the Jan-1 cron ever misses.
alter table members add column if not exists request_count integer not null default 0;
alter table members add column if not exists request_year integer not null default extract(year from now());

-- Ledger of every service request for quota accounting + overage billing.
create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  contractor_id uuid references contractors(id),
  trade text,
  status text not null default 'open',
  billed boolean not null default false,
  stripe_charge_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_service_requests_member on service_requests(member_id);
create index if not exists idx_service_requests_created on service_requests(created_at desc);
alter table service_requests disable row level security;

-- Calendar-year reset: Jan 1, 08:00 UTC (1am MT). Idempotent via unschedule.
do $$
begin
  perform cron.unschedule('reset-member-request-counts');
exception when others then null;
end $$;
select cron.schedule(
  'reset-member-request-counts',
  '0 8 1 1 *',
  $$update members set request_count = 0, request_year = extract(year from now())$$
);
