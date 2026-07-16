-- Inspect + widen the members tier constraint for the request-based model.
do $$
declare
  def text;
begin
  select pg_get_constraintdef(oid) into def from pg_constraint where conname = 'members_tier_check';
  raise notice 'OLD CONSTRAINT: %', coalesce(def, '(none)');
end $$;

alter table members drop constraint if exists members_tier_check;
alter table members add constraint members_tier_check
  check (tier in ('Free', 'Member', 'Full', 'Member+', 'Elite'));
