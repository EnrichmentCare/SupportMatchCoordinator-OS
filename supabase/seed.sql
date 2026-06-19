-- =============================================================================
-- Coordinator OS — Demo seed (FICTIONAL data only)
-- Run AFTER migrations 0001 + 0002, AFTER you've signed up in the app.
--
-- Usage in Supabase SQL Editor:
--   1. Find your user id:   select id, email from auth.users;
--   2. Make yourself a Support Match admin (to view the /admin lead console):
--        update profiles set is_support_match_admin = true where id = '<your-uuid>';
--   3. Seed a demo org you're a member of:
--        select seed_demo('<your-uuid>');
--   (Re-running seed_demo creates another fresh demo org; safe to repeat.)
-- =============================================================================

create or replace function seed_demo(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  c1 uuid; c2 uuid;
begin
  insert into organisations (name, state, suburb, postcode, phone, email, created_by)
  values ('Riverbend Support Coordination','NSW','Newtown','2042','1300 000 111','hello@riverbendsc.example', p_user)
  returning id into v_org;

  insert into memberships (org_id, user_id, role, created_by)
  values (v_org, p_user, 'admin', p_user)
  on conflict (org_id, user_id) do nothing;

  -- Participants (varied RAG)
  insert into participants (org_id, first_name, last_name, preferred_name, status, rag_status, rag_reason,
    suburb, state, postcode, plan_management, gender_preference, interests, languages,
    support_needs_summary, hours_per_week, assigned_coordinator, created_by)
  values
    (v_org,'Mia','Whitfield','Mia','active','green',null,'Marrickville','NSW','2204','plan_managed',
      'female','{cooking,gardening,music}','{English}','Daily living support and community access, 2 days/week.',12, p_user, p_user)
  returning id into p1;

  insert into participants (org_id, first_name, last_name, status, rag_status, rag_reason,
    suburb, state, postcode, plan_management, gender_preference, interests, languages,
    support_needs_summary, hours_per_week, assigned_coordinator, created_by)
  values
    (v_org,'Daniel','Osei','active','amber','Plan reassessment due in 3 weeks','Ashfield','NSW','2131','self_managed',
      'male','{football,gaming}','{English}','Social mentoring for a young adult; prefers a male worker into sport.',8, p_user, p_user)
  returning id into p2;

  insert into participants (org_id, first_name, last_name, status, rag_status, rag_reason,
    suburb, state, postcode, plan_management, gender_preference, interests, languages,
    support_needs_summary, hours_per_week, assigned_coordinator, created_by)
  values
    (v_org,'Aroha','Ngata','active','red','No active worker — urgent placement needed','Petersham','NSW','2049','plan_managed',
      'no_preference','{art,outdoors}','{English,Maori}','Personal care + community access. Previous worker ended; needs cover.',15, p_user, p_user)
  returning id into p3;

  insert into participants (org_id, first_name, last_name, status, rag_status,
    suburb, state, postcode, plan_management, gender_preference, interests, languages,
    support_needs_summary, hours_per_week, assigned_coordinator, created_by)
  values
    (v_org,'Tomas','Varga','prospect','green','Erskineville','NSW','2043','plan_managed',
      'no_preference','{cooking,languages}','{English,Hungarian}','New referral; intake meeting being scheduled.',6, p_user, p_user)
  returning id into p4;

  -- Consents to share with Support Match
  insert into consents (org_id, participant_id, type, status, granted_by, method, created_by)
  values (v_org, p3, 'share_with_support_match','granted','Aroha Ngata','verbal', p_user) returning id into c1;
  insert into consents (org_id, participant_id, type, status, granted_by, method, created_by)
  values (v_org, p2, 'share_with_support_match','granted','Daniel Osei','written', p_user) returning id into c2;

  -- Support Worker Requests (curated snapshots) -> these surface as Support Match leads
  insert into support_worker_requests (org_id, participant_id, consent_id, status,
    suburb, postcode, state, gender_preference, interests, languages, support_needs_summary,
    hours_per_week, funding_type, internal_notes, created_by)
  select v_org, p3, c1, 'requested', p.suburb, p.postcode, p.state, p.gender_preference,
    p.interests, p.languages, p.support_needs_summary, p.hours_per_week, p.plan_management,
    'Urgent — previous worker ended last week.', p_user
  from participants p where p.id = p3;

  insert into support_worker_requests (org_id, participant_id, consent_id, status,
    suburb, postcode, state, gender_preference, interests, languages, support_needs_summary,
    hours_per_week, funding_type, internal_notes, created_by)
  select v_org, p2, c2, 'matching', p.suburb, p.postcode, p.state, p.gender_preference,
    p.interests, p.languages, p.support_needs_summary, p.hours_per_week, p.plan_management,
    'Shortlisting male mentors who play football.', p_user
  from participants p where p.id = p2;

  -- A couple of tasks + a note for timeline depth
  insert into tasks (org_id, title, status, priority, due_date, participant_id, assigned_to, created_by)
  values (v_org,'Book intake meeting','open','high', current_date + 2, p4, p_user, p_user),
         (v_org,'Chase plan reassessment paperwork','in_progress','medium', current_date + 10, p2, p_user, p_user);

  insert into notes (org_id, participant_id, body, created_by)
  values (v_org, p1, 'Mia loved her new worker — great fit on gardening. Continue current schedule.', p_user);

  return v_org;
end $$;

grant execute on function seed_demo(uuid) to authenticated;
