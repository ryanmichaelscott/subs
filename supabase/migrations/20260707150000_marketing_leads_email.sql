-- Email address for calculator leads — used to send the free
-- Utah Homeowner's Annual Maintenance Checklist via Resend.
alter table marketing_leads add column if not exists email text;
