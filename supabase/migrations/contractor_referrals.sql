-- Contractor referral program
-- Run this in the Supabase SQL editor.

alter table contractors add column if not exists referral_code text unique;
alter table contractors add column if not exists referral_promo_id text;
alter table contractors add column if not exists stripe_connect_account_id text;
alter table contractors add column if not exists referred_by_code text;

create table if not exists contractor_referrals (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id),
  referral_type text not null default 'member' check (referral_type in ('member', 'contractor')),
  member_id uuid,
  member_email text,
  plan text,
  sale_amount numeric(10,2) not null,          -- dollars actually charged (after discount)
  commission_amount numeric(10,2) not null,    -- 30% of sale_amount
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'paid')),
  stripe_session_id text unique,
  stripe_subscription_id text,
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  paid_at timestamptz
);

create index if not exists idx_contractor_referrals_contractor on contractor_referrals(contractor_id);
create index if not exists idx_contractor_referrals_subscription on contractor_referrals(stripe_subscription_id);
