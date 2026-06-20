import type { RagStatus, SwrStatus, TaskStatus, TaskPriority, PlanManagement, TimelineEventType } from "../types/database";

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
  worker_proposed: "Worker proposed",
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
  support_worker_request: "Support worker request",
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
