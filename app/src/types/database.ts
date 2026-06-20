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
export type ParticipantStatus = "prospect" | "active" | "on_hold" | "exited";
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
  assigned_coordinator: string | null;
  created_at: string;
  updated_at: string;
}

export type ParticipantInput = Omit<
  Participant,
  "id" | "org_id" | "created_at" | "updated_at" | "assigned_coordinator"
>;

export interface Note {
  id: string;
  org_id: string;
  participant_id: string | null;
  body: string;
  is_pinned: boolean;
  created_at: string;
  created_by: string | null;
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
