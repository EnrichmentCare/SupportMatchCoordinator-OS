import type { RagStatus, SwrStatus, TaskStatus, TaskPriority, PlanManagement, TimelineEventType, ContactRelationship, ParticipantStatus, FundingBucket, GoalStatus } from "../types/database";

export const PARTICIPANT_STATUS_LABEL: Record<ParticipantStatus, string> = {
  participant: "Participant",
  active: "Active",
  on_hold: "On hold",
  exited: "Exited",
};

export const FUNDING_BUCKET_LABEL: Record<FundingBucket, string> = {
  core: "Core",
  capacity_building: "Capacity Building",
  capital: "Capital",
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  achieved: "Achieved",
  on_hold: "On hold",
  discontinued: "Discontinued",
};

export const GOAL_STATUS_TONE: Record<GoalStatus, "neutral" | "brand" | "green" | "amber"> = {
  not_started: "neutral",
  in_progress: "brand",
  achieved: "green",
  on_hold: "amber",
  discontinued: "neutral",
};

import type { ReferralStage, ProviderCapacity } from "../types/database";

export const REFERRAL_BOARD: ReferralStage[] = [
  "created", "sent", "acknowledged", "assessment", "accepted", "commenced",
];
export const REFERRAL_STAGE_LABEL: Record<ReferralStage, string> = {
  created: "Created",
  sent: "Sent",
  acknowledged: "Acknowledged",
  assessment: "Assessment",
  accepted: "Accepted",
  commenced: "Commenced",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export const CAPACITY_LABEL: Record<ProviderCapacity, string> = {
  open: "Open", limited: "Limited", closed: "Closed", unknown: "Unknown",
};
export const CAPACITY_TONE: Record<ProviderCapacity, "green" | "amber" | "red" | "neutral"> = {
  open: "green", limited: "amber", closed: "red", unknown: "neutral",
};

export const SERVICE_TYPE_LABEL: Record<string, string> = {
  direct: "Direct service",
  non_face_to_face: "Non-face-to-face",
  travel: "Travel",
  non_labour: "Non-labour",
};

export const CONTACT_TYPE_LABEL: Record<string, string> = {
  phone: "Phone", email: "Email", face_to_face: "Face to face",
  sms: "SMS", internal: "Internal", other: "Other",
};

export function hoursFromMinutes(min?: number | null) {
  if (!min) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h ? h + "h " : ""}${m ? m + "m" : h ? "" : "0m"}`.trim();
}

export function money(n?: number | null) {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

export const CONTACT_REL_LABEL: Record<ContactRelationship, string> = {
  plan_nominee: "Plan nominee",
  correspondence_nominee: "Correspondence nominee",
  nominee: "Nominee",
  guardian: "Guardian / decision-maker",
  family: "Family",
  emergency: "Emergency contact",
  gp: "GP",
  plan_manager: "Plan manager",
  allied_health: "Allied health",
  lac: "LAC",
  support_coordinator: "Support coordinator",
  other: "Other",
};

export const CONTACT_REL_OPTIONS: ContactRelationship[] = [
  "plan_nominee", "correspondence_nominee", "guardian", "family", "emergency",
  "gp", "plan_manager", "allied_health", "lac", "other",
];

/** Days until a date (negative = overdue). null if no date. */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export const RAG_LABEL: Record<RagStatus, string> = {
  green: "On track",
  amber: "Needs attention",
  red: "Urgent",
};
export const RAG_TONE: Record<RagStatus, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red: "red",
};

export const SWR_FLOW: SwrStatus[] = [
  "requested",
  "received",
  "matching",
  "worker_proposed",
  "placed",
  "active",
];

export const SWR_LABEL: Record<SwrStatus, string> = {
  requested: "Requested",
  received: "Received",
  matching: "Matching",
  worker_proposed: "Provider proposed",
  placed: "Placed",
  active: "Active",
  cancelled: "Cancelled",
  closed: "Closed",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_PRIORITY_TONE: Record<TaskPriority, "neutral" | "amber" | "red" | "brand"> = {
  low: "neutral",
  medium: "brand",
  high: "amber",
  urgent: "red",
};

export const PLAN_MGMT_LABEL: Record<PlanManagement, string> = {
  agency_managed: "Agency managed",
  plan_managed: "Plan managed",
  self_managed: "Self managed",
};

export const TIMELINE_LABEL: Record<TimelineEventType, string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  sms: "SMS",
  referral: "Referral",
  document: "Document",
  meeting: "Meeting",
  task: "Task",
  support_worker_request: "Service provider request",
  goal: "Goal",
  funding: "Funding",
  consent: "Consent",
  status_change: "Status change",
  system: "System",
};

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
