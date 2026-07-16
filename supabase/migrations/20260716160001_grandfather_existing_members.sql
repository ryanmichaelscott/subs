-- Everyone who was a member before the request-based pricing change gets
-- unlimited requests through the end of the year. New signups from here on
-- default to their tier's normal quota.

alter table members add column if not exists grandfathered boolean not null default false;
update members set grandfathered = true;

-- The Jan-1 reset also ends grandfathering ("unlimited for the year"):
do $$
begin
  perform cron.unschedule('reset-member-request-counts');
exception when others then null;
end $$;
select cron.schedule(
  'reset-member-request-counts',
  '0 8 1 1 *',
  $$update members set request_count = 0, request_year = extract(year from now()), grandfathered = false$$
);

do $$
declare n int;
begin
  select count(*) into n from members where grandfathered;
  raise notice 'GRANDFATHERED MEMBERS: %', n;
end $$;
