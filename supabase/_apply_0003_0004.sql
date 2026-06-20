-- =============================================================================
-- Coordinator OS — apply 0003 (documents storage) + 0004 (participant 360)
-- Safe to run even if 0003 was already applied (drops policies first).
-- Run the whole file in the Supabase SQL Editor. Expect: "Success".
-- =============================================================================

-- ---- 0003: documents storage bucket + policies (idempotent) ----------------
insert into storage.buckets (id, name, public)
values ('documents','documents',false)
on conflict (id) do nothing;

drop policy if exists "documents_read"   on storage.objects;
drop policy if exists "documents_insert" on storage.objects;
drop policy if exists "documents_update" on storage.objects;
drop policy if exists "documents_delete" on storage.objects;

create policy "documents_read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids()));
create policy "documents_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids()));
create policy "documents_update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids()));
create policy "documents_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids()));

-- =============================================================================
-- Coordinator OS — Migration 0004
-- Participant 360: disability/health fields, plan extras, care-team providers.
-- =============================================================================

-- ---- Disability & health (participant-level) -------------------------------
alter table participants
  add column if not exists pronouns               text,
  add column if not exists primary_disability     text,
  add column if not exists secondary_disabilities text[] default '{}',
  add column if not exists communication_needs    text,
  add column if not exists mobility_needs          text,
  add column if not exists dietary_needs           text,
  add column if not exists allergies               text,
  add column if not exists medications_note        text,
  add column if not exists mental_health_notes     text,
  add column if not exists interpreter_required    boolean default false,
  add column if not exists interpreter_language    text;

-- ---- NDIS plan extras ------------------------------------------------------
alter table plans
  add column if not exists plan_number                 text,
  add column if not exists support_coordination_hours  numeric(8,2);

-- ---- Extend contact relationships (nominee/guardian etc.) ------------------
alter type contact_relationship add value if not exists 'guardian';
alter type contact_relationship add value if not exists 'correspondence_nominee';
alter type contact_relationship add value if not exists 'plan_nominee';
alter type contact_relationship add value if not exists 'allied_health';
alter type contact_relationship add value if not exists 'lac';

-- ---- Care team / engaged providers (lightweight, free-entry) ---------------
-- A participant's "who's involved" list. Distinct from the Phase 2 provider
-- directory; this captures the actual services engaged for THIS participant.
create table if not exists participant_providers (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  provider_name   text not null,
  service_type    text,
  status          text not null default 'active',   -- active | pending | ended
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  is_plan_manager boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index if not exists participant_providers_participant_idx on participant_providers (participant_id);

create trigger trg_participant_providers_updated_at
  before update on participant_providers
  for each row execute function set_updated_at();

alter table participant_providers enable row level security;

create policy participant_providers_member_all on participant_providers for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));
