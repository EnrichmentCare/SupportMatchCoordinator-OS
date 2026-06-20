-- =============================================================================
-- Coordinator OS — Migration 0005
-- Rename participant status 'prospect' -> 'participant', add risk/safeguarding
-- + check-in fields, and a reportable-incidents log.
-- =============================================================================

-- ---- Rename the status value + fix the column default -----------------------
alter type participant_status rename value 'prospect' to 'participant';
alter table participants alter column status set default 'participant';

-- ---- Risk & safeguarding + check-in cadence (participant-level) -------------
alter table participants
  add column if not exists behaviour_support_plan  boolean default false,
  add column if not exists restrictive_practices   text,
  add column if not exists crisis_plan             text,
  add column if not exists last_contact_at         timestamptz,
  add column if not exists check_in_frequency_days integer;

-- ---- Reportable incidents log ----------------------------------------------
create table if not exists participant_incidents (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  occurred_at     timestamptz not null default now(),
  severity        text,                         -- low | medium | high | critical
  category        text,
  summary         text not null,
  reportable      boolean not null default false,
  actions         text,
  status          text not null default 'open', -- open | reported | closed
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index if not exists participant_incidents_participant_idx on participant_incidents (participant_id);

create trigger trg_participant_incidents_updated_at
  before update on participant_incidents
  for each row execute function set_updated_at();

alter table participant_incidents enable row level security;

create policy participant_incidents_member_all on participant_incidents for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- Write incidents to the participant timeline
create or replace function tl_incident() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform tl_write(new.org_id, new.participant_id, 'system',
    'Incident logged' || coalesce(' (' || new.severity || ')', ''), new.summary,
    'participant_incidents', new.id);
  return new;
end $$;
create trigger trg_tl_incident after insert on participant_incidents for each row execute function tl_incident();
