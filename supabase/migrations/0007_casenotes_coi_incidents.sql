-- =============================================================================
-- Coordinator OS — Migration 0007
-- Structured case notes + billable time, conflict-of-interest register,
-- reportable-incident deadline tracking.
-- =============================================================================

-- ---- Case notes: contact type, duration, billable, linked goal -------------
alter table notes
  add column if not exists contact_type text,                 -- phone | email | face_to_face | sms | internal | other
  add column if not exists minutes      integer,
  add column if not exists billable     boolean default false,
  add column if not exists goal_id      uuid references goals(id) on delete set null,
  add column if not exists occurred_at  timestamptz default now();

-- ---- Conflict-of-interest register -----------------------------------------
create table if not exists participant_coi (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organisations(id) on delete cascade,
  participant_id     uuid not null references participants(id) on delete cascade,
  nature             text not null,                 -- what the conflict is
  related_party      text,                          -- e.g. "Enrichment Care / Support Match"
  disclosed          boolean not null default false,
  disclosed_at       timestamptz,
  disclosure_method  text,                          -- verbal | written | portal
  options_offered    text,                          -- alternatives presented to the participant
  participant_choice text,                          -- what the participant chose & why
  status             text not null default 'active',-- active | managed | closed
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id)
);
create index if not exists participant_coi_participant_idx on participant_coi (participant_id);

create trigger trg_participant_coi_updated_at
  before update on participant_coi for each row execute function set_updated_at();

alter table participant_coi enable row level security;
create policy participant_coi_member_all on participant_coi for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- COI -> participant timeline
create or replace function tl_coi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform tl_write(new.org_id, new.participant_id, 'consent',
    'Conflict of interest ' || new.status || coalesce(' — ' || new.related_party, ''),
    new.nature, 'participant_coi', new.id);
  return new;
end $$;
create trigger trg_tl_coi after insert on participant_coi for each row execute function tl_coi();

-- ---- Reportable-incident deadline tracking ---------------------------------
alter table participant_incidents
  add column if not exists notified_at            timestamptz,   -- when Commission was notified
  add column if not exists follow_up_submitted_at timestamptz;   -- 5-business-day follow-up
