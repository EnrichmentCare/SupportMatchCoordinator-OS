-- =============================================================================
-- Coordinator OS — Migration 0010
-- Mark billable case notes as claimed so they aren't double-billed.
-- =============================================================================

alter table notes
  add column if not exists claimed_at      timestamptz,
  add column if not exists claim_reference text;

create index if not exists notes_claimable_idx on notes (org_id, billable, claimed_at);
