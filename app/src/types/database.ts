// Hand-written domain types for Phase 0/1.
// Regenerate the full set after migrations with:
//   supabase gen types typescript --project-id wkviryslxklnomrphxix > src/types/database.ts

export type OrgRole =
  | "admin"
  | "team_leader"
  | "specialist_support_coordinator"
  | "support_coordinator"
  | "participant"
  | "nominee"
  | "provider"
  | "support_worker";

export type RagStatus = "green" | "amber" | "red";
export type ParticipantStatus = "participant" | "active" | "on_hold" | "exited";
export type FundingBucket = "core" | "capacity_building" | "capital";
export type GoalStatus = "not_started" | "in_progress" | "achieved" | "on_hold" | "discontinued";
export type PlanManagement = "agency_managed" | "plan_managed" | "self_managed";
export type GenderPref = "male" | "female" | "no_preference" | "other";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type SwrStatus =
  | "requested"
  | "received"
  | "matching"
  | "worker_proposed"
  | "placed"
  | "active"
  | "cancelled"
  | "closed";

export type TimelineEventType =
  | "note"
  | "call"
  | "email"
  | "sms"
  | "referral"
  | "document"
  | "meeting"
  | "task"
  | "support_worker_request"
  | "goal"
  | "funding"
  | "consent"
  | "status_change"
  | "system";

export interface Organisation {
  id: string;
  name: string;
  abn: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_support_match_admin: boolean;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
}

export interface Participant {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  ndis_number: string | null;
  plan_management: PlanManagement | null;
  status: ParticipantStatus;
  rag_status: RagStatus;
  rag_reason: string | null;
  address_line: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  gender_preference: GenderPref | null;
  interests: string[] | null;
  languages: string[] | null;
  cultural_background: string | null;
  support_needs_summary: string | null;
  hours_per_week: number | null;
  risk_flags: string[] | null;
  risk_notes: string | null;
  // Disability & health (0004)
  pronouns: string | null;
  primary_disability: string | null;
  secondary_disabilities: string[] | null;
  communication_needs: string | null;
  mobility_needs: string | null;
  dietary_needs: string | null;
  allergies: string | null;
  medications_note: string | null;
  mental_health_notes: string | null;
  interpreter_required: boolean | null;
  interpreter_language: string | null;
  // Risk & safeguarding + check-in (0005)
  behaviour_support_plan: boolean | null;
  restrictive_practices: string | null;
  crisis_plan: string | null;
  last_contact_at: string | null;
  check_in_frequency_days: number | null;
  assigned_coordinator: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundingCategory {
  id: string;
  org_id: string;
  plan_id: string;
  participant_id: string;
  bucket: FundingBucket;
  name: string;
  allocated: number;
  used: number;
  remaining: number;
  alert_threshold: number | null;
}

export interface Goal {
  id: string;
  org_id: string;
  participant_id: string;
  plan_id: string | null;
  title: string;
  description: string | null;
  status: GoalStatus;
  progress_pct: number;
  target_date: string | null;
  evidence: string | null;
}

export interface ParticipantIncident {
  id: string;
  org_id: string;
  participant_id: string;
  occurred_at: string;
  severity: string | null;
  category: string | null;
  summary: string;
  reportable: boolean;
  actions: string | null;
  status: string;
  notified_at: string | null;
  follow_up_submitted_at: string | null;
}

export interface Plan {
  id: string;
  org_id: string;
  participant_id: string;
  plan_number: string | null;
  management_type: PlanManagement;
  start_date: string | null;
  end_date: string | null;
  reassessment_due: string | null;
  total_budget: number | null;
  support_coordination_hours: number | null;
  notes: string | null;
  is_current: boolean;
}

export type ContactRelationship =
  | "plan_nominee"
  | "correspondence_nominee"
  | "nominee"
  | "guardian"
  | "family"
  | "emergency"
  | "gp"
  | "plan_manager"
  | "allied_health"
  | "lac"
  | "support_coordinator"
  | "other";

export interface ParticipantContact {
  id: string;
  org_id: string;
  participant_id: string;
  name: string;
  relationship: ContactRelationship;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
}

export interface ParticipantProvider {
  id: string;
  org_id: string;
  participant_id: string;
  provider_name: string;
  service_type: string | null;
  status: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_plan_manager: boolean;
  notes: string | null;
}

export type ParticipantInput = Omit<
  Participant,
  "id" | "org_id" | "created_at" | "updated_at" | "assigned_coordinator"
>;

export type ContactType = "phone" | "email" | "face_to_face" | "sms" | "internal" | "other";

export interface Note {
  id: string;
  org_id: string;
  participant_id: string | null;
  body: string;
  is_pinned: boolean;
  contact_type: ContactType | null;
  minutes: number | null;
  billable: boolean | null;
  goal_id: string | null;
  occurred_at: string | null;
  claimed_at: string | null;
  claim_reference: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ParticipantCOI {
  id: string;
  org_id: string;
  participant_id: string;
  nature: string;
  related_party: string | null;
  disclosed: boolean;
  disclosed_at: string | null;
  disclosure_method: string | null;
  options_offered: string | null;
  participant_choice: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  participant_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  org_id: string;
  participant_id: string;
  event_type: TimelineEventType;
  title: string;
  body: string | null;
  ref_table: string | null;
  ref_id: string | null;
  occurred_at: string;
}

export interface Consent {
  id: string;
  org_id: string;
  participant_id: string;
  type: string;
  status: string;
  granted_by: string | null;
  method: string | null;
  granted_at: string;
}

export interface SupportWorkerRequest {
  id: string;
  org_id: string;
  participant_id: string;
  consent_id: string;
  status: SwrStatus;
  reference: string;
  suburb: string | null;
  postcode: string | null;
  state: string | null;
  gender_preference: GenderPref | null;
  interests: string[] | null;
  languages: string[] | null;
  support_needs_summary: string | null;
  hours_per_week: number | null;
  funding_type: PlanManagement | null;
  internal_notes: string | null;
  requested_at: string;
  placed_at: string | null;
}

export interface DocumentRow {
  id: string;
  org_id: string;
  participant_id: string | null;
  type: string;
  title: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  version: number;
  created_at: string;
}

export type ProviderCapacity = "open" | "limited" | "closed" | "unknown";
export type ReferralStage =
  | "created" | "sent" | "acknowledged" | "assessment" | "accepted" | "commenced" | "declined" | "withdrawn";

export interface Provider {
  id: string;
  org_id: string;
  name: string;
  abn: string | null;
  description: string | null;
  services: string[] | null;
  service_areas: string[] | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  ndis_registered: boolean | null;
  capacity_status: ProviderCapacity;
  capacity_notes: string | null;
  created_at: string;
}

export interface ProviderContact {
  id: string;
  org_id: string;
  provider_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface SavedProvider {
  id: string;
  org_id: string;
  provider_id: string;
  user_id: string | null;
  notes: string | null;
}

export interface ProviderEngagement {
  id: string;
  org_id: string;
  provider_id: string;
  engagement_type: string | null;
  response_time_hours: number | null;
  summary: string | null;
  occurred_at: string;
}

export interface Referral {
  id: string;
  org_id: string;
  participant_id: string;
  provider_id: string | null;
  service_type: string | null;
  stage: ReferralStage;
  notes: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface Automation {
  id: string;
  org_id: string;
  name: string;
  is_active: boolean;
}

export interface Feedback {
  id: string;
  org_id: string;
  participant_id: string | null;
  type: string;
  source: string | null;
  summary: string;
  severity: string | null;
  status: string;
  resolution: string | null;
  received_at: string;
  resolved_at: string | null;
}

export interface ServiceAgreement {
  id: string;
  org_id: string;
  participant_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  supports: string | null;
  terms: string | null;
  parties: string | null;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  org_id: string;
  participant_id: string | null;
  title: string;
  scheduled_at: string | null;
  location: string | null;
  attendees: string[] | null;
  notes: string | null;
  outcomes: string | null;
  actions: string | null;
  created_at: string;
}

export interface SupportMatchLead {
  request_id: string;
  reference: string;
  org_id: string;
  status: SwrStatus;
  suburb: string | null;
  postcode: string | null;
  state: string | null;
  gender_preference: string | null;
  interests: string[] | null;
  languages: string[] | null;
  support_needs_summary: string | null;
  hours_per_week: number | null;
  funding_type: string | null;
  requested_at: string;
  placed_at: string | null;
}
