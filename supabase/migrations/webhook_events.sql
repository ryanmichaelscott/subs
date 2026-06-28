-- Run this in the Supabase SQL editor to add webhook event deduplication
-- This table lets the stripe-webhook function skip already-processed events

CREATE TABLE IF NOT EXISTS webhook_events (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id text        UNIQUE NOT NULL,
  event_type      text        NOT NULL,
  payload         jsonb,
  processed       boolean     DEFAULT false,
  error           text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_stripe_event_id_idx ON webhook_events (stripe_event_id);
CREATE INDEX IF NOT EXISTS webhook_events_created_at_idx ON webhook_events (created_at DESC);

-- Disable RLS — this table is only accessed via service role key
ALTER TABLE webhook_events DISABLE ROW LEVEL SECURITY;
