-- =============================================================================
-- Coordinator OS — Migration 0006
-- Non-AI automation engine: event-driven rules implemented as triggers,
-- each gated by an on/off toggle in the automations table (default ON).
-- =============================================================================

-- Is an automation enabled for this org? Defaults to true if no row exists.
create or replace function automation_enabled(p_org uuid, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_active from automations where org_id = p_org and name = p_key order by created_at limit 1),
    true);
$$;

-- ---- Referrals: accepted -> task; commenced -> add provider + task ----------
create or replace function au_referral()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    if new.stage = 'accepted' and automation_enabled(new.org_id, 'referral_accepted_create_task') then
      insert into tasks (org_id, participant_id, referral_id, title, priority, due_date, status, created_by)
      values (new.org_id, new.participant_id, new.id, 'Set up service agreement & start date', 'high', current_date + 7, 'open', new.created_by);
    end if;

    if new.stage = 'commenced' then
      if new.provider_id is not null and automation_enabled(new.org_id, 'referral_commenced_add_provider') then
        insert into participant_providers (org_id, participant_id, provider_name, service_type, status, created_by)
        select new.org_id, new.participant_id, pr.name, new.service_type, 'active', new.created_by
        from providers pr
        where pr.id = new.provider_id
          and not exists (
            select 1 from participant_providers pp
            where pp.participant_id = new.participant_id and pp.provider_name = pr.name);
      end if;
      if automation_enabled(new.org_id, 'referral_commenced_create_task') then
        insert into tasks (org_id, participant_id, referral_id, title, priority, due_date, status, created_by)
        values (new.org_id, new.participant_id, new.id, 'Confirm first shift & monitor commencement', 'medium', current_date + 3, 'open', new.created_by);
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger trg_au_referral after update on referrals for each row execute function au_referral();

-- ---- Support Worker Request: placed -> onboarding task ----------------------
create or replace function au_swr()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status = 'placed' and old.status is distinct from new.status
     and automation_enabled(new.org_id, 'swr_placed_create_task') then
    insert into tasks (org_id, participant_id, title, priority, due_date, status, created_by)
    values (new.org_id, new.participant_id, 'Onboard placed support worker', 'high', current_date + 5, 'open', new.created_by);
  end if;
  return new;
end $$;
create trigger trg_au_swr after update on support_worker_requests for each row execute function au_swr();

-- ---- Participant flagged red -> urgent follow-up task -----------------------
create or replace function au_participant_red()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.rag_status = 'red' and old.rag_status is distinct from new.rag_status
     and automation_enabled(new.org_id, 'participant_red_create_task') then
    insert into tasks (org_id, participant_id, title, priority, due_date, status, assigned_to, created_by)
    values (new.org_id, new.id, 'Follow up — participant flagged urgent', 'urgent', current_date + 1, 'open',
            new.assigned_coordinator, new.assigned_coordinator);
  end if;
  return new;
end $$;
create trigger trg_au_participant_red after update on participants for each row execute function au_participant_red();
