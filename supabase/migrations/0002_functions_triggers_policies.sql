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
