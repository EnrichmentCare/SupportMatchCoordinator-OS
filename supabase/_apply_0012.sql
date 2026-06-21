-- =============================================================================
-- Coordinator OS — Migration 0012 (optional, cosmetic)
-- Timeline text "Support worker requested" -> "Service provider requested".
-- Only affects new timeline entries; existing rows keep their original text.
-- =============================================================================

create or replace function tl_swr()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor_sm boolean := coalesce(current_setting('app.actor_sm', true) = 'true', false);
begin
  if tg_op = 'INSERT' then
    perform tl_write(new.org_id, new.participant_id, 'support_worker_request',
      'Service provider requested (' || new.reference || ')', new.support_needs_summary,
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
