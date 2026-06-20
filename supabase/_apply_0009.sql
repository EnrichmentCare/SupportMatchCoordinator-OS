-- =============================================================================
-- Coordinator OS — Migration 0009
-- Let org admins add an existing user to their organisation by email.
-- (A full email-invite flow comes with the Resend Edge Function later.)
-- =============================================================================

create or replace function add_member_by_email(p_org uuid, p_email text, p_role org_role)
returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not has_org_role(p_org, array['admin']::org_role[]) then
    raise exception 'Only admins can add members';
  end if;

  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'No account found for %. Ask them to sign up first, then add them.', p_email;
  end if;

  insert into memberships (org_id, user_id, role, created_by)
  values (p_org, v_uid, p_role, auth.uid())
  on conflict (org_id, user_id) do update set role = excluded.role, is_active = true;

  return 'ok';
end $$;

grant execute on function add_member_by_email(uuid, text, org_role) to authenticated;
