-- Full Pass free-service redemptions. One row per service a member has started
-- or completed redeeming; services with no row are implicitly 'available'.

create table if not exists free_service_redemptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  service_type text not null,
  contractor_id uuid references contractors(id),
  status text not null default 'available' check (status in ('available', 'pending', 'redeemed')),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_free_service_redemptions_member on free_service_redemptions(member_id);
create unique index if not exists idx_free_service_redemptions_member_service
  on free_service_redemptions(member_id, service_type);

-- Members read their own rows from the dashboard (anon-key client, same
-- pattern as the rest of the app); writes happen via service role.
alter table free_service_redemptions disable row level security;
