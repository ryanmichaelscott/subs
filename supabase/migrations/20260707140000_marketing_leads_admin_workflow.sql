-- Admin workflow for marketing leads: statuses match the admin UI verbs
-- (called / closed / rejected), plus call notes and a status timestamp.

alter table marketing_leads drop constraint if exists marketing_leads_status_check;
alter table marketing_leads add constraint marketing_leads_status_check
  check (status in ('new', 'called', 'closed', 'rejected'));

alter table marketing_leads add column if not exists notes text;
alter table marketing_leads add column if not exists status_updated_at timestamptz;
