-- Contractor onboarding email sequence
-- Run in the Supabase SQL editor (chunks below are safe to run separately).

alter table contractors add column if not exists activated_at timestamptz;

create table if not exists contractor_sequence_emails (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id),
  email_key text not null,
  sent_at timestamptz not null default now(),
  unique (contractor_id, email_key)
);

-- Daily cron at 16:00 UTC (~10am MT) to send day 1 / 3 / 14 emails
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'contractor-email-sequence-daily',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://ypgpvrzgujjstkgqqsxq.supabase.co/functions/v1/contractor-email-sequence',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
