-- =============================================================================
-- CLEAN RESET + FULL APPLY  (safe on this fresh project)
-- Resets the public schema, then creates the entire Coordinator OS schema.
-- Run this whole file in the Supabase SQL Editor. Expect: "Success".
-- =============================================================================
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- =============================================================================
-- Coordinator OS — Initial Schema
-- Target: Supabase Postgres (region ap-southeast-2 / Sydney)
-- Multi-tenant SaaS for NDIS Support Coordinators. Free for coordinators.
-- Revenue mechanic: Support Worker Request -> curated Support Match lead.
-- AI-ready (Section 11) but NO AI logic in v1.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy search (providers, participants)

-- ----------------------------------------------------------------------------
-- 1. Enums  (stable, controlled vocabularies)
-- ----------------------------------------------------------------------------
create type org_role as enum (
  'admin',
  'team_leader',
  'specialist_support_coordinator',
  'support_coordinator',
  'participant',
  'nominee',
  'provider',
  'support_worker'
);

create type plan_management_type as enum ('agency_managed', 'plan_managed', 'self_managed');

create type participant_status as enum ('prospect', 'active', 'on_hold', 'exited');

-- RAG (Red/Amber/Green) caseload health
create type rag_status as enum ('green', 'amber', 'red');

create type funding_bucket as enum ('core', 'capacity_building', 'capital');

create type goal_status as enum ('not_started', 'in_progress', 'achieved', 'on_hold', 'discontinued');

create type provider_capacity as enum ('open', 'limited', 'closed', 'unknown');

create type referral_stage as enum (
  'created', 'sent', 'acknowledged', 'assessment', 'accepted', 'commenced', 'declined', 'withdrawn'
);

-- The revenue object's lifecycle
create type swr_status as enum (
  'requested', 'received', 'matching', 'worker_proposed', 'placed', 'active', 'cancelled', 'closed'
);

create type task_status as enum ('open', 'in_progress', 'blocked', 'done', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type contact_relationship as enum (
  'nominee', 'family', 'emergency', 'gp', 'plan_manager', 'support_coordinator', 'other'
);

create type document_type as enum (
  'report', 'service_agreement', 'consent', 'assessment', 'review', 'plan', 'correspondence', 'other'
);

create type consent_type as enum (
  'share_with_support_match', 'share_with_provider', 'data_collection', 'photo_media', 'other'
);

create type consent_status as enum ('granted', 'revoked', 'expired');

create type timeline_event_type as enum (
  'note', 'call', 'email', 'sms', 'referral', 'document', 'meeting', 'task',
  'support_worker_request', 'goal', 'funding', 'consent', 'status_change', 'system'
);

create type notification_type as enum (
  'review_due', 'task_overdue', 'referral_response', 'funding_threshold',
  'swr_status_change', 'plan_reassessment', 'mention', 'system'
);

create type gender_pref as enum ('male', 'female', 'no_preference', 'other');

-- ----------------------------------------------------------------------------
-- 2. Tenancy & identity
-- ----------------------------------------------------------------------------

-- The coordination business (tenant)
create table organisations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  abn           text,
  suburb        text,
  state         text,
  postcode      text,
  phone         text,
  email         text,
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);

-- App users (1:1 with auth.users)
create table profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  full_name                text,
  email                    text,
  phone                    text,
  avatar_url               text,
  -- Platform-level flag for the cross-org Support Match Admin role.
  -- Deliberately NOT an org_role; gates access to the curated leads view only.
  is_support_match_admin   boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- User <-> Org membership carrying the per-org role
create table memberships (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organisations(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  role         org_role not null default 'support_coordinator',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  unique (org_id, user_id)
);

create index on memberships (user_id);
create index on memberships (org_id);

-- ----------------------------------------------------------------------------
-- 3. RLS helper functions (security definer, stable)
-- ----------------------------------------------------------------------------

-- Org ids the current user belongs to (active memberships only)
create or replace function auth_org_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select org_id from memberships
  where user_id = auth.uid() and is_active = true;
$$;

-- True if current user has one of the given roles in the org
create or replace function has_org_role(target_org uuid, roles org_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid()
      and org_id = target_org
      and is_active = true
      and role = any(roles)
  );
$$;

-- True if current user is a member of the org (any role)
create or replace function is_org_member(target_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and org_id = target_org and is_active = true
  );
$$;

-- Cross-org Support Match admin flag
create or replace function is_support_match_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_support_match_admin from profiles where id = auth.uid()), false);
$$;

-- ----------------------------------------------------------------------------
-- 4. Participant domain
-- ----------------------------------------------------------------------------
create table participants (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references organisations(id) on delete cascade,
  first_name             text not null,
  last_name              text not null,
  preferred_name         text,
  date_of_birth          date,
  email                  text,
  phone                  text,
  ndis_number            text,                       -- sensitive: never exposed to SM
  plan_management        plan_management_type,
  status                 participant_status not null default 'prospect',
  rag_status             rag_status not null default 'green',
  rag_reason             text,
  -- Address / matching-relevant
  address_line           text,
  suburb                 text,
  state                  text,
  postcode               text,
  -- Preferences (drive the pre-filled Support Worker Request)
  gender_preference      gender_pref default 'no_preference',
  interests              text[] default '{}',
  languages              text[] default '{}',
  cultural_background    text,
  support_needs_summary  text,
  availability           jsonb default '{}'::jsonb,    -- e.g. {"mon":["am"],"sat":["pm"]}
  hours_per_week         numeric(6,2),
  -- Risk / clinical (sensitive: never exposed to SM)
  risk_flags             text[] default '{}',
  risk_notes             text,
  assigned_coordinator   uuid references profiles(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users(id)
);
create index on participants (org_id);
create index on participants (org_id, status);
create index on participants (assigned_coordinator);
create index participants_name_trgm on participants using gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Sharing model: which coordinators (besides assigned) can see a participant
create table participant_shares (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  unique (participant_id, user_id)
);
create index on participant_shares (user_id);

create table participant_contacts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  name            text not null,
  relationship    contact_relationship not null default 'other',
  phone           text,
  email           text,
  is_primary      boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on participant_contacts (participant_id);

create table plans (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organisations(id) on delete cascade,
  participant_id      uuid not null references participants(id) on delete cascade,
  management_type     plan_management_type not null,
  start_date          date,
  end_date            date,
  reassessment_due    date,
  total_budget        numeric(12,2),
  notes               text,
  is_current          boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id)
);
create index on plans (participant_id);
create index on plans (org_id, reassessment_due);

create table funding_categories (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  plan_id         uuid not null references plans(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  bucket          funding_bucket not null,
  name            text not null,                       -- e.g. "Assistance with Daily Life"
  allocated       numeric(12,2) not null default 0,
  used            numeric(12,2) not null default 0,
  -- remaining is derived in app/view; stored generated column for convenience
  remaining       numeric(12,2) generated always as (allocated - used) stored,
  alert_threshold numeric(5,2) default 80.0,           -- % used to trigger alert
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on funding_categories (plan_id);
create index on funding_categories (participant_id);

create table goals (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  plan_id         uuid references plans(id) on delete set null,
  title           text not null,
  description     text,
  status          goal_status not null default 'not_started',
  progress_pct    integer not null default 0 check (progress_pct between 0 and 100),
  target_date     date,
  evidence        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on goals (participant_id);

-- ----------------------------------------------------------------------------
-- 5. Provider domain
-- ----------------------------------------------------------------------------
create table providers (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organisations(id) on delete cascade,
  name                text not null,
  abn                 text,
  description         text,
  services            text[] default '{}',             -- registration groups / service types
  service_areas       text[] default '{}',             -- suburbs/regions/states
  locations           jsonb default '[]'::jsonb,
  phone               text,
  email               text,
  website             text,
  ndis_registered     boolean,
  capacity_status     provider_capacity not null default 'unknown',
  capacity_notes      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id)
);
create index on providers (org_id);
create index providers_name_trgm on providers using gin (name gin_trgm_ops);

create table provider_contacts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organisations(id) on delete cascade,
  provider_id  uuid not null references providers(id) on delete cascade,
  name         text not null,
  role         text,
  phone        text,
  email        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);
create index on provider_contacts (provider_id);

create table saved_providers (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organisations(id) on delete cascade,
  provider_id  uuid not null references providers(id) on delete cascade,
  user_id      uuid references profiles(id) on delete cascade, -- null = org-wide preferred
  notes        text,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  unique (org_id, provider_id, user_id)
);

-- Provider Relationship Management
create table provider_engagements (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  provider_id     uuid not null references providers(id) on delete cascade,
  engagement_type text,                                -- referral_sent, capacity_update, call, note
  response_time_hours numeric(8,2),
  summary         text,
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on provider_engagements (provider_id);

-- ----------------------------------------------------------------------------
-- 6. Referrals (Kanban pipeline)
-- ----------------------------------------------------------------------------
create table referrals (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  provider_id     uuid references providers(id) on delete set null,
  service_type    text,
  stage           referral_stage not null default 'created',
  notes           text,
  sent_at         timestamptz,
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on referrals (org_id, stage);
create index on referrals (participant_id);
create index on referrals (provider_id);

create table referral_events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organisations(id) on delete cascade,
  referral_id   uuid not null references referrals(id) on delete cascade,
  from_stage    referral_stage,
  to_stage      referral_stage not null,
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);
create index on referral_events (referral_id);

-- ----------------------------------------------------------------------------
-- 7. Support Worker Request (THE REVENUE OBJECT) + curated lead exposure
-- ----------------------------------------------------------------------------
create table consents (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  type            consent_type not null,
  status          consent_status not null default 'granted',
  granted_by      text,                                -- who gave consent (participant/nominee name)
  method          text,                                -- verbal, written, portal
  granted_at      timestamptz not null default now(),
  expires_at      timestamptz,
  revoked_at      timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on consents (participant_id);

create table support_worker_requests (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organisations(id) on delete cascade,
  participant_id      uuid not null references participants(id) on delete cascade,
  consent_id          uuid not null references consents(id),   -- HARD requirement
  status              swr_status not null default 'requested',
  reference           text not null unique default ('SWR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  -- Curated, consented, matching-only snapshot (the SHAREABLE fields).
  -- Snapshotted at submit time so SM sees a stable, minimal disclosure.
  suburb              text,
  postcode            text,
  state               text,
  gender_preference   gender_pref,
  interests           text[] default '{}',
  languages           text[] default '{}',
  support_needs_summary text,
  availability        jsonb default '{}'::jsonb,
  hours_per_week      numeric(6,2),
  funding_type        plan_management_type,
  -- Internal-only fields (NOT in the SM view)
  internal_notes      text,
  proposed_worker_id  uuid,                            -- references support_workers(id) (set after FK created)
  requested_at        timestamptz not null default now(),
  placed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id)
);
create index on support_worker_requests (org_id, status);
create index on support_worker_requests (participant_id);

create table swr_events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organisations(id) on delete cascade,
  request_id    uuid not null references support_worker_requests(id) on delete cascade,
  from_status   swr_status,
  to_status     swr_status not null,
  note          text,
  actor_is_support_match boolean not null default false,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);
create index on swr_events (request_id);

-- Support Worker database (matching-ready; Support Match side)
create table support_workers (
  id                  uuid primary key default gen_random_uuid(),
  -- org_id nullable: workers can be platform-level (SM pool) or org-scoped.
  org_id              uuid references organisations(id) on delete set null,
  full_name           text not null,
  gender              gender_pref,
  suburb              text,
  state               text,
  postcode            text,
  skills              text[] default '{}',
  interests           text[] default '{}',
  languages           text[] default '{}',
  experience_summary  text,
  availability        jsonb default '{}'::jsonb,
  screening_status    jsonb default '{}'::jsonb,        -- {wwcc:..., ndis:..., police:..., firstaid:...}
  is_available        boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id)
);
create index on support_workers (state, suburb);

alter table support_worker_requests
  add constraint swr_proposed_worker_fk
  foreign key (proposed_worker_id) references support_workers(id) on delete set null;

-- Curated lead view: the ONLY participant-derived data Support Match Admin sees.
-- No name, NDIS number, medical history, plans, notes — minimum necessary disclosure.
create view support_match_leads as
  select
    r.id            as request_id,
    r.reference,
    r.org_id,
    r.status,
    r.suburb,
    r.postcode,
    r.state,
    r.gender_preference,
    r.interests,
    r.languages,
    r.support_needs_summary,
    r.availability,
    r.hours_per_week,
    r.funding_type,
    r.requested_at,
    r.placed_at,
    r.created_at,
    r.updated_at
  from support_worker_requests r;

-- ----------------------------------------------------------------------------
-- 8. Tasks, notes, meetings, documents
-- ----------------------------------------------------------------------------
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  title           text not null,
  description     text,
  status          task_status not null default 'open',
  priority        task_priority not null default 'medium',
  due_date        date,
  assigned_to     uuid references profiles(id),
  -- Polymorphic-ish links (nullable, explicit FKs keep referential integrity)
  participant_id  uuid references participants(id) on delete cascade,
  provider_id     uuid references providers(id) on delete set null,
  referral_id     uuid references referrals(id) on delete set null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on tasks (org_id, status);
create index on tasks (assigned_to, status);
create index on tasks (participant_id);
create index on tasks (org_id, due_date);

create table notes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  provider_id     uuid references providers(id) on delete cascade,
  referral_id     uuid references referrals(id) on delete cascade,
  body            text not null,
  is_pinned       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on notes (participant_id);

create table meetings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  title           text not null,
  scheduled_at    timestamptz,
  location        text,
  attendees       jsonb default '[]'::jsonb,
  notes           text,
  outcomes        text,
  actions         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on meetings (participant_id);

create table documents (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  provider_id     uuid references providers(id) on delete cascade,
  type            document_type not null default 'other',
  title           text not null,
  storage_path    text not null,                       -- private bucket path; access via signed URL
  mime_type       text,
  size_bytes      bigint,
  version         integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on documents (participant_id);

-- ----------------------------------------------------------------------------
-- 9. Timeline (single source of truth), notifications, automations, audit, AI stub
-- ----------------------------------------------------------------------------
create table timeline_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  event_type      timeline_event_type not null,
  title           text not null,
  body            text,
  -- Soft reference to the originating entity (table + id) for deep-linking
  ref_table       text,
  ref_id          uuid,
  metadata        jsonb default '{}'::jsonb,
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index on timeline_events (participant_id, occurred_at desc);
create index on timeline_events (org_id);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organisations(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  type          notification_type not null,
  title         text not null,
  body          text,
  ref_table     text,
  ref_id        uuid,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on notifications (user_id, is_read);

create table automations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organisations(id) on delete cascade,
  name          text not null,
  trigger       jsonb not null,                        -- {event:"referral.accepted"}
  actions       jsonb not null,                        -- [{type:"create_task",...}]
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);
create index on automations (org_id, is_active);

create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organisations(id) on delete set null,
  actor_id      uuid references auth.users(id),
  action        text not null,                         -- insert/update/delete/read
  entity_table  text not null,
  entity_id     uuid,
  before_data   jsonb,
  after_data    jsonb,
  created_at    timestamptz not null default now()
);
create index on audit_log (org_id, created_at desc);
create index on audit_log (entity_table, entity_id);

-- AI-readiness stub ONLY (no logic in v1)
create table ai_outputs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organisations(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  kind          text,                                  -- case_note, report, match_suggestion...
  input_ref     jsonb,
  output        jsonb,
  model         text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);

-- ----------------------------------------------------------------------------
-- 10. updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.column_name = 'updated_at'
      and c.table_schema = 'public'
      and tb.table_type = 'BASE TABLE'   -- exclude views (e.g. support_match_leads)
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on %I
       for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 11. Enable RLS on every domain table
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'organisations','profiles','memberships','participants','participant_shares',
    'participant_contacts','plans','funding_categories','goals','providers',
    'provider_contacts','saved_providers','provider_engagements','referrals',
    'referral_events','consents','support_worker_requests','swr_events',
    'support_workers','tasks','notes','meetings','documents','timeline_events',
    'notifications','automations','audit_log','ai_outputs'])
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 12. RLS policies
-- Baseline: read if member of org_id; write further gated by role where noted.
-- Support Match Admin: NO access to any clinical table; reads leads via the view.
-- ----------------------------------------------------------------------------

-- profiles: a user sees self + co-members of shared orgs
create policy profiles_self on profiles for select using (id = auth.uid());
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- memberships: see your own org memberships; admins manage
create policy memberships_read on memberships for select using (is_org_member(org_id));
create policy memberships_write on memberships for all
  using (has_org_role(org_id, array['admin']::org_role[]))
  with check (has_org_role(org_id, array['admin']::org_role[]));

-- organisations: members read; admins update
create policy orgs_read on organisations for select using (is_org_member(id));
create policy orgs_update on organisations for update
  using (has_org_role(id, array['admin']::org_role[]));

-- Generic org-scoped tables: full CRUD for any member of the org.
-- (Finer role gating — e.g. coordinator-only-assigned — is layered in app +
--  tightened policies in a follow-up migration; baseline proves tenant isolation.)
do $$
declare t text;
begin
  for t in select unnest(array[
    'participant_contacts','plans','funding_categories','goals','providers',
    'provider_contacts','saved_providers','provider_engagements','referrals',
    'referral_events','consents','swr_events','tasks','notes','meetings',
    'documents','timeline_events','automations','ai_outputs','participant_shares'])
  loop
    execute format($f$
      create policy %1$s_member_all on %1$I for all
        using (is_org_member(org_id))
        with check (is_org_member(org_id));
    $f$, t);
  end loop;
end $$;

-- participants: members of org can access (assigned/shared refinement in app layer + later migration)
create policy participants_member_all on participants for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- support_worker_requests: org members manage; SM admin can UPDATE status only via RPC (see note)
create policy swr_member_all on support_worker_requests for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- support_workers: org members read their org's workers; platform pool (org_id null) readable by SM admin
create policy workers_member_read on support_workers for select
  using (is_org_member(org_id) or (org_id is null and is_support_match_admin()));
create policy workers_member_write on support_workers for all
  using (is_org_member(org_id) or is_support_match_admin())
  with check (is_org_member(org_id) or is_support_match_admin());

-- notifications: only the target user
create policy notifications_own on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log: org admins read; inserts via security-definer functions
create policy audit_read on audit_log for select
  using (has_org_role(org_id, array['admin']::org_role[]));

-- NOTE on Support Match Admin lead access:
-- The support_match_leads VIEW exposes only curated columns. Because Postgres
-- views run with the querying user's permissions, SM admin still needs a SELECT
-- path to the underlying request rows limited to curated columns. We grant that
-- via a dedicated security-definer RPC `sm_list_leads()` / `sm_update_lead_status()`
-- (defined in migration 0002) rather than a broad table policy, guaranteeing SM
-- can never read internal_notes, participant_id, or any clinical table.

comment on view support_match_leads is
  'Curated, consented, minimum-necessary disclosure of Support Worker Requests for Support Match Admin. No participant identity, NDIS number, medical history, plans, or notes.';
-- =============================================================================
-- Coordinator OS — Migration 0002
-- Functions, triggers (timeline single-source-of-truth + audit), self-serve org
-- onboarding, consent-enforced Support Worker Request, and Support Match RPCs.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Auto-create profile row when an auth user is created
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Let users see co-members of their orgs (for assignee names etc.)
create policy profiles_comembers on profiles for select
  using (
    exists (
      select 1
      from memberships m_me
      join memberships m_them on m_them.org_id = m_me.org_id
      where m_me.user_id = auth.uid()
        and m_me.is_active and m_them.is_active
        and m_them.user_id = profiles.id
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Self-serve organisation onboarding (atomic: org + admin membership)
-- ----------------------------------------------------------------------------
create or replace function create_organisation(
  p_name text,
  p_abn text default null,
  p_state text default null,
  p_suburb text default null,
  p_postcode text default null,
  p_phone text default null,
  p_email text default null
)
returns organisations
language plpgsql security definer set search_path = public as $$
declare
  v_org organisations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into organisations (name, abn, state, suburb, postcode, phone, email, created_by)
  values (p_name, p_abn, p_state, p_suburb, p_postcode, p_phone, p_email, auth.uid())
  returning * into v_org;

  insert into memberships (org_id, user_id, role, created_by)
  values (v_org.id, auth.uid(), 'admin', auth.uid());

  return v_org;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Timeline triggers — participant timeline is the single source of truth
-- ----------------------------------------------------------------------------
create or replace function tl_write(
  p_org uuid, p_participant uuid, p_type timeline_event_type,
  p_title text, p_body text, p_ref_table text, p_ref_id uuid
) returns void language sql security definer set search_path = public as $$
  insert into timeline_events (org_id, participant_id, event_type, title, body, ref_table, ref_id, created_by)
  values (p_org, p_participant, p_type, p_title, p_body, p_ref_table, p_ref_id, auth.uid());
$$;

-- Notes
create or replace function tl_note() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.participant_id is not null then
    perform tl_write(new.org_id, new.participant_id, 'note', 'Note added', left(new.body, 160), 'notes', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_note after insert on notes for each row execute function tl_note();

-- Tasks (create + status change)
create or replace function tl_task() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.participant_id is null then return new; end if;
  if tg_op = 'INSERT' then
    perform tl_write(new.org_id, new.participant_id, 'task', 'Task created: ' || new.title, null, 'tasks', new.id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform tl_write(new.org_id, new.participant_id, 'task', 'Task ' || new.status || ': ' || new.title, null, 'tasks', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_task after insert or update on tasks for each row execute function tl_task();

-- Referrals (create + stage change) + referral_events history
create or replace function tl_referral() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform tl_write(new.org_id, new.participant_id, 'referral', 'Referral created', new.service_type, 'referrals', new.id);
  elsif tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into referral_events (org_id, referral_id, from_stage, to_stage, created_by)
    values (new.org_id, new.id, old.stage, new.stage, auth.uid());
    perform tl_write(new.org_id, new.participant_id, 'referral', 'Referral → ' || new.stage, new.service_type, 'referrals', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_referral after insert or update on referrals for each row execute function tl_referral();

-- Documents
create or replace function tl_document() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.participant_id is not null then
    perform tl_write(new.org_id, new.participant_id, 'document', 'Document uploaded: ' || new.title, new.type::text, 'documents', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_document after insert on documents for each row execute function tl_document();

-- Meetings
create or replace function tl_meeting() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.participant_id is not null then
    perform tl_write(new.org_id, new.participant_id, 'meeting', 'Meeting: ' || new.title, new.outcomes, 'meetings', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_meeting after insert on meetings for each row execute function tl_meeting();

-- Goals
create or replace function tl_goal() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform tl_write(new.org_id, new.participant_id, 'goal', 'Goal added: ' || new.title, null, 'goals', new.id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform tl_write(new.org_id, new.participant_id, 'goal', 'Goal ' || new.status || ': ' || new.title, null, 'goals', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_goal after insert or update on goals for each row execute function tl_goal();

-- Consents
create or replace function tl_consent() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform tl_write(new.org_id, new.participant_id, 'consent', 'Consent ' || new.status || ': ' || new.type, new.method, 'consents', new.id);
  return new;
end $$;
create trigger trg_tl_consent after insert on consents for each row execute function tl_consent();

-- Support Worker Requests (create + status change) + swr_events history
create or replace function tl_swr() returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor_sm boolean := coalesce(current_setting('app.actor_sm', true) = 'true', false);
begin
  if tg_op = 'INSERT' then
    perform tl_write(new.org_id, new.participant_id, 'support_worker_request',
      'Support worker requested (' || new.reference || ')', new.support_needs_summary,
      'support_worker_requests', new.id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into swr_events (org_id, request_id, from_status, to_status, actor_is_support_match, created_by)
    values (new.org_id, new.id, old.status, new.status, v_actor_sm, auth.uid());
    perform tl_write(new.org_id, new.participant_id, 'support_worker_request',
      'Request → ' || new.status || ' (' || new.reference || ')', null,
      'support_worker_requests', new.id);
  end if;
  return new;
end $$;
create trigger trg_tl_swr after insert or update on support_worker_requests for each row execute function tl_swr();

-- ----------------------------------------------------------------------------
-- 4. Audit logging on participant records
-- ----------------------------------------------------------------------------
create or replace function audit_participants() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (org_id, actor_id, action, entity_table, entity_id, before_data, after_data)
  values (
    coalesce(new.org_id, old.org_id), auth.uid(), lower(tg_op), 'participants',
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;
create trigger trg_audit_participants
  after insert or update or delete on participants
  for each row execute function audit_participants();

-- ----------------------------------------------------------------------------
-- 5. Consent-enforced Support Worker Request submission (the revenue action)
--    Snapshots ONLY curated, consented fields from the participant.
-- ----------------------------------------------------------------------------
create or replace function submit_support_worker_request(
  p_participant_id uuid,
  p_consent_id uuid,
  p_internal_notes text default null
)
returns support_worker_requests
language plpgsql security definer set search_path = public as $$
declare
  v_p participants;
  v_consent consents;
  v_req support_worker_requests;
begin
  select * into v_p from participants where id = p_participant_id;
  if v_p.id is null then raise exception 'Participant not found'; end if;
  if not is_org_member(v_p.org_id) then raise exception 'Not authorised'; end if;

  select * into v_consent from consents where id = p_consent_id;
  if v_consent.id is null
     or v_consent.participant_id <> p_participant_id
     or v_consent.type <> 'share_with_support_match'
     or v_consent.status <> 'granted' then
    raise exception 'A valid, granted share-with-Support-Match consent is required';
  end if;

  insert into support_worker_requests (
    org_id, participant_id, consent_id, status,
    suburb, postcode, state, gender_preference, interests, languages,
    support_needs_summary, availability, hours_per_week, funding_type,
    internal_notes, created_by
  ) values (
    v_p.org_id, v_p.id, v_consent.id, 'requested',
    v_p.suburb, v_p.postcode, v_p.state, v_p.gender_preference, v_p.interests, v_p.languages,
    v_p.support_needs_summary, v_p.availability, v_p.hours_per_week, v_p.plan_management,
    p_internal_notes, auth.uid()
  ) returning * into v_req;

  return v_req;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Support Match Admin RPCs — the ONLY path to lead data. Curated columns only.
-- ----------------------------------------------------------------------------
create or replace function sm_list_leads()
returns setof support_match_leads
language sql stable security definer set search_path = public as $$
  select * from support_match_leads
  where is_support_match_admin()
  order by requested_at desc;
$$;

create or replace function sm_update_lead_status(p_request_id uuid, p_status swr_status, p_note text default null)
returns support_match_leads
language plpgsql security definer set search_path = public as $$
declare v_lead support_match_leads;
begin
  if not is_support_match_admin() then raise exception 'Not authorised'; end if;
  perform set_config('app.actor_sm', 'true', true);  -- flag for swr trigger
  update support_worker_requests
     set status = p_status,
         placed_at = case when p_status = 'placed' then now() else placed_at end
   where id = p_request_id;
  select * into v_lead from support_match_leads where request_id = p_request_id;
  return v_lead;
end $$;

-- Internal funnel metrics (org-scoped) for the coordinator/admin dashboards
create or replace function swr_funnel(p_org uuid)
returns table(status swr_status, count bigint)
language sql stable security definer set search_path = public as $$
  select status, count(*) from support_worker_requests
  where org_id = p_org and is_org_member(p_org)
  group by status;
$$;

-- ----------------------------------------------------------------------------
-- 7. Grants (authenticated may execute the RPCs)
-- ----------------------------------------------------------------------------
grant execute on function create_organisation(text,text,text,text,text,text,text) to authenticated;
grant execute on function submit_support_worker_request(uuid,uuid,text) to authenticated;
grant execute on function sm_list_leads() to authenticated;
grant execute on function sm_update_lead_status(uuid,swr_status,text) to authenticated;
grant execute on function swr_funnel(uuid) to authenticated;
