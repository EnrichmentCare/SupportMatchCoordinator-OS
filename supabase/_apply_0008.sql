-- =============================================================================
-- Coordinator OS — Migration 0008
-- Feedback & complaints register + service agreements.
-- =============================================================================

-- ---- Feedback & complaints --------------------------------------------------
create table if not exists feedback (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid references participants(id) on delete set null,
  type            text not null default 'complaint',   -- complaint | feedback | compliment
  source          text,                                 -- participant | family | provider | worker | other
  summary         text not null,
  severity        text,                                 -- low | medium | high
  status          text not null default 'open',         -- open | in_progress | resolved | closed
  resolution      text,
  received_at     timestamptz not null default now(),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index if not exists feedback_org_idx on feedback (org_id, status);
create index if not exists feedback_participant_idx on feedback (participant_id);

create trigger trg_feedback_updated_at before update on feedback for each row execute function set_updated_at();
alter table feedback enable row level security;
create policy feedback_member_all on feedback for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Optional: feedback linked to a participant lands on their timeline
create or replace function tl_feedback() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.participant_id is not null then
    perform tl_write(new.org_id, new.participant_id, 'system',
      initcap(new.type) || ' logged', new.summary, 'feedback', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_feedback after insert on feedback for each row execute function tl_feedback();

-- ---- Service agreements -----------------------------------------------------
create table if not exists service_agreements (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  title           text not null default 'Support Coordination Service Agreement',
  start_date      date,
  end_date        date,
  supports        text,                                 -- what's being delivered
  terms           text,                                 -- terms / cancellation / rates
  parties         text,                                 -- who is signing
  status          text not null default 'draft',        -- draft | sent | signed | declined
  sent_at         timestamptz,
  signed_at       timestamptz,
  signer_name     text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index if not exists service_agreements_participant_idx on service_agreements (participant_id);

create trigger trg_service_agreements_updated_at before update on service_agreements for each row execute function set_updated_at();
alter table service_agreements enable row level security;
create policy service_agreements_member_all on service_agreements for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

create or replace function tl_agreement() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform tl_write(new.org_id, new.participant_id, 'document',
    'Service agreement ' || new.status, new.title, 'service_agreements', new.id);
  return new;
end $$;
create trigger trg_tl_agreement after insert on service_agreements for each row execute function tl_agreement();
